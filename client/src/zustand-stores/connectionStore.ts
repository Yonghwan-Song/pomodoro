import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { io, Socket } from "socket.io-client";
import { Device, types as mediasoupTypes } from "mediasoup-client";
import * as mediasoupClient from "mediasoup-client";
import * as EventNames from "../common/webrtc/eventNames";
import { auth } from "../firebase";
import { BASE_URL } from "../constants";
import type {
  AckResponse,
  ConsumerOptionsExtended,
  ProducerPayload,
  SocketID,
} from "../common/webrtc/payloadRelated";
import type { ProducerInfo } from "../Pages/GroupStudy/typeDef";
import type { ChatMessageData } from "../Pages/GroupStudy/components/chat/ChatMessage";

/**
 * Socket + Device + Media + Room을 전역 상태로 관리하는 Zustand store.
 *
 * 페이지 이동해도 socket 연결, device, media stream, room 참여 상태가 유지됨.
 * disconnect()와 leaveRoom()은 명시적으로 호출할 때만 실행됨.
 */

// ─── State Interfaces ───────────────────────────────────────

// DESIGN: The states here were local under the GroupStudy component and its descendants.
// However, these were supposed to be global so that a user can navigate between other urls while not interfering Room study session.
interface SocketState {
  socket: Socket | null;
  connected: boolean;
  isConnecting: boolean;
}

interface DeviceState {
  device: Device | null;
  isDeviceLoaded: boolean;
}

// TODO: Currently, the media is all about video (because I couldn't test audio in the CNU library..., I exclude an audio feature)
interface MediaState {
  stream: MediaStream | null;
  isSharing: boolean;
}

// NOTE: This state seems to have room to separate some properties depending on their roles/concerns.
// Simply put, everything we are talking about here is related to the Room feature. Thus, IMO RoomState is too broad.
// TODO: Split the state into detailed ones according to their concerns.
interface RoomState {
  currentRoomId: string | null;
  isRoomJoined: boolean;

  // Transport related
  sendTransport: mediasoupTypes.Transport | null;
  recvTransport: mediasoupTypes.Transport | null;
  isSendTransportReady: boolean;
  isRecvTransportReady: boolean;
  isCreatingTransports: boolean;

  // Producer/Consumer related -> 이것들은 이름이 따로 있지 않나?
  producer: mediasoupTypes.Producer | null;
  producersList: ProducerInfo[];
  consumersByPeerId: Map<string, mediasoupTypes.Consumer>;
  remoteStreams: Map<string, MediaStream>;
  peerNicknames: Map<string, string>;
  chatMessages: ChatMessageData[];
}

// ─── Action Interfaces ──────────────────────────────────────

interface SocketActions {
  connect: () => Promise<void>;
  disconnect: () => void;
}

interface DeviceActions {
  initDevice: () => Promise<void>;
}

interface MediaActions {
  obtainStream: (trackOption?: {
    video: boolean;
    audio: boolean;
  }) => Promise<MediaStream | null>;
  startSharing: () => void;
  stopSharing: () => void;
  releaseStream: () => void;
}

interface RoomActions {
  /** 방 입장. onError 콜백은 UI에서 navigate 등 처리용. */
  joinRoom: (roomId: string, onError?: (error: string) => void) => void;
  /** 방 퇴장. transport/producer/consumer 정리 + 리스너 해제. */
  leaveRoom: () => void;
  /** device loaded + stream 존재 시 send/recv transport 생성. */
  createTransports: () => void;
  /** isSharing && sendTransport ready 시 video track produce. */
  produce: () => Promise<void>;
  /** producer 닫고 서버에 알린 뒤 stopSharing. */
  endSharing: () => void;
  /** 채팅 메시지 전송. */
  sendChatMessage: (message: string, senderNickname: string) => void;
}

type Store = SocketState &
  DeviceState &
  MediaState &
  RoomState &
  SocketActions &
  DeviceActions &
  MediaActions &
  RoomActions;

// ─── Store ──────────────────────────────────────────────────

