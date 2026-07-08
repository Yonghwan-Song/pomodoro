import { enableMapSet } from 'immer';
import type { StateCreator } from 'zustand';
import * as EventNames from '../../common/webrtc/eventNames';
import { ConnectionStore, TransportSlice } from './types';
import { MAX_ICE_RESTART_ATTEMPTS } from './constants';
import { AckResponse } from '../../common/webrtc/payloadRelated';
import { IceParameters } from 'mediasoup-client/types';

enableMapSet();

export const createTransportSlice: StateCreator<
  ConnectionStore,
  [['zustand/devtools', never], ['zustand/immer', never]],
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
      recv: 0,
    },
    timersForIceRestartAttempt: {
      send: null,
      recv: null,
    },
    // DECISION: 이거로 뭐 어떻게? 이거 이제 딱히 쓸필요 없는데 그냥 keep해두겠음.
    iceSignalingStatus: {
      send: {
        isIceRestartEmitted: false,
        isAckResponseNotReceived: false, // 사실 이 값이 초기화 되는 시점에서는 ,ICE Restart가 당연히 보내지지 않았기 때문에 true도 false도 아닌데, 그냥 편의상 false로 해도 문제가 없다고 보여지기 때문에 그냥 이 값을 할당하겠음. 대부분 그냥 결국 ICE Restart에대한 Ack Res를 받게 되는것이 일반적이니까, 받을거라고 가정하고 그냥 안받았냐?/못받았냐?라는 이 질문에 대해서 false값을 할당한 것임.
      },
      recv: {
        isIceRestartEmitted: false,
        isAckResponseNotReceived: false,
      },
    },
    initializeTransportSliceStates: () => {
      const { sendTransport, recvTransport } = get(); // TODO: transport close하고 초기화 해야하는거 아닌가? device도 그렇고 다른 webRTC와 관계있는 객체들은 다 close하는 방법이 있지 않나

      // 2. 리스너 제거 + close, send/recv 둘 다
      [sendTransport, recvTransport].forEach((transport) => {
        if (!transport) return;
        transport.removeAllListeners();
        if (!transport.closed) {
          transport.close();
        }
      });

      set(
        {
          sendTransport: null,
          recvTransport: null,
          isSendTransportReady: false,
          isRecvTransportReady: false,
          isCreatingTransports: false,
          iceRestartAttemptCount: {
            send: 0,
            recv: 0,
          },
          timersForIceRestartAttempt: {
            send: null,
            recv: null,
          },
          iceSignalingStatus: {
            send: {
              isIceRestartEmitted: false,
              isAckResponseNotReceived: false,
            },
            recv: {
              isIceRestartEmitted: false,
              isAckResponseNotReceived: false,
            },
          },
        },
        false,
        'transport/resetToInitialValues',
      );
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
        isCreatingTransports,
      } = get();

      //#region Early Fucking Returns
      if (
        !socket ||
        !device ||
        !isDeviceLoaded ||
        !mediaStream ||
        isCreatingTransports
      ) {
        console.log(
          `createTransports() is early returned due to one of these values`,
        );
        console.log('!socket', !socket);
        console.log('!device', !device);
        console.log('!isDeviceLoaded', !isDeviceLoaded);
        console.log('!mediaStream', !mediaStream);
        // console.log('isCreatingTransports', isCreatingTransports) // 여기서 걸려라~~
        return;
      }

      if (isSendTransportReady && isRecvTransportReady) {
        console.log(
          `createTransports() is early returned due to one of these values`,
        );
        console.log('isSendTransportReady', isSendTransportReady);
        console.log('isRecvTransportReady', isRecvTransportReady);
        return;
      }

      // 사실 이 함수 자체는 send와 recv transport을 한번에 생성하도록 하고있는데,
      // 둘중에 하나만 생성되고 하나는 생성 실패하는 경우가 있을지도 모른다는 가정이 지금 여기에 들어가있는듯.... 내가 안했는데..
      // T & T인 경우에만 early return되니까... 하나라도 false라면 아래에서 해당되는 것을 생성해버림.
      // 그렇다면 뭔가 중복생성되는 경우는 없나? -> 없음. 아래에 딱 그 두개의 작업만 이루어진다.

      set({ isCreatingTransports: true }); // 언제 false로 돌려놓지?... 그리고 왜 필요한지도 잘 모르겠다. 어차피 이 함수는 한번만 호출되는데?

      //#endregion

      // Send Transport
      if (!isSendTransportReady) {
        socket.emit(EventNames.CREATE_SEND_TRANSPORT);
        // QQQ: 왜 once? 왜 안적어놨어? on으로 바꿔도 되는지 모르잖아......................................................
        // 존나 많이 호출되는데 왜그런지 모르겠음. 걍 once로 해보고 다시 로그 찍어보겠음
        // TODO: 이전에 isCreatingTransports 때문에 early return되었다고 로그가 떴는데도 씨이발 아래의 once함수의 cb의 console.log가 실행되었다. remove를 해줘야한다는거야?
        // disconnected일때 off를 해저야하나 이런게 아니라 우리의 의도에 따라 해줘야하는거라고 이 씨이...발아.. 방에서 나갔다가 다시 들어올 때마다 socket.once를 해주면 그게 존나 중복되니까 문제가 생기지 않을까?
        // 그게 직접적인 이번 에러의 원인이 아닐지라도 entropy를 줄이라며.. 결국 이것도 joinRoom의 과정에 포함되니까 leaveRoom하면 off할꺼야 그리고 적어 off한다고
        socket.once(EventNames.SEND_TRANSPORT_CREATED, (options: any) => {
          console.log(
            'inside socket.on(EventNames.SEND_TRANSPORT_CREATED, options',
            options,
          );

          const transport = device.createSendTransport(options);
          //addTransportHandlers(transport, "send");
          // TODO: 여기에 그냥 직접 on을 호출
          transport.on('connectionstatechange', (state) => {
            console.log(
              "inside send transport's connectionstatechange event handler",
            );
            if (state === 'connected') {
              console.log(
                "inside send transport's connectionstatechange - connected",
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
              if (navigator.userAgent.includes('Firefox')) {
                const {
                  producer,
                  socket,
                  mediaStream,
                  isBeingShared,
                  sendTransport,
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
                    producerId: producer.id,
                  });
                  set({ producer: null, isProducerPaused: false });
                  setTimeout(() => get().produce(), 100);
                }
              }
            }
            if (state === 'disconnected') {
              console.log(
                "inside send transport's connectionstatechange - disconnected",
              );
            }
            if (state === 'failed') {
              console.log(
                "inside send transport's connectionstatechange - failed",
              );

              // if (socket !== null && get().isSocketConnected !== false)
              console.log(
                'Right before attempting to restart ICE inside connectionstatechange handler',
              );

              get().attemptToRestartIceWithGuards(transport, 'send', socket); // IMPT: 내부에서 socket과 transport를 이용해서 guard한다.
            }

            // TODO: 이것들은... 뭔지 알아보고, 필요하면 뭐라도 작성해보기?
            if (state === 'new') {
              console.log(
                "inside send transport's connectionstatechange - connected",
              );
            }
            if (state === 'connecting') {
              console.log(
                "inside send transport's connectionstatechange - connecting",
              );
            }
          });

          transport.on('connect', ({ dtlsParameters }, cb, err) => {
            get().socket?.emit(
              EventNames.CONNECT_SEND_TRANSPORT,
              { transportId: transport.id, dtlsParameters },
              (ack: AckResponse) => {
                ack.success ? cb() : err(new Error(ack.error));
              },
            );
          });

          transport.on('produce', (params, cb, err) => {
            get().socket?.emit(
              EventNames.PRODUCE,
              {
                transportId: transport.id,
                kind: 'video',
                rtpParameters: params.rtpParameters,
              },
              (ack: AckResponse<any>) => {
                ack.success
                  ? cb({ id: ack.data.producerId })
                  : err(new Error(ack.error)); // ERROR: Produce failed Error: Send transport mismatch at Socket2.<anonymous> <-- 이딴것도 뜬다 씨이발..
              },
            );
          });

          transport.observer.on('close', () => {
            console.log(`send transport[${transport.id}] is closed`);
          });

          transport.observer.on('newproducer', (producer) => {
            console.log('new producer created [id:%s]', producer.id);
          });

          set({ sendTransport: transport, isSendTransportReady: true });
          if (get().isBeingShared) get().produce();
        });
      }

      // Recv Transport
      console.log('isRecvTransportReady', isRecvTransportReady);
      if (!isRecvTransportReady) {
        socket.emit(EventNames.CREATE_RECV_TRANSPORT);
        // QQQ: 왜 once? 왜 안적어놨어?
        socket.once(EventNames.RECV_TRANSPORT_CREATED, (options: any) => {
          console.log(
            'inside socket.on(EventNames.RECV_TRANSPORT_CREATED, options',
            options,
          );
          const transport = device.createRecvTransport(options);

          transport.on('connectionstatechange', (state) => {
            console.log(
              "inside recv transport's connectionstatechange event handler",
            );

            if (state === 'connected') {
              console.log(
                "inside recv transport's connectionstatechange - connected",
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
            if (state === 'disconnected') {
              console.log(
                "inside recv transport's connectionstatechange - disconnected",
              );
            }
            if (state === 'failed') {
              console.log(
                "inside recv transport's connectionstatechange - failed",
              );

              // if (socket !== null && get().isSocketConnected !== false)
              console.log(
                'Right before attempting to restart ICE inside connectionstatechange handler',
              );

              get().attemptToRestartIceWithGuards(transport, 'recv', socket);
            }

            // TODO: 이것들은... 뭔지 알아보고, 필요하면 뭐라도 작성해보기?
            if (state === 'new') {
              console.log(
                "inside recv transport's connectionstatechange - connected",
              );
            }
            if (state === 'connecting') {
              console.log(
                "inside recv transport's connectionstatechange - connecting",
              );
            }
          });

          transport.on('connect', ({ dtlsParameters }, cb, err) => {
            console.log(
              "inside transport's connect event listener, dtlsParameters",
              dtlsParameters,
            );
            get().socket?.emit(
              EventNames.CONNECT_RECV_TRANSPORT,
              { transportId: transport.id, dtlsParameters },
              (ack: AckResponse) => {
                ack.success ? cb() : err(new Error(ack.error));
              },
            );
          });

          transport.observer.on('close', () => {
            console.log(`recv transport[${transport.id}] is closed`);
          });

          transport.observer.on('newconsumer', (consumer) => {
            console.log('new consumer created [id:%s]', consumer.id);
          });

          set({ recvTransport: transport, isRecvTransportReady: true });
          get().consumePendingProducers();
        });
      }
    },

    attemptToRestartIceWithGuards: (transport, kind, socket) => {
      const { iceRestartAttemptCount, leaveRoom, timersForIceRestartAttempt } =
        get();

      console.log(
        `${kind} transport ${transport.id} is starting ICE RESTART ATTEMPT inside attemptIceRestart()`,
      );

      //#region Early Returns - transport, socket, max attempts
      if (socket === null || !socket.connected) {
        console.log(
          `socket is not ready for ice restart socket -> ${socket}, socket.connected -> ${socket.connected}`,
        );
        return;
      }

      // QQQ: connecting은 무엇이고, guard해야함?
      // NOTE: transport.closed === true 는 발생하지 않는다 왜냐하면, 지금 commit시점에서 유일하게 transport.close()를 호출하는 경우는 leaveRoom에서인데, 애초에 close하고 바로 transport state에 null값을 할당하고 있음. 그러니까 다시 말하자면, transport을 재활용하고 있지 않기 때문.
      if (transport.closed || transport.connectionState === 'connected') {
        console.log(
          `[${kind}] attemptIceRestart() is early returned due to the following values`,
        );
        console.log(`[${kind}] transport.closed`, transport.closed);
        console.log(
          `[${kind}] transport.connectionState`,
          transport.connectionState,
        );

        return;
      }

      console.log(
        `current iceRestartAttemptCount[${kind}] - `,
        iceRestartAttemptCount[kind],
      );
      if (iceRestartAttemptCount[kind] >= MAX_ICE_RESTART_ATTEMPTS) {
        console.log(
          `${kind} transport ice restart attempt count -> ${iceRestartAttemptCount[kind]}`,
        );
        set({ forcedRoomExitReason: 'transport-recovery-failed' });
        leaveRoom();
        return;
      }
      //#endregion

      set((state) => {
        const newVal = state.iceRestartAttemptCount[kind] + 1;
        state.iceRestartAttemptCount[kind] = newVal;
      });

      set((state) => {
        state.iceSignalingStatus[kind].isIceRestartEmitted = true;
      });

      try {
        socket /** TODO: It is okay not to rely on this timeout
         * because the edge case will always involve reconnection, which leads to the invocation of the socket.io reconnect callback where we handle a new ice negatitation.
         * But code block looks so complicated. Let's just copy and paste it somewhere else first.
         */.volatile
          .emit(
            EventNames.RESTART_ICE,
            { kind },
            async (ack: AckResponse<{ iceParameters: IceParameters }>) => {
              console.log(`[${kind}] transport AckResponse has been received.`);
              console.log(
                `[${kind}] transport ${transport.id} RESTART_ICE_ACK_CB is invoked with res ${ack}`,
              );

              if (ack.success && ack.data?.iceParameters) {
                // QQQ: ack is undefined -> both in FF and vivaldi
                try {
                  if (
                    transport.closed ||
                    transport.connectionState === 'connecting' ||
                    transport.connectionState === 'connected' // "new": not started yet. It doesn't mean "freshly connected"
                  ) {
                    // For example, additional RESTART_ICE message, which was actually unnecessary, might have been sent before one arrived because of abrupt socket connection up and down again.
                    // In that case, this callback is supposed to be invoked
                    console.log(
                      `[${kind}] transport has been recovered already, inside RESTART_ICE Ack Callback`,
                    );
                  } else {
                    console.log(`[${kind}] about to call restartIce`);
                    await transport.restartIce({
                      iceParameters: ack.data.iceParameters,
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

                    if (navigator.userAgent.includes('Firefox')) {
                      console.log('I am using Firefox');
                      const timerId = setTimeout(() => {
                        if (
                          transport.connectionState !== 'connected' &&
                          !transport.closed
                        ) {
                          if (
                            socket !== null &&
                            get().isSocketConnected !== false
                          )
                            console.log(
                              `[${kind}] Right before attempting to restart ICE inside attemptToRestartIce itself (for FF)`,
                            );
                          get().attemptToRestartIceWithGuards(
                            transport,
                            kind,
                            socket,
                          );
                        }
                      }, 10000); // 최초에 한번 호출되는 것은 무조건 socket연결성을 무시하고 호출된다. 그게 맞아. 다만 이 함수 내부에서 판단해주는거지.

                      set((state) => {
                        state.timersForIceRestartAttempt[kind] = timerId;
                      });
                    }
                  }
                } catch (e) {
                  console.error(
                    `[${kind}] restartIce function call with the new iceParameters failed`,
                    e,
                  );
                }
              } else if (!ack.success) {
                console.warn(`[${kind}] ack error`, ack.error);
              }
            },
          );

        console.log(`RESTART_ICE has been sent for ${kind} transport`);
      } catch (error) {
        console.warn('an error occurred while emitting RESTART_ICE', error);
        // QQQ: 여기에 있다고 해서 emit이 안보내졌다고 보장할 수 있나? 보내고나서 문제가 생긴 그런경우도 있을 수 있잖아...
        // 그런데 그냥 그런경우는 없다고 생각해야겠다.
        set((state) => {
          state.iceSignalingStatus[kind].isIceRestartEmitted = false;
        });
      }
      //#endregion
    },
  };
};
