import type { StateCreator } from "zustand";
import { io } from "socket.io-client";
import { auth } from "../../firebase";
import { BASE_URL } from "../../constants";
import { EXPLICIT_SOCKET_DISCONNECT_REASONS } from "./constants";
import type { ConnectionStore, SocketSlice } from "./types";
import { enableMapSet } from "immer";
import * as EventNames from "../../common/webrtc/eventNames";
enableMapSet();

export const createSocketSlice: StateCreator<
  ConnectionStore,
  [["zustand/devtools", never], ["zustand/immer", never]],
  [],
  SocketSlice
> = (set, get) => ({
  socket: null,
  isSocketConnected: false,
  isSocketConnecting: false,
  socketResetTimer: null,
  initializeSocketSliceStates: () => {
    set({
      socket: null,
      isSocketConnected: false,
      isSocketConnecting: false,
      socketResetTimer: null,
    }, false, "socket/resetToInitialValues")
  },
  // GroupStudy Component에서 side effect
  connect: async () => {
    const { socket, isSocketConnecting: isConnecting } = get();
    // connect()는 비동기 함수이므로 여러 컴포넌트가 동시에 호출해도 소켓이 중복 생성되지 않아야 한다.
    if (socket?.connected || isConnecting) return;

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
      });

      set({ socket: newSocket }, false, "socket/assignedNew");

      newSocket.on("connect", () => {
        console.log("the id of the socket just connected", newSocket.id);
        set(
          { isSocketConnected: true, isSocketConnecting: false },
          false,
          "socket/connected"
        );
      });

      //#region Origianl on socket disconnect
      // newSocket.on("disconnect", (reason) => {
      //   console.log("socket disconnection reason -> ", reason);
      //   if (EXPLICIT_SOCKET_DISCONNECT_REASONS.has(reason)) {
      //     get().leaveRoom(); // leaveRoom does not change socket states. Then, why did you.. call it here?...
      //     // Go to the definition of EXPLICIT_SOCKET_DISCONNECT_REASONS. You will find the answer
      //   }

      //   set({ isSocketConnected: false }, false, "socket/disconnected");
      // });
      //#endregion

      //#region New on socket disconnection -> 30분 뒤에 방에서 나가지도록
      newSocket.on("disconnect", (reason) => {
        const { leaveRoom, isUserInRoom } = get();
        console.log("socket disconnection reason -> ", reason);
        if (EXPLICIT_SOCKET_DISCONNECT_REASONS.has(reason)) {
          leaveRoom();
          set({ isSocketConnected: false }, false, "socket/disconnected");
        } else {
          //! ping timeout, transport close, and transport error -> automatic reconnection
          const resetTimer = setTimeout(
            () => {
              if (isUserInRoom) {
                leaveRoom();
                set({ forcedRoomExitReason: "tcp-socket-prolonged-disconnect" })
              }
            },
            // 3 * 60 * 1000
            30 * 60 * 1000
          );

          set(
            { socketResetTimer: resetTimer },
            false,
            "socket/assign-reset-timer"
          );
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

      newSocket.io.on("reconnect", () => {
        const {
          attemptToRestartIce,
          sendTransport,
          recvTransport,
          isUserInRoom
          // socketResetTimer
        } = get();

        // if (socketResetTimer !== null) {
        //   clearTimeout(socketResetTimer);
        //   set(
        //     { socketResetTimer: null },
        //     false,
        //     "socket/initialize-reset-timer"
        //   );
        // }

        //#region Scribble
        // 1. firefox 방어가 되는지 확인해야함. 아니면 시발 firefox쓰지 말라고해버리기...
        // 2. 경우의 수 rope들 다시 잡아내기 (가능한 사건들의 줄기?) <-- 이거를 어떠헥 다시 하지.....................
        // 3. Then, what should I do about the fucking edge case where socket.emit() is called and ack res is not received?
        // What happens in this design?
        // The fact that an ack response is not received means the socket connection was down as soon as the socket.emit() was called.
        // That means this reconnect handler is going to be called definetly
        //#endregion

        console.log(
          "isUserInRoom, sendTransport, recvTransport",
          isUserInRoom,
          sendTransport,
          recvTransport
        );
        // QQQ: 이쪽에서 뭔가 불필요하게 ICE Restart를 하는 경우가 생기는듯? 개발하다가 server나 client 재시작하는 과정에서 생기는 것인지 잘 모르겠음.
        // docker 도입하고나서 테스트 해보기
        if (isUserInRoom) {
          // NOTE: transports null check prevents unnecessary ICE (re)negotiation for a user who was only in the lobby, not in a room.
          console.log(
            "Right before attempting to restart ICE inside reconnect handler"
          );
          sendTransport !== null &&
            attemptToRestartIce(sendTransport, "send", newSocket);
          recvTransport !== null &&
            attemptToRestartIce(recvTransport, "recv", newSocket);
        }
      });

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
});
