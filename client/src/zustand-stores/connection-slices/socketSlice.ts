import type { StateCreator } from "zustand";
import { io } from "socket.io-client";
import { auth } from "../../firebase";
import { BASE_URL } from "../../constants";
import { EXPLICIT_SOCKET_DISCONNECT_REASONS } from "./constants";
import type { ConnectionStore, SocketSlice } from "./types";
import { enableMapSet } from "immer";
import * as EventNames from "../../common/webrtc/eventNames";
import { AckResponse, PeerStatus } from "../../common/webrtc/payloadRelated";
enableMapSet();

export const createSocketSlice: StateCreator<
  ConnectionStore,
  [["zustand/devtools", never], ["zustand/immer", never]],
  [],
  SocketSlice
> = (set, get) => {
  const handleProlongedDisconnectionTimeout = (timeout: number) => {
    const resetTimer = setTimeout(() => {
      const {
        initializeRoomSliceStates,
        initializeMediaStreamSliceStates,
        initializeDeviceSliceStates,
        initializeTransportSliceStates,
        initializeProducerSliceStates,
        initializeConsumerSliceStates,
        initializeSocketSliceStates,
        socket
      } = get();

      initializeRoomSliceStates();
      if (socket) socket.io.removeAllListeners();
      initializeSocketSliceStates();
      initializeMediaStreamSliceStates();
      initializeDeviceSliceStates();
      initializeTransportSliceStates();
      initializeProducerSliceStates();
      initializeConsumerSliceStates();
      set({ forcedRoomExitReason: "tcp-socket-prolonged-disconnect" });
    }, timeout);

    set({ socketResetTimer: resetTimer }, false, "socket/assign-reset-timer");
  };

  return {
    socket: null,
    isSocketConnected: false,
    isSocketConnecting: false,
    socketResetTimer: null,
    // disconnect이랑 겹치는데
    initializeSocketSliceStates: () => {
      const { socket, socketResetTimer } = get();
      if (socket) {
        socket.removeAllListeners();
        socket.close();
      }
      if (socketResetTimer !== null) {
        clearTimeout(socketResetTimer);
      }
      set(
        {
          socket: null,
          isSocketConnected: false,
          isSocketConnecting: false,
          socketResetTimer: null
        },
        false,
        "socket/resetToInitialValues"
      );
    },
    // GroupStudy Component에서 side effect
    connect: async (caller) => {
      const { socket, isSocketConnecting: isConnecting } = get();
      // connect()는 비동기 함수이므로 여러 컴포넌트가 동시에 호출해도 소켓이 중복 생성되지 않아야 한다.

      console.log(`connect() was called by ${caller}`);
      // console.log("socket inside connect()", socket);

      // NOTE: When a socket is disconnected and it is not set to null, connect() should not be called
      // because the socket disconnected is supposed to be reconnected automatically.
      // If we allow this method to run, it will probably create a new socket instance and the old one will be left orphaned.

      // #region New
      if (socket !== null) {
        console.log(
          "socket is not null. connect() is early returned due to one of the followings"
        );
        console.log("socket.connected", socket.connected);
        console.log(
          "socket.disconnected -> non null socket is disconnected means it is attempting to reconnect",
          socket.disconnected
        );
        console.log("isConnecting (set in this connect() call)", isConnecting);
        return;
      }
      //#endregion New
      // #region Old
      // if (socket?.connected || isConnecting ) {
      //   // this can be called during the socket is attempting to reconnect.
      //   // then, how can I prevent the case?
      //   console.log("connect() is early returned due to one of the followings");
      //   console.log("socket?.connected", socket?.connected);
      //   console.log("isConnecting", isConnecting);
      //   return;
      // }
      //#endregion Old

      set({ isSocketConnecting: true }, false, "socket/connecting"); //? What should be forbidden while a socket is connecting? -> QQQ?: 실제로 어떤 조건문에서도 사용되지 않고있긴 함.

      // TODO: 이거 원리를 까먹었다.... token 재발행 이유가 있었는데....
      try {
        const newSocket = io(BASE_URL, {
          auth: async (cb) => {
            const currentUser = auth.currentUser;
            const token = currentUser ? await currentUser.getIdToken() : "";
            cb({ token });
          },
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          randomizationFactor: 0.5
          // transports: ['polling', 'websocket'], // polling 먼저, 그 다음 websocket 업그레이드
          // transports: ['websocket'], // polling을 제외하고 websocket만 사용
          // upgrade: false
        });

        set({ socket: newSocket }, false, "socket/assignedNew");

        // 이게... 왜... 아니 그냥 소켓 연결 되버렸는데 다시? reconnec이 아니라? connect()이 명백히 호출된거잖아.... 자동연결 대신에....
        newSocket.on("connect", () => {
          console.log("the id of the socket just connected", newSocket.id);
          set(
            { isSocketConnected: true, isSocketConnecting: false },
            false,
            "socket/connected"
          );
        });

        //#region New on socket disconnection -> 30분 뒤에 방에서 나가지도록
        // TODO: - [x] timeout callback -> initialize slices, set forcedRoomExitReason
        //       - [x] EXPLICIT_SOCKET_DISCONNECT_REASONS -> leaveRoom() 에 뭔가 추가해보기 -> 이것도 동일하게 하자 그냥
        //       - [ ] test the edge case of scenario 3 [tcp down, udp down, udp up, tcp up after timeout]
        //       - [ ] check if I do Something about socket manager's "reconnect" event handler.
        //          1. newSocket.io 즉, socket자체로부터 manager로 접속하는거니까.. 뭔가 manager수준에서 자신이 manager하고 있는 socket이 null이 되면 알아서 라이브러리 수준에서 event listener를 drop하지 않을까?
        newSocket.on("disconnect", (reason) => {
          const { isUserInRoom, socketResetTimer } = get();
          console.log("socket disconnection reason -> ", reason);

          // WARNING: 다양한 disconnect reason과 관계없이 공통으로 적용.
          // isSocketConnecting은... 모르겠어.. 여기서 설정 안하겠음.. 이거 왜 만들어졌는지조차 모르겠음.
          set({ isSocketConnected: false }, false, "socket/disconnected");

          // NOTE: ★ 여기 추가: 어떤 reason이든 진입하면 이전 타이머부터 무조건 clear
          if (socketResetTimer !== null) {
            clearTimeout(socketResetTimer);
            set(
              { socketResetTimer: null },
              false,
              "socket/clear-reset-timer-on-disconnect"
            );
          }

          if (EXPLICIT_SOCKET_DISCONNECT_REASONS.has(reason)) {
            handleProlongedDisconnectionTimeout(0);
          } else if (reason === "ping timeout") {
            // TODO: After deleting the iptables rule, socket does not recover automatically perhaps because I set it to null or sth?... by setTimeout callback.
            // I think it would be better just to remove him from the room after timeout and let him keep his socket connection reattempts.
            // No.. I set reconnection to false. Let's test this scenario again.
            // NOTE: The server did not send a PING within the pingInterval + pingTimeout range

            // cb is only going to affect users in a room. Thus, do not let cb to determine if he is in a room or not.
            isUserInRoom && handleProlongedDisconnectionTimeout(3 * 60 * 1000);
          } else if (reason === "transport close") {
            // NOTE: The connection was closed (example: the user has lost connection, or the network was changed from WiFi to 4G)
            handleProlongedDisconnectionTimeout(3 * 60 * 1000);
            // handleProlongedDisconnectionTimeout(0);
          } else if (reason === "transport error" || reason === "parse error") {
            isUserInRoom && handleProlongedDisconnectionTimeout(0);
          }
        });
        //#endregion

        newSocket.on("connect_error", (err) => {
          console.error("[socketStore] Connection error:", err.message);
          set(
            { isSocketConnected: false, isSocketConnecting: false },
            false,
            "socket/connect_error"
          );
        });

        //#region reconnect old
        // newSocket.io.on("reconnect", () => {
        //   const {
        //     attemptToRestartIce,
        //     sendTransport,
        //     recvTransport,
        //     isUserInRoom,
        //     socketResetTimer
        //   } = get();
        //
        //   if (socketResetTimer !== null) {
        //     clearTimeout(socketResetTimer);
        //     set(
        //       { socketResetTimer: null },
        //       false,
        //       "socket/initialize-reset-timer"
        //     );
        //   }
        //
        //   //#region Scribble
        //   // 1. firefox 방어가 되는지 확인해야함. 아니면 firefox쓰지 말라고해버리기...
        //   // 2. 경우의 수 rope들 다시 잡아내기 (가능한 사건들의 줄기?) <-- 이거를 어떠헥 다시 하지.....................
        //   // 3. Then, what should I do about the fucking edge case where socket.emit() is called and ack res is not received?
        //   // What happens in this design?
        //   // The fact that an ack response is not received means the socket connection was down as soon as the socket.emit() was called.
        //   // That means this reconnect handler is going to be called definitely
        //   //#endregion
        //
        //   console.log(
        //     "isUserInRoom, sendTransport, recvTransport",
        //     isUserInRoom,
        //     sendTransport,
        //     recvTransport
        //   );
        //   // QQQ: 이쪽에서 뭔가 불필요하게 ICE Restart를 하는 경우가 생기는듯? 개발하다가 server나 client 재시작하는 과정에서 생기는 것인지 잘 모르겠음.
        //   // docker 도입하고나서 테스트 해보기
        //   if (isUserInRoom) {
        //     // NOTE: transports null check prevents unnecessary ICE (re)negotiation for a user who was only in the lobby, not in a room.
        //     console.log(
        //       "Right before attempting to restart ICE inside reconnect handler"
        //     );
        //     sendTransport !== null &&
        //       attemptToRestartIce(sendTransport, "send", newSocket);
        //     recvTransport !== null &&
        //       attemptToRestartIce(recvTransport, "recv", newSocket);
        //   } else {
        //     // 방에 들어가지 않았을때 끊겼다가 다시 연결되었다는 것인데, 그러면 [signaling server] handleConnection()에서
        //     // peer가 정리되지 않았다면``
        //
        //   }
        // });
        //#endregion

        //#region reconnect new
        // TODO: UDP까지 단절하는 iptables command 만들어서 모든 시나리오 테스트
        // ASSUMPTION: signaling server의 handleConnection의 작업 진행 완료의 유무가 지금 여기에서 하려는 작업에 영향을 주지 않는다는 가정하에,
        // 알아서 그냥 이쪽에서 작업들을 진행한다. 주지 않아야함... 주면 힘든데
        // NOTE: handleConnection의 작업
        // 1. user exists in the peerMap
        //    0. 공통: clearTimeout(existingPeer.removalTimer), update peer's current socket.
        //    1. user is in a room => socket.io room join, emit SYNC_DATA_TO_PEER_RECONNECTED
        //    2. user is not in a room => do nothing
        // 2. user does not exist in the peerMap => addPeer()
        // DECISION: ClearTimeout AS SOON AS a "reconnect" event occurs
        //    - We just clear the timeout cb regardless of whether he is in a room or not in the client side.
        //    - Afterwards, we rely on the peer status in the server side to decide the removal of him from the room in the client side
        // DESIGN: what is supposed to be done here in the handler
        // 아래의 정보는 새로운 event를 만들어서 보낸 후 Ack Response에 정보를 담아오겠음.
        // 1. user exists in the peerMap
        //    1. user is in a room => peer's transports [SS] exist. We attempt ICE negotiation(, assuming that the last disconnection affected the transports too.)
        //    2. user is not in a room => if [FE] user is in the room, leaveRoom. else do nothing
        // 2. user does not exist in the peerMap => if [FE] user is in the room, leaveRoom first.
        // QQQ: I am not 100% sure if just leaving the room is enough in the 2 right above.
        newSocket.io.on("reconnect", () => {
          const {
            leaveRoom,
            attemptToRestartIceWithGuards,
            sendTransport,
            recvTransport,
            isUserInRoom: isUserInRoomInClient,
            socketResetTimer
          } = get();

          console.log("socket manager's reconnect handler is called");

          // DECISION: ClearTimeout AS SOON AS a "reconnect" event occurs
          if (socketResetTimer !== null) {
            clearTimeout(socketResetTimer);
            set(
              { socketResetTimer: null },
              false,
              "socket/initialize-reset-timer"
            );
          }

          // peerStatus: [SS]의 handleConnection() 가서 찾아봐
          newSocket.volatile.emit(
            EventNames.CHECK_PEER_STATUS_IN_SERVER,
            (res: AckResponse<PeerStatus>) => {
              if (res.success && res.data) {
                const {
                  doesPeerExistInPeerMap: doesPeerExistInPeerMapInServer,
                  isPeerInRoom: isPeerInRoomInServer
                } = res.data;
                // DESIGN: 위에 주석에 해당되는 부분
                // IMPT: 3가지 분기점 A, B, C -> [1]이것들 모두 서버로부터의 peerStatus를 가지고 판단한다. [2]그리고, 그 분기점들 내부에서 room check를 한번 해준다([FE]정보 크로스체크)
                // 3 * 2 = 총 6개의 가능성 => 서버쪽을 기준으로 맞춰야함. 왜냐하면, 단절된 당사자의 UX보다 단절되지 않고 참가하고 있는 participants의 UX가 더 중요함.
                if (doesPeerExistInPeerMapInServer) {
                  // 항상 true 애초에 peerMap에 등록되고나서 이 message가 전달될 수 밖에 없다고
                  if (isPeerInRoomInServer) {
                    // NOTE: A
                    //#region 주저리
                    // QQQ: 만약 x초에 cleanup 예정인데, x-1초에 .. 아닌가... 뭔가 꼬일수 있을것 같은데! 상상해봐. handleConnection이 발동하기 전에 이게 먼저 저쪽에 도달해서 `handleCheckPeerStatusInServer()`가 먼저 실행된다면?
                    // QQQ: 만약 저쪽에서는 방에서 방출 안되었는데 아직, 이쪽 타이머가 더 빨리 timeout되어서 방출 된 후에 reconnect된 경우라면?...
                    // 그렇다면 [FE]는 isUserInRoom === false인데 저쪽은 true인 경우가 존재한다는 거잖아... 할지도? ..
                    //#endregion
                    if (isUserInRoomInClient) {
                      // NOTE: [2]
                      console.log("[SS, FE] -> [Room, Room]");
                      // TEST: tcp-socket-prolonged-disconnect 이 발생하지 않았을때 (양쪽 모두)
                      // WHAT_IF: 만약에... UDP는 안끊겼다면? 그러면 재협상은... 할 필요가 없잖아. 그것은 그런데 attemptToRestartIce()의 transport guard가 판단해줌.
                      setTimeout(() => {
                        console.log(
                          "invoking attemptToRestartIce with send in CHECK_PEER_STATUS_IN_SERVER ack cb"
                        );
                        sendTransport !== null &&
                          attemptToRestartIceWithGuards(
                            sendTransport,
                            "send",
                            newSocket
                          );
                      }, 0);

                      setTimeout(() => {
                        console.log(
                          "invoking attemptToRestartIce with recv in CHECK_PEER_STATUS_IN_SERVER ack cb"
                        );
                        recvTransport !== null &&
                          attemptToRestartIceWithGuards(
                            recvTransport,
                            "recv",
                            newSocket
                          );
                      }, 1000);
                    } else {
                      // IMPT: 희박 - 방에 있다가 접속 맛탱이 가서 leaveRoom을 사용자가 클릭할 때만 발생. 새로고침 해도 -> transport close, `/timer`로 이동하니까 발생.
                      // 이런 경우 재연결의 주체가 지금 이 recnnect handler인 경우... 뭐 따로 내가 다시 방에 들어오도록 강제해야하지 않을까?.. 왜냐하면.................
                      // 그냥 거기에 머무르게 하면.... 아니야 그냥 방출하던가... 서버에서... 늦게나마... 왜냐하면 지가 나갔으니까...
                      console.log("[SS, FE] -> [Room, Lobby]");
                      // TEST: tcp-socket-prolonged-disconnect 이 FE에서만 발생 -> 서버쪽 제한시간이 더 길다.
                      //#region 주저리
                      // WARNING: 다른 참가자들 입장에서는 방에 내가 참여해있는데, 실질적으로 나는 방에서 나가진 이상한 경우. 물론 당연히 채팅이나 화면 공유는 먹통이겠지?
                      // 그런데 뭐 어떻게 하라고.... 다시 들어가? 다시 들어가면... 내가 있냐?... 그러니까 joinRoom을 저쪽에서 했을때, 그 함수가 peer가 이미 있는데,
                      // 유체이탈 해서 나갔던 영혼이 돌아오는것을 해주냐 이거지... 그리고 이 경우에는 나갔던 영혼이 다시 재연결이 될수가 있나? 왜냐하면 이쪽의 transports는
                      // null값을 할당받지 않았나? 그러면 저쪽 transports는 뭐야... 이쪽은 failed가 맞고 저쪽은 뭐 failed말고 그다음의 어떤 state이 있던것 같은데?
                      // IMPT: 애초에 이 분기점에 도달 가능한게 맞아?.... ping timeout 이후 자료들 클리어하는 timeout이 차이가 많이 나게 하면 뭔가 simulation할 수 있지 않을까?
                      // DESIGN: 아니 어차피 내가 disconnection되어있는데 내가 여기 방에서 나가든 안나가든 나의 UX에 아무런 뭐가 없다고...
                      // 서버쪽에서 오랫동안 연결되지 않은 user가 있으면 가져다가 버릴때 participants의 UX가 개선되겠지.. 좀비들이 사라지니까.. 그런데 여기에서
                      // 뭐하러 그렇게 하지?... 그런데.. 사용자가 leaveRoom눌러버리면 어쩔건데.... .. 맞아... 그러니까 어떻게 설계하든 isUserInRoom을 여기에서 체크할 수 밖에 없어.
                      // 그러니까 내가 programmatically 사용자가 인터넷 연결 안되고 다시 연결되었을때, 방에 머물러있게하거나 나가있게하거나 통제할 수가 없어. (programmatically)
                      // WHAT_IF: 그래서 내가 직접 여기서 체크해야함. 그리고 만약에 socket연결이 안되었을때, leaveRoom을 하면... 그 함수 내부의 signaling은 어떻게 하지?...
                      // 이거 아마... socket연결되면 자동으로 다시 보내질텐데... 그때의 그 꼬임은 어떻게 할건데... 아니 그러니까 만약에 꼬이면?...ㅠ
                      // DECISION: 그래서.. 어떻게되는거야 room check 해 말어
                      //#endregion
                      //
                      // NOTE: When a user leaves the room while he was disconnected. -> reload후에 connect()이 호출되는것과의 차이는 누가 connect의 주체인지
                      // reload는 connect(), 위의 경우는 지금 이 함수. 그렇다면 joinRoom에 isUserInRoomInClient를 payload에 포함시키면 해결된다.
                      // WHAT_IF: 그러나 만약에, user가 방에 안들어가는 시간이 길어지면, participants의 UX는 감소. 3분 + 너무 많은 시간동안 접속 안했음 => 안좋아.
                      // 그래서 또한번 timeout을 줘서 유체이탈이라는 판단이 선 후 3분의 시간이 지났는데 방에 안들어오면 그냥 peer를 방에서 강제로 방출.
                      // 그렇다면 connect시점에 이게 서버쪽에서 유체이탈인지 아닌지 판단을 할 수 있게 해줘야지 setTimeout호출을 할텐데... 이렇게까지 해야하나?
                      // DESIGN: 그냥 connect event handler에서도 socket.emit으로 peerStatus 확인한 후에 만약 유체이탈 상태다 하면 이쪽에서 뭐 보내주지 유체이탈이라고
                      // IMPT: 재연결이라는 것을 포함시키면, 이제 문제가 socket connection이 reconnection인지 아닌지 구분해야한다는것.
                      // 그런데 그것을 connect handler in their server는 peer와 peer.id가 firebaseUid라는 것 그리고 fierbaseUid는 지금 우리 앱 구조상 peer에게 유일한 값이라는것 (식별자).
                      // 연결에 비용이 증가하는데? recovery 기능 넣느라고... 아닌가 그냥 if구문 하나로만 분기점을 만들어 낼 수 있으니까 고작 그거 console.log찍는거나 computing 비용의 관점에서는 별거 아니게 만들 수 있는것인가?
                    }
                  } else {
                    // 애초에 연결 끊겼을 당시에 lobby에서 끊긴 경우
                    // NOTE: B
                    if (isUserInRoomInClient) {
                      // IMPT: 그래서 여기도 존나 희박한게, 사용자가 연결이 끊겼을때 로비에서 방으로 입장한 경우.
                      // NOTE: [2]
                      console.log("[SS, FE] -> [Lobby, Room]"); // QQQ: 이거 가능한거야? SS에서 방에서 로비로 쫒아내고 peerMap에서 안지울 수 있나? [Lobby, Lobby] -> [No Peer, Lobby]는 가능해보이는데,
                      // TODO: 혹시 user가 socket연결 안된지 모르고 Lobby에 있다가 방에 입장?... 시발 진짜... 그렇게 못하게 해야지...

                      leaveRoom(false); // 아니다.. 이미 서버에서는 lobby로 나가져있기 때문에 나가달라고 서버에 작업 요청할 필요가 없음. 대신에 FE에서는 나가야지
                      set({
                        forcedRoomExitReason: "tcp-socket-prolonged-disconnect"
                      });
                      // TEST: tcp-socket-prolonged-disconnect 이 SS에서만 발생 -> FE쪽 제한시간이 더 길다.
                      // QQQ: FE쪽 제한시간이 더 길다 -> 이렇게 할 필요가 있나? 뭐 그냥 나는 동일하게 설정했을때 우연에 의해 이렇게 저렇게 모두 가능한 시나리오를 작성하긴 했는데.. 현타온다.
                    } else {
                      // QQQ: Lobby에 존재할 수가 있나?.... -> timeout cb이 실행 안되서 서버에서 정리 안되고 애초에 로비에서 끊기고 그냥 로비에 머물러있을 때 재접된 경우.
                      console.log("[SS, FE] -> [Lobby, Lobby]");
                      // TEST: tcp-socket-prolonged-disconnect 이 양쪽에서 모두 발생
                    }
                  }
                }
                //  WARNING: 여기까지 도달할 수 없어. 왜냐하면 애초에 이 message는 peer가 재연결 된 이후에나 보내질 수 밖에 없기 때문이야.
                // 그리고 완전 connection관련해서는 초기화 할것임.
                //
                // else {
                //   // NOTE: C
                //
                //   //
                //   if (isUserInRoomInClient) {
                //     // NOTE: [2]
                //     leaveRoom(false);
                //     set({
                //       forcedRoomExitReason: "tcp-socket-prolonged-disconnect"
                //     });
                //     console.log("[SS, FE] -> [No Peer, Room]");
                //     // TEST: SS에서는 아예 peer를 제거해버리네.. timeout이 지났을때, 방에서만 내쫒는게 아니라 아예 그냥 peerMap에서 제거했던 것 같은데...
                //     // 그렇다면 위의 B의
                //   } else {
                //     console.log("[SS, FE] -> [No Peer, Lobby]");
                //   }
                // }
              } else {
                console.warn("dead path is reached. Something went wrong.");
              }
            }
          );
        });
        //#endregion

        newSocket.on(
          "PRODUCER_PAUSED",
          ({ producingPeerId }: { producingPeerId: string }) => {
            const correspondingConsumer =
              get().consumersByPeerId.get(producingPeerId);
            correspondingConsumer?.pause();
            if (!correspondingConsumer) return;

            set(
              (state) => {
                const updatedLayers = new Map(state.consumerLayers);
                const existingLayerState =
                  updatedLayers.get(correspondingConsumer.id) ?? {};

                updatedLayers.set(correspondingConsumer.id, {
                  ...existingLayerState,
                  isPausedByProducer: true
                });

                return { consumerLayers: updatedLayers };
              },
              false,
              "room/consumerProducerPaused"
            );
          }
        );

        newSocket.on(
          "PRODUCER_RESUMED",
          ({ producingPeerId }: { producingPeerId: string }) => {
            const correspondingConsumer =
              get().consumersByPeerId.get(producingPeerId);
            if (!correspondingConsumer) return;

            const isLocallyPaused = get().consumerLayers.get(
              correspondingConsumer.id
            )?.isPausedLocallyByViewer;

            if (!isLocallyPaused) {
              correspondingConsumer.resume();
            }

            set(
              (state) => {
                const updatedLayers = new Map(state.consumerLayers);
                const existingLayerState =
                  updatedLayers.get(correspondingConsumer.id) ?? {};

                updatedLayers.set(correspondingConsumer.id, {
                  ...existingLayerState,
                  isPausedByProducer: false
                });

                return { consumerLayers: updatedLayers };
              },
              false,
              "room/consumerProducerResumed"
            );
          }
        );
      } catch (error) {
        console.error("[socketStore] Setup failed", error);
        set({ isSocketConnecting: false }, false, "socket/setupFailed");
      }
    },

    // WARNING: Use this method only when attempting to log out a user. If I want to use this for other use caess,
    // I need to move the logic of cleaning up this peer in the server from the disconnect handler in the signaling gateway
    // to a new event handler, which I am going to need to define.
    disconnect: () => {
      const { socket } = get();
      if (socket) {
        socket.off("PRODUCER_PAUSED");
        socket.off("PRODUCER_RESUMED");
        socket.disconnect();
        set(
          { socket: null, isSocketConnected: false, isSocketConnecting: false },
          false,
          "socket/manualDisconnect"
        );
      }
    },

    // DECISION: 딱히 이거 사용 안할듯?
    informLogout: () => {
      const { socket } = get();
      if (socket !== null) {
        socket.emit(EventNames.LOG_OUT);
      }
    }
  };
};
