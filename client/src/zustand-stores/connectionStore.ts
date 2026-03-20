import { boundedPomoInfoStore } from "./pomoInfoStoreUsingSlice";
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
  SocketID
} from "../common/webrtc/payloadRelated";
import type { ProducerInfo } from "../Pages/GroupStudy/typeDef";
import type { ChatMessageData } from "../Pages/GroupStudy/components/chat/ChatMessage";

/**
 * Socket + Device + Media + Room을 전역 상태로 관리하는 Zustand store.
 *
 * 페이지 이동해도 socket 연결, device, media stream, room 참여 상태가 유지됨.
 * disconnect()와 leaveRoom()은 명시적으로 호출할 때만 실행됨.
 *
 * mediasoup produce flow, transport "produce" event contract, and
 * callback({ id }) signaling details:
 * @see ./mediasoup-produce-flow.md
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

  // [Real-time Duration Sync]
  // 방에 있는 다른 참가자들의 오늘 총 집중 시간(todayTotalDuration)을 관리하는 Map입니다.
  peerTodayTotalDurations: Map<string, number>; // key: peerId(Socket ID), value: duration(minutes)

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

type SimulcastPolicyInput = Pick<
  MediaTrackSettings, // https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackSettings
  "width" | "height" | "frameRate"
>;

const VERY_LOW_RESOLUTION_MAX_BITRATE = 250_000;
const SD_MAX_BITRATE_15FPS = 450_000;
const SD_MAX_BITRATE_30FPS = 600_000;
const QHD_MAX_BITRATE_15FPS = 800_000;
const QHD_MAX_BITRATE_30FPS = 1_000_000;
const HD_MAX_BITRATE_15FPS = 1_200_000;
const HD_MAX_BITRATE_30FPS = 1_500_000;
const FULL_HD_MAX_BITRATE_15FPS = 2_500_000;
const FULL_HD_MAX_BITRATE_30FPS = 3_000_000;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeFrameRate(frameRate?: number) {
  // `== null`은 null과 undefined를 함께 체크하는 의도적인 패턴이다.
  // 실제 fps 값이 없거나 비정상이면 정책 기본값인 30fps로 fallback 한다.
  if (frameRate == null || !Number.isFinite(frameRate)) return 30;
  return clamp(Math.round(frameRate), 10, 30);
}

function getHighLayerMaxBitrate(height: number, frameRate: number) {
  // NOTE:이 함수는 "현재 카메라가 실제로 잡힌 high layer 해상도"에 대해
  // 어느 정도 bitrate cap을 줄지 정하는 정책표다.
  // 여기서 반환하는 값은 목표 품질값이 아니라 upper bound(cap)다.
  // low/mid layer는 이 high layer 값을 비율로 나눠서 파생한다.

  // 1080p 이상 high layer
  if (height >= 1080) {
    return frameRate >= 30
      ? FULL_HD_MAX_BITRATE_30FPS
      : FULL_HD_MAX_BITRATE_15FPS;
  }

  // 720p 이상 high layer
  if (height >= 720) {
    return frameRate >= 30 ? HD_MAX_BITRATE_30FPS : HD_MAX_BITRATE_15FPS;
  }

  // 540p 이상 high layer
  if (height >= 540) {
    return frameRate >= 30 ? QHD_MAX_BITRATE_30FPS : QHD_MAX_BITRATE_15FPS;
  }

  // 360p 이상 high layer
  if (height >= 360) {
    return frameRate >= 30 ? SD_MAX_BITRATE_30FPS : SD_MAX_BITRATE_15FPS;
  }

  // 360p 미만이면 very low resolution fallback으로 본다.
  // 이 경우 high layer라고 해도 실제 픽셀 수가 작으므로 cap을 보수적으로 둔다.
  return VERY_LOW_RESOLUTION_MAX_BITRATE;
}

function createSimulcastEncodingsFromTrack(
  settings: SimulcastPolicyInput
): mediasoupTypes.RtpEncodingParameters[] {
  const height = settings.height && settings.height > 0 ? settings.height : 720;
  const frameRate = normalizeFrameRate(settings.frameRate);
  const highMaxBitrate = getHighLayerMaxBitrate(height, frameRate);

  // DESIGN: 실제 high layer 해상도(width/height)와 원본 fps는 현재 track settings가 정한다.
  // 이 함수는 그 실제 값을 바탕으로 simulcast 각 layer에 정책값을 부여한다.
  // 해상도는 scaleResolutionDownBy로 high layer 대비 축소하고,
  // maxBitrate/maxFramerate는 high layer 기준 cap을 비율과 상한으로 나눠서 줄여나간다.
  // 나름대로의 비율로 줄여나감. DownBy는 그냥... 원래 원본 해상도에 나누기값으로 하는것으로 알고있음.
  // 나머지는 그냥... 모르겠어 저렇게 보통 줄여나간데 ... 단순하게 계산된게 아닌듯. 영향을 주고받는 인자가 굉장히 많은듯.
  return [
    {
      scaleResolutionDownBy: 4,
      maxBitrate: Math.round(highMaxBitrate * 0.12),
      maxFramerate: Math.min(frameRate, 15)
    },
    {
      scaleResolutionDownBy: 2,
      maxBitrate: Math.round(highMaxBitrate * 0.4),
      maxFramerate: Math.min(frameRate, 30)
    },
    {
      scaleResolutionDownBy: 1,
      maxBitrate: highMaxBitrate,
      maxFramerate: Math.min(frameRate, 30)
    }
  ];
}

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
      peerTodayTotalDurations: new Map(),
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
            reconnectionAttempts: 5
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
          audio: false
        }
      ) => {
        const { stream } = get();
        if (stream) return stream;

        try {
          const newStream = await navigator.mediaDevices.getUserMedia(
            trackOption
          );
          console.log("[socketStore] obtainStream SUCCESS", newStream.id);

          const initialVideoTrack = newStream.getVideoTracks()[0];
          if (initialVideoTrack) {
            console.log(
              "[socketStore] obtained video track settings:",
              initialVideoTrack.getSettings()
            );
          }

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

      // NOTE: 1. JOIN_ROOM을 emit해서 방에 입장함을 알리고, 2. 방에 입장했다면 listen해야할 다른 event들을 listen한다.
      // DESIGN: todayTotalDuration의 관점에서, 내가 방에 입장하면
      // 1) 내 todayTotalDuration을 participants에게 알려야 하고,
      // 2) (내가 enter하는 시점에 이미 방에 참가하고 있던)participants의 todayTotalDuration를 내가 인식해야함.
      // 3) 그리고 마지막으로, participants의 todayTotalDuration이 update되면 그것을 내 U.I에 반영해야한다.
      // ----------------------------------------------------------------------------------------------------
      // 1) `JOIN_ROOM` 이벤트를 emit할때 payload에 포함시킴. -> 이 데이터를 다시 `ROOM_PEER_JOINED` 이벤트를 groupStudyManagementService의 joinRoom함수에서 참가자들에게 broadcast한다.
      // 2) `JOIN_ROOM` event emit의 AckResponse의 peers array에 포함된다.
      // 3) `ROOM_PEER_JOINED` 이벤트를 listen해서 payload를 받아 global state을 update한다.
      joinRoom: (roomId, onError) => {
        const { socket, isRoomJoined } = get();
        if (!socket || isRoomJoined) return;

        // JOIN_ROOM 요청 (방에 입장할 때 현재 내 총 집중 시간도 같이 보냅니다)
        const todayTotalDuration =
          boundedPomoInfoStore.getState().todayTotalDuration;

        socket.emit(
          EventNames.JOIN_ROOM,
          { roomId, todayTotalDuration },
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
              peers: { id: string; todayTotalDuration: number }[]; // NOTE: 내가 입장하니까 이미 참여하고 있던 사람들의 정보를 받아오는 것.
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
                  isBeingConsumed: false
                })
              );

              const nicknames = new Map<string, string>();
              response.data.existingProducers.forEach((p) => {
                if (p.displayName) nicknames.set(p.socketId, p.displayName);
              });

              const durations = new Map<string, number>();
              response.data.peers.forEach((peer) => {
                durations.set(peer.id, peer.todayTotalDuration);
              });

              set(
                {
                  isRoomJoined: true,
                  currentRoomId: roomId,
                  producersList: existingProducers,
                  peerNicknames: nicknames,
                  peerTodayTotalDurations: durations
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
                  isBeingConsumed: false
                }));
                const updatedNicknames = new Map(state.peerNicknames);
                payloads.forEach((p) => {
                  if (p.displayName)
                    updatedNicknames.set(p.socketId, p.displayName);
                });
                return {
                  producersList: [...state.producersList, ...newProducers],
                  peerNicknames: updatedNicknames
                };
              },
              false,
              "room/newProducers"
            );

            // 새 producer가 왔으니 consume 시도
            consumePendingProducers();
          }
        );

        // DESIGN: 새로운 peer가 room에 입장하는 event를 내가 room에 입장했다면 구독하고 있어야함.
        // 이전에는 그냥 peerId 로그만 찍는 목적이였는데, 지금은 유의미한 todayTotalDuration라는 값을 전달받아서 peerTodayTotalDurations state을 update한다.
        socket.on(
          EventNames.ROOM_PEER_JOINED,
          (payload: { peerId: string; todayTotalDuration: number }) => {
            console.log("[socketStore] New peer joined:", payload);
            set(
              (state) => {
                const updatedDurations = new Map(state.peerTodayTotalDurations);
                updatedDurations.set(
                  payload.peerId,
                  payload.todayTotalDuration
                );
                return { peerTodayTotalDurations: updatedDurations };
              },
              false,
              "room/peerJoined"
            );
          }
        );

        // [Real-time Duration Sync]
        // 같은 방에 있는 다른 누군가의 집중 시간이 업데이트되었을 때 (뽀모도로 완료 시)
        // [동시성 처리(Concurrency)에 대하여]
        // 여러 peer가 동시에 duration을 업데이트하더라도 상태가 꼬이거나 충돌하지 않습니다.
        // 상세한 아키텍처 설명은 아래 문서를 참고하세요:
        // @see /docs/WIL/concurrency-and-event-loop.md
        // 1. 서버: Node.js의 싱글 스레드 이벤트 루프가 네트워크 패킷을 도착한 순서대로 큐에 넣고 순차적으로(직렬로) 브로드캐스트합니다.
        // 2. 클라이언트: 브라우저 역시 싱글 스레드 기반이므로 이벤트를 순차적으로 수신하며,
        //    Zustand의 콜백 함수((state) => ...) 패턴이 항상 이전 이벤트의 처리가 끝난 최신 상태를 보장하므로 Race condition이 발생하지 않습니다.
        socket.on(
          EventNames.PEER_TODAY_TOTAL_DURATION_UPDATED,
          (payload: { peerId: string; todayTotalDuration: number }) => {
            console.log("[socketStore] Peer duration updated:", payload);
            set(
              (state) => {
                const updatedDurations = new Map(state.peerTodayTotalDurations);
                updatedDurations.set(
                  payload.peerId,
                  payload.todayTotalDuration
                );
                return { peerTodayTotalDurations: updatedDurations };
              },
              false,
              "room/updatePeerDuration"
            );
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
                    remoteStreams: newRemoteStreams
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
                )
              },
              false,
              "room/producerRemoved"
            );
          }
        );

        // 누군가 방을 완전히 나갔을 때 발생하는 이벤트입니다.
        // 비디오 스트림 정리는 PRODUCER_CLOSED에서 처리하지만,
        // 여기서는 해당 유저의 메타데이터(집중 시간, 닉네임 등)를 정리하여 메모리 누수와 UI 잔상을 방지합니다.
        socket.on(EventNames.ROOM_PEER_LEFT, (payload: { peerId: string }) => {
          console.log("[socketStore] Peer left room:", payload.peerId);
          set(
            (state) => {
              const updatedDurations = new Map(state.peerTodayTotalDurations);
              updatedDurations.delete(payload.peerId);

              const updatedNicknames = new Map(state.peerNicknames);
              updatedNicknames.delete(payload.peerId);

              return {
                peerTodayTotalDurations: updatedDurations,
                peerNicknames: updatedNicknames
              };
            },
            false,
            "room/peerLeft"
          );
        });

        // 채팅 메시지 수신
        socket.on(EventNames.CHAT_MESSAGE, (payload: ChatMessageData) => {
          console.log("[socketStore] Incoming chat message:", payload);
          set(
            (state) => ({ chatMessages: [...state.chatMessages, payload] }),
            false,
            "room/chatMessageReceived"
          );
        });
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
        socket?.off(EventNames.PEER_TODAY_TOTAL_DURATION_UPDATED);
        socket?.off(EventNames.ROOM_PEER_LEFT);

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
            peerTodayTotalDurations: new Map(),
            chatMessages: []
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
          isCreatingTransports
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

                //  DESIGN: 아래 NOTE에 동일한 내용 한글로 설명되어있음.
                // - mediasoup-client needs callback({ id }) to continue its internal produce sequence
                // - that server-side producerId becomes the id associated with the Producer resolved from await sendTransport.produce(...)
                // - without that callback, the produce() Promise cannot complete normally
                transport.on("produce", (parameters, callback, errback) => {
                  // mediasoup transport "produce" 이벤트: transport.produce()함수가 시작되고 그것이 종료 되기 전에 이 이벤트가 dispatch되어 ev handler가 작동.
                  // Parameters -> RtpSendParameters (https://mediasoup.org/documentation/v3/mediasoup/rtp-parameters-and-capabilities/#RtpSendParameters)
                  //               => 조상 - RtpParameters (https://mediasoup.org/documentation/v3/mediasoup/rtp-parameters-and-capabilities/#RtpParameters)
                  console.log(
                    "[socketStore] mediasoup transport's Produce event received:",
                    parameters
                  );
                  const sock = get().socket;
                  if (!sock) return errback(new Error("No socket"));

                  sock.emit(
                    EventNames.PRODUCE,
                    {
                      transportId: transport.id,
                      kind: "video",
                      rtpParameters: parameters.rtpParameters
                    },
                    (ackResponse: AckResponse<{ producerId: string }>) => {
                      if (ackResponse.success && ackResponse.data) {
                        console.log(
                          "[socketStore] Produce success",
                          ackResponse.data
                        );
                        // NOTE: mediasoup-client는 transport "produce" 이벤트의 callback({ id })
                        // 으로 "서버가 만든 Producer의 id"를 전달받아야 내부 produce 절차를
                        // 계속 진행할 수 있다. 이 id가 나중에 await sendTransport.produce()
                        // 가 resolve한 Producer 인스턴스의 id로 연결된다.
                        // 즉 callback이 호출되어야 sendTransport.produce()의 Promise가
                        // 정상 완료될 수 있다.
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

      // start sharing button을 눌러야지 비로소 시작됨. 방에 들어가자마자 시작되는것은 아님.
      produce: async () => {
        const { stream, isSharing, sendTransport, producer } = get();
        if (!stream || !isSharing || !sendTransport || producer) return;

        const videoTrack = stream.getVideoTracks()[0];
        if (!videoTrack) return;

        try {
          const videoTrackSettings = videoTrack.getSettings();
          const dynamicEncodings =
            createSimulcastEncodingsFromTrack(videoTrackSettings);

          if (import.meta.env.DEV) {
            console.log(
              "[socketStore] producing with video track settings:",
              videoTrackSettings
            );
            console.log(
              "[socketStore] computed simulcast encodings:",
              dynamicEncodings
            );
          }

          // 여기에서 arg로 제공되는 값들을 기반으로 transport.produce ev의 handler함수의 중
          // parameters: { kind: mediasoupTypes.MediaKind; rtpParameters: mediasoupTypes.RtpParameters; appData: mediasoupTypes.AppData; }가 결정되는게 아닐까?
          const newProducer = await sendTransport.produce({
            track: videoTrack,
            stopTracks: false,
            encodings: dynamicEncodings,
            // NOTE: 앱이 layer 정책값을 정하고, 브라우저/libwebrtc가
            // 최종 rid/active/dtx 등의 RTP 파라미터를 채운다.
            // `videoGoogleStartBitrate`는 Chrome/libwebrtc 계열에서만 주로 반영되는
            // "초기 시작점" 힌트다. 고정값이 아니라 시작 시점 기준이며, 이후에는
            // 네트워크 피드백에 따라 오르내린다. Firefox에서는 무시될 수 있다.
            // 참고: bitrate/fps/resolution 관련 값은 모두 정책용 cap이다.
            codecOptions: {
              videoGoogleStartBitrate: 1000
            }
          });
          if (import.meta.env.DEV) {
            console.log(
              "[socketStore] Video Producer created:",
              newProducer.id
            );
            console.log(
              "[socketStore] Producer codecs:",
              newProducer.rtpParameters.codecs
            );
            console.log(
              "[socketStore] Producer encodings:",
              newProducer.rtpParameters.encodings
            );
          }
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
          timestamp: new Date().toISOString()
        };

        set(
          (state) => ({ chatMessages: [...state.chatMessages, newMessage] }),
          false,
          "room/chatMessageSent"
        );

        socket.emit(EventNames.CHAT_MESSAGE, { message });
      }
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
    producersList
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
        )
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
              )
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
              remoteStreams: new Map(state.remoteStreams).set(peerId, newStream)
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
                  remoteStreams: newStreams
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
