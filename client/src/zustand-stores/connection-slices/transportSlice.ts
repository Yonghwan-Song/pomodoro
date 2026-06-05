import { enableMapSet } from "immer";
import type { StateCreator } from "zustand";
import * as EventNames from "../../common/webrtc/eventNames";
import { ConnectionStore, TransportSlice } from "./types";
import { MAX_ICE_RESTART_ATTEMPTS } from "./constants";
import { AckResponse } from "../../common/webrtc/payloadRelated";
import { IceParameters } from "mediasoup-client/types";

enableMapSet();

export const createTransportSlice: StateCreator<
  ConnectionStore,
  [["zustand/devtools", never], ["zustand/immer", never]],
  [],
  TransportSlice
> = (set, get) => {
  return {
    sendTransport: null,
    recvTransport: null,
    isSendTransportReady: false,
    isRecvTransportReady: false,
    isCreatingTransports: false,
    iceRestartAttemptCount: {
      send: 0,
      recv: 0
    },
    timersForIceRestartAttempt: {
      send: null,
      recv: null
    },
    // DECISION: 이거로 뭐 어떻게? 이거 이제 딱히 쓸필요 없는데 그냥 keep해두겠음.
    iceSignalingStatus: {
      send: {
        isIceRestartEmitted: false,
        isAckResponseNotReceived: false // 사실 이 값이 초기화 되는 시점에서는 ,ICE Restart가 당연히 보내지지 않았기 때문에 true도 false도 아닌데, 그냥 편의상 false로 해도 문제가 없다고 보여지기 때문에 그냥 이 값을 할당하겠음. 대부분 그냥 결국 ICE Restart에대한 Ack Res를 받게 되는것이 일반적이니까, 받을거라고 가정하고 그냥 안받았냐?/못받았냐?라는 이 질문에 대해서 false값을 할당한 것임.
      },
      recv: {
        isIceRestartEmitted: false,
        isAckResponseNotReceived: false
      }
    },
    initializeTransportSliceStates: () => {
      set({
        sendTransport: null,
        recvTransport: null,
        isSendTransportReady: false,
        isRecvTransportReady: false,
        isCreatingTransports: false,
        iceRestartAttemptCount: {
          send: 0,
          recv: 0
        },
        timersForIceRestartAttempt: {
          send: null,
          recv: null
        },
        iceSignalingStatus: {
          send: {
            isIceRestartEmitted: false,
            isAckResponseNotReceived: false
          },
          recv: {
            isIceRestartEmitted: false,
            isAckResponseNotReceived: false
          }
        }
      }, false, "transport/resetToInitialValues")
    },
    // NOTE: inside joinRoom
    createTransports: () => {
      const {
        socket,
        device,
        isDeviceLoaded,
        mediaStream,
        isSendTransportReady,
        isRecvTransportReady,
        isCreatingTransports
      } = get();

      if (
        !socket ||
        !device ||
        !isDeviceLoaded ||
        !mediaStream ||
        isCreatingTransports
      )
        return;

      if (isSendTransportReady && isRecvTransportReady) return; // 사실 이 함수 자체는 send와 recv transport을 한번에 생성하도록 하고있는데,
      // 둘중에 하나만 생성되고 하나는 생성 실패하는 경우가 있을지도 모른다는 가정이 지금 여기에 들어가있는듯.... 내가 안했는데..
      // T & T인 경우에만 early return되니까... 하나라도 false라면 아래에서 해당되는 것을 생성해버림.
      // 그렇다면 뭔가 중복생성되는 경우는 없나? -> 없음. 아래에 딱 그 두개의 작업만 이루어진다.

      set({ isCreatingTransports: true });

      // Send Transport
      if (!isSendTransportReady) {
        socket.emit(EventNames.CREATE_SEND_TRANSPORT);
        socket.once(EventNames.SEND_TRANSPORT_CREATED, (options: any) => {
          const transport = device.createSendTransport(options);
          //addTransportHandlers(transport, "send");
          // TODO: 여기에 그냥 직접 on을 호출
          transport.on("connectionstatechange", (state) => {
            console.log(
              "inside send transport's connectionstatechange event handler"
            );
            if (state === "connected") {
              console.log(
                "inside send transport's connectionstatechange - connected"
              );
              // NOTE: 다시 연결 -> 초기화, 0으로 reset, clear "timerForIceRestartAttempt"
              set((state) => {
                state.iceRestartAttemptCount.send = 0;
              });
              const timerId = get().timersForIceRestartAttempt.send;
              if (timerId) {
                clearTimeout(timerId);
                set((state) => {
                  state.timersForIceRestartAttempt.send = null;
                });
              }

              // Reconnect되었을 때, 자동으로 화면 resume이 안되어서 수동으로 닫았다가 다시 시작하는것.
              if (navigator.userAgent.includes("Firefox")) {
                const {
                  producer,
                  socket,
                  mediaStream,
                  isBeingShared,
                  sendTransport
                } = get();
                if (
                  producer &&
                  mediaStream &&
                  isBeingShared &&
                  sendTransport &&
                  socket
                ) {
                  producer.close();
                  socket.emit(EventNames.PRODUCER_CLOSED, {
                    producerId: producer.id
                  });
                  set({ producer: null, isProducerPaused: false });
                  setTimeout(() => get().produce(), 100);
                }
              }
            }
            if (state === "disconnected") {
              console.log(
                "inside send transport's connectionstatechange - disconnected"
              );
            }
            if (state === "failed") {
              console.log(
                "inside send transport's connectionstatechange - failed"
              );
              if (socket !== null && get().isSocketConnected !== false)
                console.log(
                  "Right before attempting to restart ICE inside connectionstatechange handler"
                );
              get().attemptToRestartIce(transport, "send", socket);
            }

            // TODO: 이것들은... 뭔지 알아보고, 필요하면 뭐라도 작성해보기?
            if (state === "new") {
              console.log(
                "inside send transport's connectionstatechange - connected"
              );
            }
            if (state === "connecting") {
              console.log(
                "inside send transport's connectionstatechange - connecting"
              );
            }
          });

          transport.on("connect", ({ dtlsParameters }, cb, err) => {
            get().socket?.emit(
              EventNames.CONNECT_SEND_TRANSPORT,
              { transportId: transport.id, dtlsParameters },
              (ack: AckResponse) => {
                ack.success ? cb() : err(new Error(ack.error));
              }
            );
          });

          transport.on("produce", (params, cb, err) => {
            get().socket?.emit(
              EventNames.PRODUCE,
              {
                transportId: transport.id,
                kind: "video",
                rtpParameters: params.rtpParameters
              },
              (ack: AckResponse<any>) => {
                ack.success
                  ? cb({ id: ack.data.producerId })
                  : err(new Error(ack.error));
              }
            );
          });

          set({ sendTransport: transport, isSendTransportReady: true });
          if (get().isBeingShared) get().produce();
        });
      }

      // Recv Transport
      if (!isRecvTransportReady) {
        socket.emit(EventNames.CREATE_RECV_TRANSPORT);
        socket.once(EventNames.RECV_TRANSPORT_CREATED, (options: any) => {
          const transport = device.createRecvTransport(options);

          transport.on("connectionstatechange", (state) => {
            console.log(
              "inside recv transport's connectionstatechange event handler"
            );

            if (state === "connected") {
              console.log(
                "inside recv transport's connectionstatechange - connected"
              );
              // NOTE: 다시 연결 -> 초기화, 0으로 reset, clear "timerForIceRestartAttempt"
              set((state) => {
                state.iceRestartAttemptCount.recv = 0;
              });
              const timerId = get().timersForIceRestartAttempt.recv;
              if (timerId) {
                clearTimeout(timerId);
                set((state) => {
                  state.timersForIceRestartAttempt.recv = null;
                });
              }
            }
            if (state === "disconnected") {
              console.log(
                "inside recv transport's connectionstatechange - disconnected"
              );
            }
            if (state === "failed") {
              console.log(
                "inside recv transport's connectionstatechange - failed"
              );
              if (socket !== null && get().isSocketConnected !== false)
                console.log(
                  "Right before attempting to restart ICE inside connectionstatechange handler"
                );
              get().attemptToRestartIce(transport, "recv", socket);
            }

            // TODO: 이것들은... 뭔지 알아보고, 필요하면 뭐라도 작성해보기?
            if (state === "new") {
              console.log(
                "inside recv transport's connectionstatechange - connected"
              );
            }
            if (state === "connecting") {
              console.log(
                "inside recv transport's connectionstatechange - connecting"
              );
            }
          });

          transport.on("connect", ({ dtlsParameters }, cb, err) => {
            get().socket?.emit(
              EventNames.CONNECT_RECV_TRANSPORT,
              { transportId: transport.id, dtlsParameters },
              (ack: AckResponse) => {
                ack.success ? cb() : err(new Error(ack.error));
              }
            );
          });

          set({ recvTransport: transport, isRecvTransportReady: true });
          get().consumePendingProducers();
        });
      }
    },
    attemptToRestartIce: (transport, kind, socket) => {
      const { iceRestartAttemptCount, leaveRoom, timersForIceRestartAttempt } =
        get();

      console.log(
        `${kind} transport ${transport.id} is starting ICE RESTART ATTEMPT inside attemptIceRestart()`
      );
      //#region  소켓 조건은 밖으로 빼겠다.
      // if (
      //   !socket ||
      //   isSocketConnected === false || // DECISION: 이제 buffer에 의한 자동 재전송은 포기하는 것.
      //   transport.closed ||
      //   transport.connectionState === "connected"
      // ) {
      //   return;
      // }
      //#endregion
      if (transport.closed || transport.connectionState === "connected") {
        return;
      }

      //
      if (iceRestartAttemptCount[kind] >= MAX_ICE_RESTART_ATTEMPTS) {
        console.log(
          `${kind} transport ice restart attempt count -> ${iceRestartAttemptCount[kind]}`
        );
        set({ forcedRoomExitReason: "transport-recovery-failed" });
        leaveRoom();
        return;
      }

      set((state) => {
        const newVal = state.iceRestartAttemptCount[kind] + 1;
        state.iceRestartAttemptCount[kind] = newVal;
      });

      set((state) => {
        state.iceSignalingStatus[kind].isIceRestartEmitted = true;
      });

      try {
        socket
        /** TODO: It is okay not to rely on this timeout
         * because the edge case will always involve reconnection, which leads to the invocation of the socket.io reconnect callback where we handle a new ice negatitation.
         * But code block looks so complicated. Let's just copy and paste it somewhere else first.
         */.volatile
          .emit(
            EventNames.RESTART_ICE,
            { kind },
            async (ack: AckResponse<{ iceParameters: IceParameters }>) => {
              console.log(
                `AckResponse has been received for ${kind} transport`
              );
              console.log(
                `${kind} transport ${transport.id} RESTART_ICE_ACK_CB is invoked with res ${ack}`
              );
              if (ack.success && ack.data?.iceParameters) {
                // QQQ: ack is undefined -> both in FF and vivaldi
                try {
                  if (
                    transport.closed ||
                    transport.connectionState === "connecting" ||
                    transport.connectionState === "connected" // "new": not started yet. It doesn't mean "freshly connected"
                  ) {
                    // For example, additional RESTART_ICE message, which was actually unnecessary, might have been sent before one arrived because of abrupt socket connection up and down again.
                    // In that case, this callback is supposed to be invoked
                    console.log(
                      "transport has been recovered already, inside RESTART_ICE Ack Callback"
                    );
                  } else {
                    await transport.restartIce({
                      iceParameters: ack.data.iceParameters
                    });

                    set((state) => {
                      state.iceSignalingStatus[kind].isIceRestartEmitted =
                        false;
                      state.iceSignalingStatus[kind].isAckResponseNotReceived =
                        false;
                    });

                    if (timersForIceRestartAttempt[kind]) {
                      clearTimeout(timersForIceRestartAttempt[kind]);
                    }

                    if (navigator.userAgent.includes("Firefox")) {
                      console.log("I am using Firefox");
                      const timerId = setTimeout(() => {
                        if (
                          transport.connectionState !== "connected" &&
                          !transport.closed
                        ) {
                          if (
                            socket !== null &&
                            get().isSocketConnected !== false
                          )
                            console.log(
                              "Right before attempting to restart ICE inside attemptToRestartIce itself (for FF)"
                            );
                          get().attemptToRestartIce(transport, kind, socket);
                        }
                      }, 10000); // 최초에 한번 호출되는 것은 무조건 socket연결성을 무시하고 호출된다. 그게 맞아. 다만 이 함수 내부에서 판단해주는거지.

                      set((state) => {
                        state.timersForIceRestartAttempt[kind] = timerId;
                      });
                    }
                  }
                } catch (e) {
                  console.error(
                    "restartIce function call with the new iceParameters failed",
                    e
                  );
                }
              } else if (!ack.success) {
                console.warn("ack error", ack.error);
              }
            }
          );

        console.log(`RESTART_ICE has been sent for ${kind} transport`);
      } catch (error) {
        console.warn("an error occurred while emitting RESTART_ICE", error);
        // QQQ: 여기에 있다고 해서 emit이 안보내졌다고 보장할 수 있나? 보내고나서 문제가 생긴 그런경우도 있을 수 있잖아...
        // 그런데 그냥 그런경우는 없다고 생각해야겠다.
        set((state) => {
          state.iceSignalingStatus[kind].isIceRestartEmitted = false;
        });
      }
    }
  };
};