export const useConnectionStore = create<Store>()(
  devtools(
    (set, get) => ({
      // ─── Initial State ──────────────────────────────────
      socket: null,
      connected: false,
      isConnecting: false,
      device: null,
      isDeviceLoaded: false,
      stream: null,
      isSharing: false,
      currentRoomId: null,
      isRoomJoined: false,
      sendTransport: null,
      recvTransport: null,
      producer: null,
      isSendTransportReady: false,
      isRecvTransportReady: false,
      isCreatingTransports: false,
      producersList: [],
      consumersByPeerId: new Map(),
      remoteStreams: new Map(),
      peerNicknames: new Map(),
      chatMessages: [],

      // ─── Socket Actions ─────────────────────────────────

      connect: async () => {
        const { socket, isConnecting } = get();

        // connect()는 async라서 getIdToken() await 중에 다른 컴포넌트가
        // connect()를 또 호출할 수 있음. isConnecting 플래그로 race condition 방지.
        if (socket || isConnecting) {
          return;
        }

        set({ isConnecting: true }, false, "socket/connecting");

        try {
          const user = auth.currentUser;
          const token = user ? await user.getIdToken() : "";

          console.log("[socketStore] Initializing socket with URL:", BASE_URL);

          const newSocket = io(BASE_URL, {
            auth: { token },
            reconnection: true,
            reconnectionAttempts: 5,
          });

          newSocket.on("connect", () => {
            console.log("[socketStore] socket.connected", newSocket.connected);
            set(
              { connected: true, isConnecting: false },
              false,
              "socket/connected"
            );
          });

          newSocket.on("disconnect", (reason) => {
            console.log("[socketStore] Socket disconnected:", reason);
            set({ connected: false }, false, "socket/disconnected");
          });

          // isConnecting을 true로 만드는 모든 경로에 대해 false로 복구하는 경로가 있어야 함.
          // 성공: "connect" 이벤트 / 실패: "connect_error" / 예외: catch 블록
          newSocket.on("connect_error", (err) => {
            console.error("[socketStore] Connection error:", err.message);
            set(
              { connected: false, isConnecting: false },
              false,
              "socket/connect_error"
            );
          });

          set({ socket: newSocket }, false, "socket/initialized");
        } catch (error) {
          console.error("[socketStore] Setup failed", error);
          set({ isConnecting: false }, false, "socket/setupFailed");
        }
      },

      disconnect: () => {
        const { socket } = get();
        if (socket) {
          socket.disconnect();
          set(
            { socket: null, connected: false, isConnecting: false },
            false,
            "socket/manualDisconnect"
          );
        }
      },

      // ─── Device Actions ─────────────────────────────────

      /**
       * Device 생성 → handler 감지 → RTP capabilities 요청 → Device 로드를
       * 하나의 async flow로 처리.
       */
      initDevice: async () => {
        const { device, socket } = get();

        if (device?.loaded) {
          set({ isDeviceLoaded: true }, false, "device/alreadyLoaded");
          return;
        }

        try {
          const handlerName = await mediasoupClient.detectDeviceAsync();
          if (handlerName) {
            console.log("[socketStore] detected handler: %s", handlerName);
          } else {
            console.warn("[socketStore] no suitable handler found");
          }

          const newDevice = await Device.factory();
          set({ device: newDevice }, false, "device/created");
          console.log("[socketStore] Device created", newDevice);

          if (!socket) {
            console.warn("[socketStore] initDevice: socket not ready");
            return;
          }

          socket.once(
            EventNames.SEND_ROUTER_RTP_CAPABILITIES,
            async (routerRtpCapabilities: mediasoupTypes.RtpCapabilities) => {
              try {
                const currentDevice = get().device;
                if (!currentDevice) return;

                if (currentDevice.loaded) {
                  set({ isDeviceLoaded: true }, false, "device/alreadyLoaded");
                  return;
                }

                await currentDevice.load({ routerRtpCapabilities });

                socket.emit(
                  EventNames.SET_DEVICE_RTP_CAPABILITIES,
                  currentDevice.rtpCapabilities,
                  () => {
                    console.log(
                      "[socketStore] Server confirmed RTP capabilities received"
                    );
                    set({ isDeviceLoaded: true }, false, "device/loaded");
                  }
                );
              } catch (error) {
                console.warn("[socketStore] Error loading device:", error);
              }
            }
          );

          socket.emit(EventNames.GET_ROUTER_RTP_CAPABILITIES);
        } catch (error: unknown) {
          if ((error as Error).name === "UnsupportedError") {
            console.warn("[socketStore] Browser not supported for mediasoup");
          } else {
            console.error("[socketStore] initDevice failed:", error);
          }
        }
      },

      // ─── Media Actions ──────────────────────────────────

      obtainStream: async (
        trackOption: { video: boolean; audio: boolean } = {
          video: true,
          audio: false,
        }
      ) => {
        const { stream } = get();
        if (stream) return stream;

        try {
          const newStream = await navigator.mediaDevices.getUserMedia(
            trackOption
          );
          console.log("[socketStore] obtainStream SUCCESS", newStream.id);

          newStream.getTracks().forEach((track) => {
            track.addEventListener("ended", () => {
              console.log(
                `[socketStore] Track ${track.kind} (${track.label}) ended`
              );
            });
          });

          set({ stream: newStream }, false, "media/streamObtained");
          return newStream;
        } catch (error) {
          console.error(
            "[socketStore] 카메라/마이크에 접근할 수 없습니다:",
            error
          );
          return null;
        }
      },

      startSharing: () => {
        const { stream } = get();
        if (stream) {
          console.log("[socketStore] startSharing");
          set({ isSharing: true }, false, "media/startSharing");
          // sendTransport가 이미 준비되었다면 바로 produce 시도
          get().produce();
        } else {
          console.warn(
            "[socketStore] startSharing called but no stream available"
          );
        }
      },

      stopSharing: () => {
        console.log("[socketStore] stopSharing");
        set({ isSharing: false }, false, "media/stopSharing");
      },

      releaseStream: () => {
        const { stream } = get();
        if (stream) {
          console.log("[socketStore] releaseStream - stopping tracks");
          stream.getTracks().forEach((track) => track.stop());
        }
        set({ stream: null, isSharing: false }, false, "media/streamReleased");
      },

      // ─── Room Actions ───────────────────────────────────

      joinRoom: (roomId, onError) => {
        const { socket, isRoomJoined } = get();
        if (!socket || isRoomJoined) return;

        // 방 레벨 socket 리스너 등록
        // (leaveRoom에서 해제됨)

        // 새 producer 알림
        socket.on(
          EventNames.ROOM_GET_PRODUCER,
          (payloads: ProducerPayload[]) => {
            console.log("[socketStore] New producers:", payloads);

            set(
              (state) => {
                const newProducers = payloads.map((p) => ({
                  ...p,
                  isBeingConsumed: false,
                }));
                const updatedNicknames = new Map(state.peerNicknames);
                payloads.forEach((p) => {
                  if (p.displayName)
                    updatedNicknames.set(p.socketId, p.displayName);
                });
                return {
                  producersList: [...state.producersList, ...newProducers],
                  peerNicknames: updatedNicknames,
                };
              },
              false,
              "room/newProducers"
            );

            // 새 producer가 왔으니 consume 시도
            consumePendingProducers();
          }
        );

        // peer 입장 로그
        socket.on(
          EventNames.ROOM_PEER_JOINED,
          (payload: { peerId: string }) => {
            console.log("[socketStore] New peer joined:", payload);
          }
        );

        // producer 닫힘 알림
        socket.on(
          EventNames.PRODUCER_CLOSED,
          (payload: { producerId: string }) => {
            const { producerId } = payload;
            console.log("[socketStore] Producer closed:", producerId);

            const { producersList, consumersByPeerId } = get();
            const producer = producersList.find(
              (p) => p.producerId === producerId
            );
            if (!producer) return;

            // 해당 producer를 consume 중이었다면 consumer 정리
            if (producer.isBeingConsumed) {
              const consumer = consumersByPeerId.get(producer.socketId);
              if (consumer) {
                consumer.close();
                const newConsumers = new Map(consumersByPeerId);
                newConsumers.delete(producer.socketId);
                const newRemoteStreams = new Map(get().remoteStreams);
                newRemoteStreams.delete(producer.socketId);
                set(
                  {
                    consumersByPeerId: newConsumers,
                    remoteStreams: newRemoteStreams,
                  },
                  false,
                  "room/consumerCleanedUp"
                );
              }
            }

            set(
              {
                producersList: producersList.filter(
                  (p) => p.producerId !== producerId
                ),
              },
              false,
              "room/producerRemoved"
            );
          }
        );

        // 채팅 메시지 수신
        socket.on(EventNames.CHAT_MESSAGE, (payload: ChatMessageData) => {
          console.log("[socketStore] Incoming chat message:", payload);
          set(
            (state) => ({ chatMessages: [...state.chatMessages, payload] }),
            false,
            "room/chatMessageReceived"
          );
        });

        // JOIN_ROOM 요청
        socket.emit(
          EventNames.JOIN_ROOM,
          { roomId },
          (
            response: AckResponse<{
              roomId: string;
              routerRtpCapabilities: mediasoupTypes.RtpCapabilities;
              existingProducers: {
                producerId: string;
                socketId: string;
                kind: string;
                displayName?: string;
              }[];
              peers: SocketID[];
            }>
          ) => {
            if (response.success && response.data) {
              console.log(
                "[socketStore] Room joined successfully:",
                response.data
              );

              const existingProducers = response.data.existingProducers.map(
                (p) => ({
                  ...p,
                  kind: p.kind as "video" | "audio",
                  isBeingConsumed: false,
                })
              );

              const nicknames = new Map<string, string>();
              response.data.existingProducers.forEach((p) => {
                if (p.displayName) nicknames.set(p.socketId, p.displayName);
              });

              set(
                {
                  isRoomJoined: true,
                  currentRoomId: roomId,
                  producersList: existingProducers,
                  peerNicknames: nicknames,
                },
                false,
                "room/joined"
              );

              // 조건이 맞으면 transport 생성 시도
              get().createTransports();
            } else {
              console.error(
                "[socketStore] Failed to join room:",
                response.error
              );
              onError?.(response.error ?? "Unknown error");
            }
          }
        );
      },

      leaveRoom: () => {
        const { socket, isRoomJoined, sendTransport, recvTransport, producer } =
          get();
        if (!isRoomJoined) return;

        // 1. Producer 닫기
        if (producer) {
          producer.close();
          socket?.emit(EventNames.PRODUCER_CLOSED, { producerId: producer.id });
        }

        // 2. Consumer 전부 닫기
        get().consumersByPeerId.forEach((consumer) => consumer.close());

        // 3. Transport 닫기
        sendTransport?.close();
        recvTransport?.close();

        // 4. 서버에 방 나감 알림
        socket?.emit(EventNames.LEAVE_ROOM);

        // 5. 방 레벨 리스너 해제
        socket?.off(EventNames.ROOM_GET_PRODUCER);
        socket?.off(EventNames.ROOM_PEER_JOINED);
        socket?.off(EventNames.PRODUCER_CLOSED);
        socket?.off(EventNames.CHAT_MESSAGE);

        // 6. 상태 초기화
        set(
          {
            currentRoomId: null,
            isRoomJoined: false,
            sendTransport: null,
            recvTransport: null,
            producer: null,
            isSendTransportReady: false,
            isRecvTransportReady: false,
            isCreatingTransports: false,
            producersList: [],
            consumersByPeerId: new Map(),
            remoteStreams: new Map(),
            peerNicknames: new Map(),
            chatMessages: [],
          },
          false,
          "room/left"
        );
      },

      createTransports: () => {
        const {
          socket,
          device,
          isDeviceLoaded,
          stream,
          isSendTransportReady,
          isRecvTransportReady,
          isCreatingTransports,
        } = get();

        if (!socket || !device || !isDeviceLoaded || !stream) return;
        // 이미 transport가 준비됐거나 생성 중이면 무시 (중복 once 리스너 방지)
        if (
          (isSendTransportReady && isRecvTransportReady) ||
          isCreatingTransports
        )
          return;

        set({ isCreatingTransports: true }, false, "room/creatingTransports");

        // ── Send Transport ──
        if (!isSendTransportReady) {
          socket.emit(EventNames.CREATE_SEND_TRANSPORT);

          socket.once(
            EventNames.SEND_TRANSPORT_CREATED,
            (webRtcTransportOptions: mediasoupTypes.TransportOptions) => {
              try {
                const currentDevice = get().device;
                if (!currentDevice) return;

                const transport = currentDevice.createSendTransport(
                  webRtcTransportOptions
                );
                console.log(
                  "[socketStore] Send transport created",
                  transport.id
                );

                // mediasoup transport "connect" 이벤트
                transport.on(
                  "connect",
                  ({ dtlsParameters }, callback, errback) => {
                    try {
                      const sock = get().socket;
                      if (!sock) return errback(new Error("No socket"));

                      sock.emit(
                        EventNames.CONNECT_SEND_TRANSPORT,
                        { transportId: transport.id, dtlsParameters },
                        (ackResponse: AckResponse) => {
                          if (ackResponse.success) {
                            console.log(
                              "[socketStore] Send transport connected"
                            );
                            callback();
                          } else {
                            errback(
                              new Error(ackResponse.error || "Unknown error")
                            );
                          }
                        }
                      );
                    } catch (error: unknown) {
                      errback(error as Error);
                    }
                  }
                );

                // mediasoup transport "produce" 이벤트
                transport.on("produce", (parameters, callback, errback) => {
                  const sock = get().socket;
                  if (!sock) return errback(new Error("No socket"));

                  sock.emit(
                    EventNames.PRODUCE,
                    {
                      transportId: transport.id,
                      kind: "video",
                      rtpParameters: parameters.rtpParameters,
                    },
                    (ackResponse: AckResponse<{ producerId: string }>) => {
                      if (ackResponse.success && ackResponse.data) {
                        console.log(
                          "[socketStore] Produce success",
                          ackResponse.data
                        );
                        callback({ id: ackResponse.data.producerId });
                      } else {
                        errback(
                          new Error(ackResponse.error || "Unknown error")
                        );
                      }
                    }
                  );
                });

                set(
                  { sendTransport: transport, isSendTransportReady: true },
                  false,
                  "room/sendTransportReady"
                );

                // isSharing 상태면 바로 produce 시도
                if (get().isSharing) {
                  get().produce();
                }
              } catch (error) {
                console.warn(
                  "[socketStore] Error creating send transport:",
                  error
                );
              }
            }
          );
        }

        // ── Recv Transport ──
        if (!isRecvTransportReady) {
          socket.emit(EventNames.CREATE_RECV_TRANSPORT);

          socket.once(
            EventNames.RECV_TRANSPORT_CREATED,
            (webRtcTransportOptions: mediasoupTypes.TransportOptions) => {
              try {
                const currentDevice = get().device;
                if (!currentDevice) return;

                const transport = currentDevice.createRecvTransport(
                  webRtcTransportOptions
                );
                console.log(
                  "[socketStore] Recv transport created",
                  transport.id
                );

                // mediasoup transport "connect" 이벤트
                transport.on(
                  "connect",
                  ({ dtlsParameters }, callback, errback) => {
                    try {
                      const sock = get().socket;
                      if (!sock) return errback(new Error("No socket"));

                      sock.emit(
                        EventNames.CONNECT_RECV_TRANSPORT,
                        { transportId: transport.id, dtlsParameters },
                        (ackResponse: AckResponse) => {
                          if (ackResponse.success) {
                            console.log(
                              "[socketStore] Recv transport connected"
                            );
                            callback();
                          } else {
                            errback(
                              new Error(ackResponse.error || "Unknown error")
                            );
                          }
                        }
                      );
                    } catch (error) {
                      errback(error as Error);
                    }
                  }
                );

                set(
                  { recvTransport: transport, isRecvTransportReady: true },
                  false,
                  "room/recvTransportReady"
                );

                // recv transport 준비됐으니 대기 중인 producer consume 시도
                consumePendingProducers();
              } catch (error) {
                console.warn(
                  "[socketStore] Error creating recv transport:",
                  error
                );
              }
            }
          );
        }
      },

      produce: async () => {
        const { stream, isSharing, sendTransport, producer } = get();
        if (!stream || !isSharing || !sendTransport || producer) return;

        const videoTrack = stream.getVideoTracks()[0];
        if (!videoTrack) return;

        try {
          const newProducer = await sendTransport.produce({
            track: videoTrack,
            stopTracks: false,
          });
          console.log("[socketStore] Video Producer created:", newProducer.id);
          set({ producer: newProducer }, false, "room/produced");
        } catch (err) {
          console.error("[socketStore] Produce failed:", err);
        }
      },

      endSharing: () => {
        const { producer, socket } = get();
        if (producer) {
          producer.close();
          socket?.emit(EventNames.PRODUCER_CLOSED, { producerId: producer.id });
          set({ producer: null }, false, "room/producerClosed");
        }
        get().stopSharing();
      },

      sendChatMessage: (message, senderNickname) => {
        const { socket } = get();
        if (!message.trim() || !socket) return;

        const newMessage: ChatMessageData = {
          senderId: socket.id!,
          senderNickname,
          message,
          timestamp: new Date().toISOString(),
        };

        set(
          (state) => ({ chatMessages: [...state.chatMessages, newMessage] }),
          false,
          "room/chatMessageSent"
        );

        socket.emit(EventNames.CHAT_MESSAGE, { message });
      },
    }),
    { name: "ConnectionStore" }
  )
);

