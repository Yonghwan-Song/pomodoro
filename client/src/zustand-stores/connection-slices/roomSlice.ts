import type { StateCreator } from 'zustand';
import type { Socket } from 'socket.io-client';
import * as EventNames from '../../common/webrtc/eventNames';
import { auth } from '../../firebase';
import { boundedPomoInfoStore } from '../pomoInfoStoreUsingSlice';
import type {
  ConnectionStore,
  RoomSlice,
  ConsumerLayerState,
  Participant,
} from './types';
import type {
  AckResponse,
  ConsumerLayersChangedPayload,
  JOIN_ROOM_DATA,
  TodayTotalFocusOfPeer,
  ProducerPayload,
  DataToSyncForPeerReconnected,
  NEW_PEER_JOINED_DATA,
  ParticipantBasicData,
} from '../../common/webrtc/payloadRelated';
import { ChatMessageInfo } from '../../common/webrtc/payloadRelated';
import { enableMapSet } from 'immer';
import { getNickname } from './utils';

enableMapSet();

export const createRoomSlice: StateCreator<
  ConnectionStore,
  [['zustand/devtools', never], ['zustand/immer', never]],
  [],
  RoomSlice
> = (set, get) => {
  /** NOTE: Events to listen as a participant
   * 1)ROOM_GET_PRODUCER, 2)ROOM_PEER_JOINED, 3)PEER_TODAY_TOTAL_DURATION_UPDATED,
   * 4)PRODUCER_CLOSED, 5)ROOM_PEER_LEFT, 6)CHAT_MESSAGE, 7)CONSUMER_LAYERS_CHANGED,
   *  -> 뭔가... Room에서 이 참가자가 할 수있는 행동들과 연관되어 있는듯.
   * 왜냐하면,.... ping pong이라.. pong을 그 ping할 당시에 등록하는것은 좀....거시기 하니까 미리 등록해놓는것이고.. 그러다보면,
   * 위치가 분리되니까?... 그게 좀 복잡해보이는 이유이지...:::...
   */
  const addEventListeners = (socket: Socket) => {
    // 새로운 사람이 produce를 시작했을 때, 그것을 peerProducerList에 반영하기 위해. 이것은 여기에 잘 어울리는 듯. 소비하기 위한 준비를 해두는 것이니까, 방에 입장하자마자 작업되야하는 것이 맞다고 생각.
    socket.on(
      EventNames.ROOM_GET_PRODUCER,
      // 1) Update nicknames if needed, and store the new producers. 2) attempts to consume the producers (for now, users are not given the options to decide whether to consume it or not)
      (producersFromServer: ProducerPayload[]) => {
        // 1)
        set(
          (state) => {
            const updatedNicknames = new Map(state.peerNicknames);
            const updatedParticipants = new Map(state.participants);

            producersFromServer.forEach(({ peerId, displayName }) => {
              if (displayName === undefined) return;

              updatedNicknames.set(peerId, displayName);

              const existing = updatedParticipants.get(peerId);
              if (existing) {
                updatedParticipants.set(peerId, {
                  ...existing,
                  nickName: displayName,
                });
              } else {
                updatedParticipants.set(peerId, {
                  peerId,
                  nickName: displayName,
                  todayTotalDuration: 0,
                  picture: '',
                  stream: null,
                });
              }
            });

            return {
              peerNicknames: updatedNicknames,
              participants: updatedParticipants,
              peerProducerList: [
                ...state.peerProducerList,
                // Just store it with isBeingConsumed false for now. We will later decide/handle whether or not to consume it.
                ...producersFromServer.map((p) => ({
                  ...p,
                  isBeingConsumed: false,
                })),
              ],
            };
          },
          false,
          'room/newProducers',
        );

        // 2)
        get().consumePendingProducers(); // <----- 이 안에 INTENT_TO_CONSUME이 emit되고,
      },
    );

    // TODO: 아래의 socket event listen 호출 타이밍이 방에 입장하자 마자라기보다는 관련 event가 발생하는 코드 위치와 비슷하게 놓는게 좋지 않을까?... 따지고보면 join room할때 다 때려박으면 어차피 방 안에서 일어나는 것이기 때문에 문제 없지만, 그래도 시간 구조적으로 뭔가... 뭉뚱그려져 잇구 organized되지 않은 느낌.
    //
    // JOIN_ROOM에 대한 socket.io broadcast event
    socket.on(
      EventNames.ROOM_PEER_JOINED,
      ({
        peerId,
        todayTotalDuration,
        nickName,
        picture,
      }: NEW_PEER_JOINED_DATA) => {
        set(
          (state) => {
            const updated = new Map(state.peerTodayTotalDurations);
            const participantsToUpdate = new Map(state.participants);
            const existing = participantsToUpdate.get(peerId);
            if (existing) {
              participantsToUpdate.set(peerId, {
                ...existing,
                todayTotalDuration: todayTotalDuration,
                nickName,
                picture,
              });
            } else {
              participantsToUpdate.set(peerId, {
                peerId,
                nickName,
                todayTotalDuration,
                picture,
                stream: null,
              });
            }
            updated.set(peerId, todayTotalDuration);
            return {
              peerTodayTotalDurations: updated,
              participants: participantsToUpdate,
            };
          },
          false,
          'room/peerJoined',
        );
      },
    );

    socket.on(EventNames.PRODUCER_CLOSED, ({ producerId }) => {
      console.log('producerId inside PRODUCER_CLOSED', producerId);
      const {
        peerProducerList,
        consumersByPeerId,
        remoteStreams, // TODO: 이거 왜 이딴식으로 다시 받아와서 .... 다시 전부다 재 할당하냐고.. 그냥 observer event쓰면 되는건데...
        consumerLayers,
        participants,
      } = get();
      const producerInfo = peerProducerList.find(
        (p) => p.producerId === producerId,
      );
      if (!producerInfo) return;

      // Could we get a stream of a participant though we are not consuming it?
      // i.e), producerInfo.isBeingConsumed === false && "the participant has a value for its stream propertiy" -> impossible in our app. It's because
      // The only place where we assign a value for a participant's stream field is inside the ack callback of "INTENT_TO_CONSUME".
      if (producerInfo.isBeingConsumed) {
        const consumer = consumersByPeerId.get(producerInfo.peerId);
        if (consumer) {
          consumer.close();
          const newConsumers = new Map(consumersByPeerId);
          newConsumers.delete(producerInfo.peerId);
          const newStreams = new Map(remoteStreams); // streams seemingly are supposed to be changed like consumersByPeerId.
          newStreams.delete(producerInfo.peerId);
          const newLayers = new Map(consumerLayers);
          newLayers.delete(consumer.id);
          const participantsToUpdate = new Map(participants);
          const existing = participantsToUpdate.get(producerInfo.peerId);
          if (existing) {
            participantsToUpdate.set(producerInfo.peerId, {
              ...existing,
              stream: null,
            });
          }
          set({
            consumersByPeerId: newConsumers,
            remoteStreams: newStreams,
            consumerLayers: newLayers,
            participants: participantsToUpdate,
          });
        }
      }

      set({
        peerProducerList: peerProducerList.filter(
          (p) => p.producerId !== producerId,
        ),
      });
    });

    socket.on(
      EventNames.PEER_TODAY_TOTAL_DURATION_UPDATED,
      (payload: { peerId: string; todayTotalDuration: number }) => {
        set(
          ({ peerTodayTotalDurations, participants }) => {
            const peerTodayTotalDurationsToUpdate = new Map(
              peerTodayTotalDurations,
            );
            peerTodayTotalDurationsToUpdate.set(
              payload.peerId,
              payload.todayTotalDuration,
            );

            const participantsToUpdate = new Map(participants);

            const existing = participantsToUpdate.get(payload.peerId);
            if (existing) {
              participantsToUpdate.set(payload.peerId, {
                ...existing,
                todayTotalDuration: payload.todayTotalDuration,
              });
            }

            return {
              peerTodayTotalDurations: peerTodayTotalDurationsToUpdate,
              participants: participantsToUpdate,
            };
          },
          false,
          'room/updatePeerDuration',
        );
      },
    );

    // DECISION: Reconnected user gets chat messages he have missed due to disconnection.
    // But, the other participants will not get chat messages this user wrote while he was disconnected,
    // because the messages were made without the context of the chat history generated while he was disconnected.
    // He just gests the context he missed back to participate again and continue the chat session with others.
    socket.on(
      EventNames.SYNC_DATA_TO_PEER_RECONNECTED,
      ({
        peersTodayTotalFocusArray,
        chatMessages,
      }: DataToSyncForPeerReconnected) => {
        const peersTodayTotalFocusArrayToSync = peersTodayTotalFocusArray;
        const chatMessagesToSync = chatMessages;

        set(
          (state) => {
            const updated = new Map(state.peerTodayTotalDurations);
            const participantsToUpdate = new Map(state.participants);
            peersTodayTotalFocusArrayToSync.forEach(
              ({ peerId, todayTotalDuration }: TodayTotalFocusOfPeer) => {
                updated.set(peerId, todayTotalDuration);
                const existing = participantsToUpdate.get(peerId);
                if (existing) {
                  participantsToUpdate.set(peerId, {
                    ...existing,
                    todayTotalDuration,
                  });
                }
              },
            );

            // DECISION: disconnected되었던 user가 채팅을 두번정도 쳤다고 하고, 그 사이에 participant가 채팅을 쳤다고 가정하면,
            // 이것들의 순서가 다시 보장되어야함.
            const inOrder = [...state.chatMessages, ...chatMessagesToSync].sort(
              (a: ChatMessageInfo, b: ChatMessageInfo) => {
                const aTime = Date.parse(a.timestamp);
                const bTime = Date.parse(b.timestamp);
                return aTime - bTime;
              },
            );

            return {
              peerTodayTotalDurations: updated,
              chatMessages: inOrder,
              participants: participantsToUpdate,
            };
          },
          false,
          'room/syncDataToPeerReconnected',
        );
      },
    );

    socket.on(EventNames.ROOM_PEER_LEFT, ({ peerId }) => {
      set((state) => {
        const d = new Map(state.peerTodayTotalDurations);
        d.delete(peerId);
        const n = new Map(state.peerNicknames);
        n.delete(peerId);
        const participantsToUpdate = new Map(state.participants);

        const result = participantsToUpdate.delete(peerId);
        if (result) {
          console.log(`participant with peerId [${peerId}] is deleted.`);
        } else {
          console.log(`participant with peerId [${peerId}] does not exist.`);
        }
        return {
          peerTodayTotalDurations: d,
          peerNicknames: n,
          participants: participantsToUpdate,
        };
      });
    });

    // Receive chat messages through socket
    socket.on(EventNames.CHAT_MESSAGE, (payload: ChatMessageInfo) => {
      set((state) => ({ chatMessages: [...state.chatMessages, payload] }));
      // DESIGN: 여기에서 안해도 되는데?... 이거는 정상상황이고, 애초에 updateChat이런거를 만들어서 항상 order를 신경쓰게 해야지....
      // 네가 말한게 그런거 아니였어? 만약 우리가 지금 문제삼고있는 edge case에서만 그게 필요하면
      // TODO: event를 따로 하나 만들어서 listeners 안에다가, 순서 보장하는 코드를 작성해야하는거 아니야?
    });

    socket.on(
      EventNames.CONSUMER_LAYERS_CHANGED,
      (payload: ConsumerLayersChangedPayload) => {
        set((state) => {
          const layers = new Map(state.consumerLayers);
          const existing =
            layers.get(payload.consumerId) || ({} as ConsumerLayerState);
          layers.set(payload.consumerId, {
            ...existing,
            currentSpatialLayer: payload.layers?.spatialLayer,
          });
          return { consumerLayers: layers };
        });
      },
    );
  };

  const removeEventListeners = (socket: Socket) => {
    socket.off(EventNames.ROOM_GET_PRODUCER);
    socket.off(EventNames.ROOM_PEER_JOINED);
    socket.off(EventNames.PRODUCER_CLOSED);
    socket.off(EventNames.PEER_TODAY_TOTAL_DURATION_UPDATED);
    socket.off(EventNames.SYNC_DATA_TO_PEER_RECONNECTED);
    socket.off(EventNames.ROOM_PEER_LEFT);
    socket.off(EventNames.CHAT_MESSAGE);
    socket.off(EventNames.CONSUMER_LAYERS_CHANGED);
    // inside createTransports()
    // socket.off(EventNames.SEND_TRANSPORT_CREATED);
    // socket.off(EventNames.RECV_TRANSPORT_CREATED);
  };

  return {
    currentRoomId: null,
    isUserInRoom: false,
    forcedRoomExitReason: null,
    peerProducerList: [],
    participants: new Map(),
    remoteStreams: new Map(),
    peerNicknames: new Map(),
    peerTodayTotalDurations: new Map(),
    chatMessages: [], // !!!!!!!!!!
    initializeRoomSliceStates: () => {
      set(
        {
          currentRoomId: null,
          isUserInRoom: false,
          forcedRoomExitReason: null,
          peerProducerList: [],
          remoteStreams: new Map(),
          peerNicknames: new Map(),
          participants: new Map(),
          peerTodayTotalDurations: new Map(),
          chatMessages: [],
        },
        false,
        'room/resetToInitialValues',
      );
    },
    /** NOTE:
     *  Join Room의 의미: 그냥 간단히 말해서,
     *    1. 방에 들어가면 방에 참가한 사람들을 보고 들을 수 있고,
     *    2. 나도 방에 있는 사람들에게 보이고 들릴 수 있음 (<==> 방에 있는 사람들에게 나를 노출시킬 수 있음).
     *       사람이 정말 실제로 방으로 들어가면 그렇게 됨. 이것이 mediasoup관점에서 (webRTC관점에서) 무엇을 의미하는지/무엇과 관련 있는지를 생각해보면,
     *    1. 무엇을 보고 들을지 -> existingProducers 2. 이것은 다른 slice에서
     *       어디에서 호출되는지? -> Room: 입장한 후  RoomList: 만들면서, 동시에 입장. 그러므로 GroupStudy에서 호출되는 initDevice보다 늦다.
     *
     * @param roomId
     * @param onError
     * @returns
     */
    // TODO: 뭔가 이 함수를 봤을때, 뭐하는건지 감이 안잡힘... 우선 안쪽에서 진행되는 흐름이 server와의 socket message ping pong에 의존하기 때문에,
    // 함수 단위로 깔끔하게 끊어지지가 않음. --> 말로 정리를 해주고 자세히 적어주기
    // 1. 하는 일들 목록 만들기 2. 목록에 대한 상세 설명 적어주고 region으로 감싸기
    // NOTE: WHAT IT DOES
    // 1. JOIN_ROOM_DATA를 가져온다. -> 1)room id, 2)방에 참가한 peer들이 공유하고 있는 producer에 관한 정보(ProducerPayload type)(e.g., producer id)
    //    , and 3)peer들의 그날 집중시간.
    // 2. 위의 데이터를 이용해 당_장 필요한 작업들을 한다 (by Ack Callback).
    // 3. send and recv transport 생성한다 (inside the same Ack Callback above) (by createTransports()).
    // 4. 필요한 socket event listeners를 등록
    joinRoom: (roomId, onError) => {
      /**
       * NOTE: 여기에서의 guard들중 일부와 Room.tsx의 setup함수에서의 guard들중 일부가 겹치긴 하는데,
       * 그냥 cheap이라 괜찮다며..
       */
      const { socket, isUserInRoom } = get();
      if (!socket || !socket.connected || isUserInRoom) return;

      const todayTotalDuration =
        boundedPomoInfoStore.getState().todayTotalDuration;

      /** NOTE: JOIN_ROOM에 의해 만들어지는 흐름과 데이터들.
       *    서버에서의 room join을 촉발 (그게 무슨 의미인지는 가서 찾아보고), 그리고 join이 되면 그 결과를 JOIN_ROOM_DATA로 알려주는 것임. 이쪽에서도 동기화 하라고.
       *    그러면 실제로 무슨 일을 하는지 서버에서 ->
       */
      socket.emit(
        EventNames.JOIN_ROOM,
        { roomId, todayTotalDuration },
        (response: AckResponse<JOIN_ROOM_DATA>) => {
          if (response.success && response.data) {
            const {
              selfPeerId,
              existingProducers, // nicknames here are the ones of those who have been already sharing their media.
              participantBasicDataArray, // 여기에서 duration
            } = response.data;
            console.log('selfPeerId', selfPeerId);
            const nicknames = new Map<string, string>();
            const durations = new Map<string, number>();
            const participantMap = new Map<string, Participant>();

            //#region For producerList
            const peerProducerList = existingProducers.map(
              (p: ProducerPayload) => {
                const retVal = {
                  ...p,
                  isBeingConsumed: false,
                };
                return retVal;
              },
            );
            // peerProducerList.forEach((p) => {
            //   console.log("peerId", p.peerId);
            //   console.log("producerId", p.producerId);
            //   console.log("kind", p.kind);
            //   console.log("isBeingConsumed", p.isBeingConsumed);
            // });
            //#endregion

            participantBasicDataArray.forEach(
              ({
                peerId,
                nickName,
                picture,
                todayTotalDuration,
              }: ParticipantBasicData) => {
                durations.set(peerId, todayTotalDuration);
                nicknames.set(peerId, nickName);
                participantMap.set(peerId, {
                  peerId,
                  nickName,
                  picture,
                  todayTotalDuration,
                  stream: null,
                });
              },
            );

            set(
              () => {
                return {
                  isUserInRoom: true,
                  currentRoomId: roomId,
                  peerProducerList,
                  participants: participantMap,
                  // The two values below are kept temporarily since we are not finished at introducing participants yet.
                  peerNicknames: nicknames, // WARNING: 사실 지금은 과도기라 그렇지만, 지금 join room 시점에서는 producer에서 혹시 모를 nickname의 update를 반영하기 위해 producerList에서 찾아서 할당 안해줘도 된다. 이제는 participantBasicDataArray에 처음부터 다 포함되어 오니까.
                  peerTodayTotalDurations: durations,
                };
              },
              false,
              'room/joined',
            );
          } else {
            onError?.(response.error || 'Unknown error');
          }
        },
      );

      //4. Listens events
      addEventListeners(socket);
    },

    leaveRoom: (socketEmitFlag = true) => {
      const {
        socket,
        isUserInRoom,
        sendTransport,
        recvTransport,
        producer,
        consumersByPeerId,
        initializeMediaStreamSliceStates,
      } = get();
      if (!socket || !isUserInRoom) return; //

      if (producer) {
        producer.close();
        // WARNING:  방에서 방출될때, ping timeout 이후 prolonged disconnect 때문에 서버쪽에서 cleanup되면,
        // producer not found. <-- 그런데 이것때문에 갑자기 뭐...
        socketEmitFlag &&
          socket.emit(EventNames.PRODUCER_CLOSED, { producerId: producer.id });
      }
      consumersByPeerId.forEach((c) => c.close());

      // DESIGN: (from doc) This method should be called when the server side transport has been closed (and vice-versa).
      // Server의 peer.close()에 의해 해결됨.
      sendTransport?.close();
      recvTransport?.close();

      // WHAT_IF: 만약에 socket이 연결이 안되었는데, 그러니까 인터넷 맛이 가서 방에 있다가 모르겠다 그냥 나가자 하고 leaveRoom버튼 누르면,
      // socket연결 안되었는데 저거 emit하면 전달 안되고 나중에 재연결 되면 자동으로 전달될텐데... (그 volatile설정 안해서)... 그러면 시나리오가 어떻게 되는거야?
      // server의 groupStudyManagementService의 leaveRoom에 의해 { success: false, error: 'Peer is not in any room' } is returned -> AckResponse로 전달된다. 그런데 네가 안받고 있잖아.
      // TODO: AckResponse 받아보고 위의 edge case 관찰해보기.
      // TODO: socketEmitFlag가 아니라 isUserBeingRemovedAbnormally (e.g, prolonged tcp disconnect) 로 바꾸면 될듯.
      if (socket.connected && socketEmitFlag) {
        // socketEmitFlag -> peerStatus cross check했을때, 서버쪽은 방에서 나가졌거나 아예 peerMap에서 삭제했지만, 여기에서는 Room에 있는 경우 leaveRoom함수를 재활용하기 위해서.
        console.log('LEAVE_ROOM is sent');
        socket.emit(
          EventNames.LEAVE_ROOM,
          (res: AckResponse<{ left: boolean }>) => {
            if (res.success && res.data)
              console.log('success -> left is ', res.data.left);
            else if (!res.success)
              console.warn(
                'error occurred while removing the peer in the room in the server',
                res.error,
              );
          },
        );
      } else {
        console.log('LEAVE_ROOM is not sent.');
      }
      console.log('about to call removeEventListeners inside leaveRoom()');
      removeEventListeners(socket);
      initializeMediaStreamSliceStates();
      set(
        () => {
          return {
            currentRoomId: null,
            isUserInRoom: false,
            sendTransport: null,
            recvTransport: null,
            producer: null,
            isProducerPaused: false,
            isSendTransportReady: false,
            isRecvTransportReady: false,
            isCreatingTransports: false,
            // DECISION: 어쩌면 transport 만들기 시작할때 0으로 다시 값 성정하는 부분이랑 겹칠 수도 있지만, 비용이 쌀것 같아서 그냥 허용하겠음. :::...
            iceRestartAttemptCount: {
              send: 0,
              recv: 0,
            },
            peerProducerList: [],
            participants: new Map(),
            consumersByPeerId: new Map(),
            remoteStreams: new Map(),
            peerNicknames: new Map(),
            peerTodayTotalDurations: new Map(),
            chatMessages: [],
            consumerLayers: new Map(),
            lastGlobalPreferredSpatialLayer: undefined,
          };
        },
        false,
        'room/left',
      );
    },

    clearForcedRoomExitReason: () => set({ forcedRoomExitReason: null }),

    sendChatMessage: (message, senderNickname) => {
      const uid = auth.currentUser?.uid;
      if (uid) {
        const { socket } = get();
        if (!message.trim() || !socket) return;

        const timestamp = new Date().toISOString();
        const msg = {
          senderId: uid,
          senderNickname: getNickname({
            userNicknameFromGoogleAccount: senderNickname,
            uid,
          }),
          message,
          timestamp,
        };
        set((s) => ({ chatMessages: [...s.chatMessages, msg] }));
        socket.volatile.emit(EventNames.CHAT_MESSAGE, { message, timestamp }); // DECISION: volatile -> 재전송 되면 오히려 참가하지 못했던 사용자의 허공에 대한 외침이 연결되어 있던 사용자들의 대화 맥락에 방해가 된다.
      } else {
        console.warn('auth.currentUser is null -> ', auth.currentUser);
      }
    },

    // Utilizing ConsumerSlice
    pauseOrResumeVideo: (consumerId) => {
      get().toggleLocalConsumerPause(consumerId);
    },
    setPreferredVideoQuality: (consumerId, spatialLayer) => {
      get().setConsumerPreferredLayers(consumerId, spatialLayer);
    },
    setCommonPreferredVideoQuality: (spatialLayer) => {
      return get().setCommonPreferredLayersForAllConsumers(spatialLayer);
    },

    // Utilizing ProducerSlice, MediaStreamSlice
    startSharing: () => {
      const { mediaStream, produce } = get();
      if (mediaStream) {
        set({ isBeingShared: true }, false, 'media/startSharing');
        produce();
      }
    },
    stopSharing: () => {
      get().closeProducer();
      set({ isBeingShared: false }, false, 'media/stopSharing');
    },
    toggleOnCamera: () => {
      get().resumeProducer();
    },
    toggleOffCamera: () => {
      get().pauseProducer();
    },
  };
};