// ─── Internal Helper ──────────────────────────────────────
// store 외부에 정의해서 joinRoom/createTransports 내부에서 호출.
// store action으로 노출하지 않음 — UI에서 직접 호출할 이유가 없으므로.

function consumePendingProducers() {
  const {
    socket,
    isRecvTransportReady,
    recvTransport,
    isDeviceLoaded,
    producersList,
  } = useConnectionStore.getState();

  if (!socket || !isRecvTransportReady || !recvTransport || !isDeviceLoaded)
    return;

  producersList.forEach((producerInfo) => {
    if (producerInfo.kind !== "video" || producerInfo.isBeingConsumed) return;

    // 먼저 isBeingConsumed 마킹 (중복 consume 방지)
    useConnectionStore.setState(
      (state) => ({
        producersList: state.producersList.map((p) =>
          p.producerId === producerInfo.producerId
            ? { ...p, isBeingConsumed: true }
            : p
        ),
      }),
      false,
      "room/markingConsumed"
    );

    console.log(
      `[socketStore] Requesting to consume producer: ${producerInfo.producerId}`
    );

    socket.emit(
      EventNames.INTENT_TO_CONSUME,
      { producerId: producerInfo.producerId, peerId: producerInfo.socketId },
      async (response: AckResponse<ConsumerOptionsExtended>) => {
        if (!response.success || !response.data) {
          console.error(`[socketStore] Consume failed: ${response.error}`);
          return;
        }

        const { peerId, ...consumerOptions } = response.data;

        try {
          const currentTransport = useConnectionStore.getState().recvTransport;
          if (!currentTransport) return;

          const consumer = await currentTransport.consume(consumerOptions);
          console.log(
            `[socketStore] Consumer created: ${consumer.id} (kind: ${consumer.kind}) for peer: ${peerId}`
          );

          // consumer 등록
          useConnectionStore.setState(
            (state) => ({
              consumersByPeerId: new Map(state.consumersByPeerId).set(
                peerId,
                consumer
              ),
            }),
            false,
            "room/consumerCreated"
          );

          // 서버에 resume 요청
          socket.emit(
            EventNames.RESUME_CONSUMER,
            { consumerId: consumer.id },
            (ackResponse: AckResponse<{ resumed: boolean }>) => {
              if (ackResponse.success) {
                console.log(`[socketStore] Consumer ${consumer.id} resumed`);
              }
            }
          );

          // remote stream 생성
          const { track } = consumer;
          const newStream = new MediaStream([track]);
          useConnectionStore.setState(
            (state) => ({
              remoteStreams: new Map(state.remoteStreams).set(
                peerId,
                newStream
              ),
            }),
            false,
            "room/remoteStreamAdded"
          );

          // consumer 이벤트 핸들러
          consumer.on("transportclose", () => {
            console.log(
              `[socketStore] Consumer transport closed for peer: ${peerId}`
            );
            useConnectionStore.setState(
              (state) => {
                const newConsumers = new Map(state.consumersByPeerId);
                newConsumers.delete(peerId);
                const newStreams = new Map(state.remoteStreams);
                newStreams.delete(peerId);
                return {
                  consumersByPeerId: newConsumers,
                  remoteStreams: newStreams,
                };
              },
              false,
              "room/consumerTransportClosed"
            );
          });

          consumer.on("trackended", () => {
            console.log(`[socketStore] Track from peer ${peerId} ended`);
            useConnectionStore.setState(
              (state) => {
                const newStreams = new Map(state.remoteStreams);
                newStreams.delete(peerId);
                return { remoteStreams: newStreams };
              },
              false,
              "room/trackEnded"
            );
          });
        } catch (error) {
          console.error("[socketStore] Error creating consumer:", error);
        }
      }
    );
  });
}
