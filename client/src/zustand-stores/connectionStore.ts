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
  CommonPreferredLayersForAllConsumersData,
  ConsumerLayersChangedPayload,
  ConsumerOptionsExtended,
  ProducerPayload
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
  previousSocketId: string | null;
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
// NOTE: 이 안의 정보들이 너무 흩뿌려져있는 느낌. 뭔가 state들이 유기적으로 위계를 갖고 조직되어 있는 느낌이 아니기 때문에 뭔가...
// 어떤 기능을 구현하고자 할때 뇌에 바로바로 이미지가 떠오르지 않음. 어디를 고쳐야하고 무엇을 추가하고 어떤게 필요할지...
interface RoomState {
  currentRoomId: string | null;
  isRoomJoined: boolean;
  forcedRoomExitReason: ForcedRoomExitReason;

  // Transport related
  sendTransport: mediasoupTypes.Transport | null;
  recvTransport: mediasoupTypes.Transport | null;
  isSendTransportReady: boolean;
  isRecvTransportReady: boolean;
  isCreatingTransports: boolean;

  // Producer/Consumer related -> 이것들은 이름이 따로 있지 않나?
  producer: mediasoupTypes.Producer | null;
  isProducerPaused: boolean;
  producersList: ProducerInfo[]; // 방에 존재하는 나 말고 다른 사람들이 produce하고 있는 미디어들의 리스트임. 그러니가 내가 consume할 수 있는 대상들을 말하는 것임.
  //그런데
  consumersByPeerId: Map<string, mediasoupTypes.Consumer>; // key는 peerId(Socket ID)이며, value는 해당 peer의 미디어를 소비하는 Consumer 객체
  remoteStreams: Map<string, MediaStream>;
  peerNicknames: Map<string, string>;

  // Consumer layer info keyed by consumerId.
  // `requestedSpatialLayer`는 사용자가 목표로 요청한 값이고,
  // `currentSpatialLayer`는 mediasoup가 현재 실제로 forwarding 중인 값이다.
  consumerLayers: Map<string, ConsumerLayerState>; // TODO: 방에 consumer가 여러개 필요했던가?... 그런것 같은데,

  /**
   * "All streams" 일괄 UI 전용 마지막 선택값.
   * `setCommonPreferredLayersForAllConsumers` 호출 시에만 설정하고,
   * `setConsumerPreferredLayers`(VideoPlayer 타일)는 건드리지 않는다 — per-consumer 요청과 UI 하이라이트를 분리하기 위함.
   */
  lastGlobalPreferredSpatialLayer: number | undefined;
  // 그런데 그렇다면 이게... consumersByPeerId와 연결시킬 수도 있었을텐데... 딱히 그렇게 좀더 구도를 잡지는 않았음.

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
  /** 서버에 producer pause 요청 (카메라 일시 중단). */
  pauseProducer: () => void;
  /** 서버에 producer resume 요청 (카메라 재개). */
  resumeProducer: () => void;
  /** 채팅 메시지 전송. */
  sendChatMessage: (message: string, senderNickname: string) => void;
  /** Consumer의 화질(spatial layer) 변경 요청 */
  setConsumerPreferredLayers: (
    consumerId: string,
    spatialLayer: number
    // TODO: What about temporal layer?
    // https://mediasoup.org/documentation/v3/mediasoup/api/#consumer-setPreferredLayers
    // 이거보면 temporalLayer도 선택할 수 있음.
  ) => void;
  /** 내 쪽 모든 consumer에 동일 spatial layer 요청 (서버 ack로 부분 실패 확인 가능) */
  setCommonPreferredLayersForAllConsumers: (
    spatialLayer: number
  ) => Promise<AckResponse<CommonPreferredLayersForAllConsumersData> | null>;
  /** 로컬 뷰어가 특정 consumer를 일시정지/재개 토글 */
  toggleLocalConsumerPause: (consumerId: string) => void;
  /** 강제 퇴장 신호를 UI 계층이 소비한 뒤 초기화한다. */
  clearForcedRoomExitReason: () => void;
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

// NOTE:
// 서버가 emit하는 `consumerLayersChanged` payload의 `layers`는 optional이다.
// 이유는 서버 원천인 mediasoup의 `consumer.on("layerschange")` 이벤트 시그니처가
// `ConsumerLayers | undefined`이기 때문이다. 즉 mediasoup는 어떤 시점에는
// "현재 forwarding 중인 layer 정보가 아직 없다"는 의미로 `undefined`를 줄 수 있다.
//
// [주의: Network Connection Drop과 layers의 undefined 관계]
// 송출자(Producer)의 네트워크 연결이 일시적으로 끊기거나 불안정해져 미디어 패킷 전송이 중단되면,
// mediasoup 서버는 이를 감지하고 해당 Consumer들에게 더 이상 포워딩할 활성 레이어가 없음을
// 알리기 위해 `layerschange` 이벤트를 `layers: undefined`로 발생시킵니다.
// 즉, layerschange에서 undefined가 수신된다는 것은 단순히 화질을 알 수 없다는 의미를 넘어
// 실질적으로 상대방의 미디어 스트림 수신이 멈췄음(네트워크 드롭 또는 패킷 유실 상태)을 시사합니다.
//
// 여기서 중요한 점은 `layers`가 "내가 요청한 preferred layer"가 아니라
// "현재 실제로 선택되어 forwarding 중인 current layer"라는 것이다.
// 따라서 클라이언트 UI는 preferred/requested 값보다 이 current 값을 더 신뢰해야 한다.
//
// 또한 mediasoup의 `ConsumerLayers`는 `{ spatialLayer, temporalLayer? }` 형태다.
// 하지만 현재 우리 앱의 제품 정책은 temporal layer(fps 계층)를 직접 제어하지 않는다.
// 현재 구현에서 사용자가 조절하는 것은 spatial layer(해상도 계층)뿐이고,
// 서버에서도 `consumer.setPreferredLayers({ spatialLayer })`처럼 temporalLayer를
// 생략해서 호출한다. 이 경우 mediasoup worker는 가능한 최대 temporal layer를
// 내부 기본값으로 채운다.
//
// 그래서 현재 클라이언트 store는 아래 두 값만 저장한다.
// - `requestedSpatialLayer`: 사용자가 마지막으로 요청한 목표 해상도 계층
// - `currentSpatialLayer`: mediasoup가 실제로 보내고 있다고 알려준 현재 해상도 계층
//
// temporalLayer를 store에 저장하지 않는 이유:
// 1. 현재 UI/정책에서 fps 계층을 따로 노출하거나 제어하지 않음
// 2. 화면 공유가 "존재감 전달" 역할이라 spatial 제어만으로도 충분하다고 판단함
// 3. payload 타입에서는 서버 원형을 보존하되, store state는 현재 제품이 실제로
//    사용하는 최소 정보만 들고 가는 편이 더 단순하고 읽기 쉽기 때문
//
// 정리:
// - payload 타입은 서버가 보낼 수 있는 전체 의미를 보존한다
// - store 타입은 현재 앱이 실제로 사용하는 필드만 저장한다
// - 향후 fps 제어나 디버깅이 필요해지면 temporalLayer를 store/UI에 확장할 수 있다
type ConsumerLayerState = {
  requestedSpatialLayer?: number;
  currentSpatialLayer?: number;
  isPausedByProducer?: boolean;
  isPausedLocallyByViewer?: boolean;
};

// 명시적 종료는 즉시 leaveRoom 한다.
// - io client disconnect: 우리 코드가 socket.disconnect() 호출
// - io server disconnect: 서버가 의도적으로 연결을 닫음
// 이런 케이스까지 유예하면 "사용자가 나가려 했는데 남아있는" 역효과가 난다.
const EXPLICIT_SOCKET_DISCONNECT_REASONS = new Set([
  "io client disconnect",
  "io server disconnect"
]);

const VERY_LOW_RESOLUTION_MAX_BITRATE = 250_000;
const SD_MAX_BITRATE_15FPS = 450_000;
const SD_MAX_BITRATE_30FPS = 600_000;
const QHD_MAX_BITRATE_15FPS = 800_000;
const QHD_MAX_BITRATE_30FPS = 1_000_000;
const HD_MAX_BITRATE_15FPS = 1_200_000;
const HD_MAX_BITRATE_30FPS = 1_500_000;
const FULL_HD_MAX_BITRATE_15FPS = 2_500_000;
const FULL_HD_MAX_BITRATE_30FPS = 3_000_000;

type TransportRole = "send" | "recv";

type RestartIceAckData = {
  iceParameters: mediasoupTypes.IceParameters;
};

type ForcedRoomExitReason = "transport-recovery-failed" | null;

// restartIce를 최대 몇 번까지 연속으로 시도할지 정의한다.
// 여기서 "1번 시도"는 서버에 새 ICE parameters를 요청하고,
// 응답을 받아 transport.restartIce(...)를 적용하는 한 사이클 전체를 의미한다.
const MAX_ICE_RESTART_ATTEMPTS = 10;

// transport 상태를 로그 중요도로 매핑한다.
// 상태 해석과 복구 정책을 분리해두면 아래 monitor 함수가 좀 더 읽기 쉬워진다.
function getConnectionStateLogLevel(state: mediasoupTypes.ConnectionState) {
  if (state === "connected") return "info";
  if (state === "disconnected") return "warn";
  if (state === "failed") return "error";
  return "log";
}

// transport별 connection state 관찰과 ICE 복구 루프를 담당한다.
// send/recv transport 각각에 대해 독립적으로 1회 등록된다.
function registerTransportConnectionMonitor(
  transport: mediasoupTypes.Transport,
  role: TransportRole
) {
  const logPrefix = `[socketStore][${role}:${transport.id}]`;

  // 이번 장애 구간에서 몇 번 restart를 시도했는지 누적한다.
  // transport가 connected로 회복되면 0으로 초기화한다.
  let iceRestartAttempts = 0;

  // 파이어폭스(Firefox) 등 일부 브라우저에서 ICE Restart 적용(restartIce) 직후
  // 내부적으로 다시 실패해도 connectionstatechange 이벤트(failed)가 재발생하지 않는
  // 경우가 있어(failed -> failed 상태 변화가 없다고 간주되는 버그 혹은 특성),
  // 일정 시간 후에도 connected가 안 되면 수동으로 재시도하도록 타이머를 둔다.
  let iceRestartTimer: ReturnType<typeof setTimeout> | null = null;

  const clearIceRestartTimer = () => {
    if (iceRestartTimer) {
      clearTimeout(iceRestartTimer);
      iceRestartTimer = null;
    }
  };

  // 최대 재시도 횟수를 모두 소진했을 때의 최종 정책.
  // 현재 앱 정책은 장기 복구 실패 시 방에서 나가며 세션을 정리하는 것이다.
  const leaveRoomAfterRecoveryFailure = () => {
    clearIceRestartTimer();
    console.error(
      `${logPrefix} Transport failed after ${MAX_ICE_RESTART_ATTEMPTS} ICE restart attempts. Leaving room.`
    );
    console.log(`${logPrefix} setting forcedRoomExitReason before leaveRoom()`);
    useConnectionStore.setState(
      { forcedRoomExitReason: "transport-recovery-failed" },
      false,
      "room/forcedExitAfterRecoveryFailure"
    );
    useConnectionStore.getState().leaveRoom();
    console.log(`${logPrefix} forcedRoomExitReason was set`);
  };

  // ICE Restart은 서버에 새 ICE parameters 요청하여 ice parameters를 재설정하는 것이고, 재설정되면 다시 connectivity check를 한다. -> ./why-ice-restart.md
  const attemptIceRestart = () => {
    const socket = useConnectionStore.getState().socket;

    // signaling socket이 없거나, transport가 이미 닫혔거나, 이미 회복됐으면 중단.
    if (
      !socket ||
      transport.closed ||
      transport.connectionState === "connected"
    )
      return;

    if (iceRestartAttempts >= MAX_ICE_RESTART_ATTEMPTS) {
      leaveRoomAfterRecoveryFailure();
      return;
    }

    iceRestartAttempts += 1;
    console.log(
      `${logPrefix} Requesting ICE restart (${iceRestartAttempts}/${MAX_ICE_RESTART_ATTEMPTS})`
    );

    socket.emit(
      EventNames.RESTART_ICE,
      { role },
      async (ackResponse: AckResponse<RestartIceAckData>) => {
        if (ackResponse.success && ackResponse.data?.iceParameters) {
          try {
            await transport.restartIce({
              iceParameters: ackResponse.data.iceParameters
            });
            console.log(
              `${logPrefix} Applied new ICE parameters. Waiting for connectionstatechange.`
            );

            // NOTE: Firefox Workaround
            // 새 ICE 파라미터를 적용했음에도, 수초 내에 connected로 회복되지 않고 어떠한 연결 이벤트도 없으면
            // 다시 ICE Restart를 시도한다. Chromium은 failed 이벤트가 다시 발생하지만,
            // Firefox는 이미 state이 failed일 경우 추가적인 failed 이벤트를 생략할 수 있다.
            clearIceRestartTimer();
            iceRestartTimer = setTimeout(() => {
              //! 이렇게 예약하는 이유: 원래는 transport의 connectionstateChange event가 fire되어야 하는데, (failed -> disconnected) 중간에 그냥 firefox 선에서 뭔가 크롬과는 다르게 이 과정이 이어나가지 못하게 만들어 놓았음.
              //! fire되어야 하는 이유는 원래 그냥 ufrag와 pwd가 다시 설정되면 그렇게 Connectivity check STUN binding request보내라고 씨발 되어있음.
              //! 아무튼 그래서 저 아래 처음에 이 attemptIceRestart()가 invoke되었던 기점이 재방문 되지 않음... 원래는 Maximum trial을 채울때까지 방문이 되고 그다음에는 방에서 강제 퇴거된 후 transport자체가 close되는건데 씨발?...
              if (
                transport.connectionState !== "connected" &&
                !transport.closed
              ) {
                console.warn(
                  `${logPrefix} Fallback: No connection state change after restartIce in time. Retrying...`
                );
                attemptIceRestart();
              }
            }, 10000); // 10초 부여 (보통 ICE Gathering 및 Checking 대기 고려) //? vivaldi의 경우, 10초 이전에 disconnected에서 failed로 안바뀌면 시나리오가..?
            //? 예를 들면 9초에 failed로 바뀌었다고해보면, 이 함수가 다시 호출되고 setTimeout에 의해 예약되어있는 이 함수는 clear된다.
            //? 만약에 11초에 failed로 바뀐다고 하면, 실제로 failed까지 도달하지는 못한다 왜냐하면 10초에 이 함수가 실행된다. (state은 disconnected이다 vivaldi기준, firefox는 계속 failed일듯...?),
            //? 그러니까 계속 11초로 바뀌는거로 되는거라면.. 시발?.. 그러면 우리 시나리오상 처음에는 무조건 연결되었을테니까 , connected이고 그다음에 맛탱이 가서 disconnected 그리고 failed.
            //? 그 이후로는... 10초 설정과 11초 미래의 .. mismatch? 뭐 아무튼 그래서, 아까의 그 failed 이후에 물론 vivaldi는 Connectivity check할테고... 실패해서 10초이내에 실패한다고 가정... (그 이내에는 보내지 않을까? 그리고 판단하지 않을까?.... 맞나?.. 그 판단 시간이?... 이거 찾아봐야할지도?..)
            //? 그래서 disconnected로 되고.. 그 이후에는 계속 시도해보다가 failed로 바뀌어야 하는데 거기까지 기회가 안닿는다며 (우리가 지금 상상으로는 11초 정도후에 그 일이 일어난다고 가정하는건데 10초에 다시 attemptIceRestart()가 호출되니까).
            // 그래서 connected -> failed
            //*                -> attemptIceRestart() -> (Connectivity Check 다시 시도) -> disconnected -> (keep sending STUN check)
            //*                             | <------------------------------- 10초-----------------------------------------------
            //*                -> attemptIceRestart() -> (Connectivity Check 다시 시도) -> disconnected -> (keep sending STUN check)
            //*              ---> |
            //위의 *로 시작하는 comment들이 반복... :::...
            //! Firefox의 경우는 위의 vivaldi의 예에서 10초 이후에 failed가 나올 것이라고 가정한 usecase와 별반 다르지 않을 것 같음. (Except for it not attempting to send STUN Binding Request after ufrag and pwd are reset)
            //! 그러니까 시발.. connected -> failed -> attemptIceRestart() -> (Does fucking nothing) and wait for fucking 10 seconds -> (scheduled) attemptIceRestart()
            //!                  -> (Does fucking nothing) and wait for fucking 10 seconds -> (scheduled) attemptIceRestart()
          } catch (error) {
            console.error(`${logPrefix} Client-side restartIce failed:`, error);
          }
        } else {
          console.error(
            `${logPrefix} Signaling server rejected ICE restart:`,
            ackResponse.error
          );
        }
      }
    );
  };

  transport.observer.on("close", () => {
    console.log(`transport ${transport.id} is closed`);
    clearIceRestartTimer();
  });

  transport.on("connectionstatechange", (state) => {
    const ts = new Date().toISOString();
    const tag = getConnectionStateLogLevel(state);
    console[tag](`${logPrefix} conn=${state} ts=${ts}`);

    if (state === "connected") {
      iceRestartAttempts = 0;
      clearIceRestartTimer();

      // [Firefox Workaround]
      // 파이어폭스의 경우 ICE Restart 직후 sendTransport가 connected가 되어도
      // 내부 미디어 파이프라인 버그로 인해 RTP 패킷 송출이 재개되지 않는(Stuck) 현상이 있습니다.
      // 이를 방지하기 위해 강제로 트랙을 교체(replaceTrack)하여 Firefox가 RTP 전송을 재개하도록 유도합니다.
      console.log("role", role);
      console.log("navigator.userAgent", navigator.userAgent);
      if (role === "send" && navigator.userAgent.includes("Firefox")) {
        const { producer } = useConnectionStore.getState();
        console.log(
          "producer inside connectionstatechange -> connected",
          producer
        );
        if (producer && producer.track) {
          // 레벨 5: Nuke and Rebuild (Producer 객체를 파괴하고 새로 생성)
          // 기존 파이프라인 우회가 모두 실패하므로, 연결이 회복된 전송로(Transport) 위에서
          // 아예 새로운 스트리밍 파이프라인(Producer)을 처음부터 다시 생성한다.
          console.log(
            `${logPrefix} [Firefox Fix] Nuke and rebuild producer ${producer.id}...`
          );
          const state = useConnectionStore.getState();
          const { socket, stream, isSharing, sendTransport } = state;

          if (stream && isSharing && sendTransport && socket) {
            // 1. 기존 Producer 파괴 및 서버에 통보
            producer.close();
            socket.emit(EventNames.PRODUCER_CLOSED, {
              producerId: producer.id
            });
            useConnectionStore.setState(
              { producer: null, isProducerPaused: false },
              false,
              "room/producerNukedForFirefoxFix"
            );

            // 2. 약간의 텀을 두고 아예 새 Producer를 생성하도록 유도
            setTimeout(() => {
              console.log(
                `${logPrefix} [Firefox Fix] Spawning new producer...`
              );
              useConnectionStore
                .getState()
                .produce()
                .catch((err) => {
                  console.error(
                    `${logPrefix} [Firefox Fix] Failed to recreate producer:`,
                    err
                  );
                });
            }, 100);
          }
        }
      }

      return;
    }

    if (state === "failed") {
      clearIceRestartTimer();
      attemptIceRestart();
    }
  });
}

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
      previousSocketId: null,
      device: null,
      isDeviceLoaded: false,
      stream: null,
      isSharing: false,
      currentRoomId: null,
      isRoomJoined: false,
      forcedRoomExitReason: null,
      sendTransport: null,
      recvTransport: null,
      producer: null,
      isProducerPaused: false,
      isSendTransportReady: false,
      isRecvTransportReady: false,
      isCreatingTransports: false,
      producersList: [],
      consumersByPeerId: new Map(),
      remoteStreams: new Map(),
      peerNicknames: new Map(),
      consumerLayers: new Map(),
      lastGlobalPreferredSpatialLayer: undefined,
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
            console.log("the id of the socket just connected", newSocket.id);
            console.log("[socketStore] socket.connected", newSocket.connected);

            const { previousSocketId } = get();
            if (previousSocketId) {
              console.log(
                "[socketStore] Socket reconnected! Sending previous socket ID to server:",
                previousSocketId
              );
              newSocket.emit(EventNames.RECONNECT, { previousSocketId });
              set(
                { previousSocketId: null },
                false,
                "socket/previousIdCleared"
              );
            }

            set(
              { connected: true, isConnecting: false },
              false,
              "socket/connected"
            );
          });

          newSocket.on("disconnect", (reason) => {
            // https://socket.io/docs/v4/client-socket-instance/#disconnect
            console.log("[socketStore] Socket disconnected:", reason);
            const isExplicitDisconnect =
              EXPLICIT_SOCKET_DISCONNECT_REASONS.has(reason);

            if (isExplicitDisconnect) {
              // 명시적 종료는 관측 대상이 아니므로 즉시 방 정리.
              set({ previousSocketId: null }, false, "socket/clearPreviousId");
              get().leaveRoom();
            } else {
              const disconnectedId = get().socket?.id || newSocket.id;
              console.log(
                "the id of the socket just disconnected",
                disconnectedId
              );
              if (disconnectedId) {
                set(
                  { previousSocketId: disconnectedId },
                  false,
                  "socket/setPreviousId"
                );
              }
            }

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
                const newConsumerLayers = new Map(get().consumerLayers);
                newConsumerLayers.delete(consumer.id);
                set(
                  {
                    consumersByPeerId: newConsumers,
                    remoteStreams: newRemoteStreams,
                    consumerLayers: newConsumerLayers
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

        socket.on(
          EventNames.CONSUMER_LAYERS_CHANGED,
          (payload: ConsumerLayersChangedPayload) => {
            const prevSpatial = get().consumerLayers.get(
              payload.consumerId
            )?.currentSpatialLayer;
            const ts = new Date().toISOString();
            if (payload.layers === undefined) {
              console.warn(
                `[LAYER DROP ⚠] ${ts} consumer=${payload.consumerId} spatial: ${
                  prevSpatial ?? "?"
                } → NONE (network drop / BWE degraded)`
              );
            } else {
              console.log(
                `[LAYER CHANGE] ${ts} consumer=${payload.consumerId} spatial: ${
                  prevSpatial ?? "?"
                } → ${payload.layers.spatialLayer} temporal: ${
                  payload.layers.temporalLayer ?? "max"
                }`
              );
            }
            set(
              (state) => {
                const updatedLayers = new Map(state.consumerLayers);
                const existingLayerState =
                  updatedLayers.get(payload.consumerId) ?? {};
                updatedLayers.set(payload.consumerId, {
                  ...existingLayerState,
                  currentSpatialLayer: payload.layers?.spatialLayer
                });
                return { consumerLayers: updatedLayers };
              },
              false,
              "room/consumerLayersChanged"
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
        socket?.off(EventNames.CONSUMER_LAYERS_CHANGED);

        // 6. 상태 초기화
        set(
          {
            currentRoomId: null,
            isRoomJoined: false,
            sendTransport: null,
            recvTransport: null,
            producer: null,
            isProducerPaused: false,
            isSendTransportReady: false,
            isRecvTransportReady: false,
            isCreatingTransports: false,
            producersList: [],
            consumersByPeerId: new Map(),
            remoteStreams: new Map(),
            peerNicknames: new Map(),
            peerTodayTotalDurations: new Map(),
            chatMessages: [],
            consumerLayers: new Map(),
            lastGlobalPreferredSpatialLayer: undefined
          },
          false,
          "room/left"
        );
      },

      clearForcedRoomExitReason: () => {
        set(
          { forcedRoomExitReason: null },
          false,
          "room/clearForcedExitReason"
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
                registerTransportConnectionMonitor(transport, "send");

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
                registerTransportConnectionMonitor(transport, "recv");

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
          set(
            { producer: null, isProducerPaused: false },
            false,
            "room/producerClosed"
          );
        }
        get().stopSharing();
      },

      pauseProducer: () => {
        const { producer, socket, isProducerPaused } = get();
        if (!producer || !socket || isProducerPaused) return;

        producer.pause();
        socket.emit(
          EventNames.PAUSE_PRODUCER,
          { kind: "video" },
          (ack: AckResponse) => {
            if (ack.success) {
              console.log("[socketStore] Producer paused (server confirmed)");
            } else {
              console.error(
                "[socketStore] Server failed to pause producer:",
                ack.error
              );
              producer.resume();
              set(
                { isProducerPaused: false },
                false,
                "room/pauseProducerRollback"
              );
            }
          }
        );
        // NOTE: 여기서 isProducerPaused를 즉시 true로 두는 것은 의도적인 optimistic update다.
        // pause 버튼을 눌렀을 때 UI가 서버 ack 왕복을 기다리지 않고 바로 반응하게 하려는 목적이다.
        // 이미 로컬 producer.pause()도 먼저 호출했으므로, 클라이언트 입장에서는 일단
        // "paused로 전환되었다"고 보는 편이 자연스럽다. 만약 서버가 pause를 거절하면
        // ack callback에서 producer.resume()과 상태 rollback(false)로 되돌린다.
        set({ isProducerPaused: true }, false, "room/producerPaused");
      },

      resumeProducer: () => {
        const { producer, socket, isProducerPaused } = get();
        if (!producer || !socket || !isProducerPaused) return;

        producer.resume();
        socket.emit(
          EventNames.RESUME_PRODUCER,
          { kind: "video" },
          (ack: AckResponse) => {
            if (ack.success) {
              console.log("[socketStore] Producer resumed (server confirmed)");
            } else {
              console.error(
                "[socketStore] Server failed to resume producer:",
                ack.error
              );
              producer.pause();
              set(
                { isProducerPaused: true },
                false,
                "room/resumeProducerRollback"
              );
            }
          }
        );
        // NOTE: 이것도 pauseProducer와 같은 optimistic update다.
        // resume 요청 직후 UI를 즉시 "camera on" 상태처럼 보이게 해서 반응성을 높인다.
        // 로컬 producer.resume()를 먼저 실행했기 때문에 클라이언트 쪽 체감 상태도 이미
        // resumed에 가깝다. 서버 ack가 실패하면 callback에서 producer.pause()와
        // 상태 rollback(true)를 수행한다.
        // 즉, ack.success 블록 안에서 set하지 않는 이유는 "성공 확정 후 반영"보다
        // "먼저 반영하고 실패 시 복구"를 선택했기 때문이다.
        set({ isProducerPaused: false }, false, "room/producerResumed");
      },

      setConsumerPreferredLayers: (
        consumerId: string,
        spatialLayer: number
      ) => {
        const { socket } = get();
        if (!socket) return;

        set(
          (state) => {
            const updatedLayers = new Map(state.consumerLayers);
            const existingLayerState = updatedLayers.get(consumerId) ?? {};

            updatedLayers.set(consumerId, {
              ...existingLayerState,
              requestedSpatialLayer: spatialLayer
            });

            return { consumerLayers: updatedLayers };
          },
          false,
          "room/requestConsumerLayer"
        );

        socket.emit(EventNames.SET_CONSUMER_PREFERRED_LAYERS, {
          consumerId,
          spatialLayer
        });
      },

      setCommonPreferredLayersForAllConsumers: (spatialLayer: number) => {
        const { socket } = get();
        if (!socket) {
          return Promise.resolve(null);
        }

        set(
          (state) => {
            const updatedLayers = new Map(state.consumerLayers);
            for (const consumer of state.consumersByPeerId.values()) {
              const existingLayerState = updatedLayers.get(consumer.id) ?? {};
              updatedLayers.set(consumer.id, {
                ...existingLayerState,
                requestedSpatialLayer: spatialLayer
              });
            }
            return {
              consumerLayers: updatedLayers,
              lastGlobalPreferredSpatialLayer: spatialLayer
            };
          },
          false,
          "room/requestAllConsumersLayer"
        );

        return new Promise<
          AckResponse<CommonPreferredLayersForAllConsumersData>
        >((resolve) => {
          socket.emit(
            EventNames.SET_COMMON_PREFERRED_LAYERS_FOR_ALL_CONSUMERS,
            { spatialLayer },
            (ack: AckResponse<CommonPreferredLayersForAllConsumersData>) => {
              if (!ack.success) {
                if (ack.data?.failed?.length) {
                  console.warn(
                    "[connectionStore] setCommonPreferredLayersForAllConsumers partial failure:",
                    ack.error,
                    ack.data
                  );
                } else {
                  console.error(
                    "[connectionStore] setCommonPreferredLayersForAllConsumers failed:",
                    ack.error
                  );
                }
              }
              resolve(ack);
            }
          );
        });
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
      },

      toggleLocalConsumerPause: (consumerId: string) => {
        const { socket, consumersByPeerId, consumerLayers } = get();
        if (!socket) return;

        // 1. 상태에서 현재 consumer 찾기
        let targetConsumer: mediasoupTypes.Consumer | undefined;
        for (const consumer of consumersByPeerId.values()) {
          if (consumer.id === consumerId) {
            targetConsumer = consumer;
            break; // <-- 오랜만이다!
          }
        }

        if (!targetConsumer) {
          console.warn(
            `[socketStore] toggleLocalConsumerPause: consumer ${consumerId} not found`
          );
          return;
        }

        // 2. 현재 상태 확인
        const currentState = consumerLayers.get(consumerId) ?? {};
        const isCurrentlyPaused = currentState.isPausedLocallyByViewer === true;
        const willBePaused = !isCurrentlyPaused;

        // 3. 로컬 mediasoup consumer 일시정지/재개 (optimistic)
        if (willBePaused) {
          targetConsumer.pause();
        } else {
          targetConsumer.resume();
        }

        // 4. 스토어 상태 업데이트 (optimistic)
        set(
          (state) => {
            const updatedLayers = new Map(state.consumerLayers);
            updatedLayers.set(consumerId, {
              ...currentState,
              isPausedLocallyByViewer: willBePaused
            });
            return { consumerLayers: updatedLayers };
          },
          false,
          "room/toggleLocalConsumerPause"
        );

        // 5. 서버에 시그널링 (실패 시 롤백)
        const eventName = willBePaused
          ? EventNames.PAUSE_CONSUMER
          : EventNames.RESUME_CONSUMER;
        socket.emit(eventName, { consumerId }, (ackResponse: AckResponse) => {
          if (!ackResponse.success) {
            console.error(
              `[socketStore] Failed to ${
                willBePaused ? "pause" : "resume"
              } consumer on server:`,
              ackResponse.error
            );

            // 롤백
            if (willBePaused) {
              targetConsumer?.resume();
            } else {
              targetConsumer?.pause();
            }

            set(
              (state) => {
                const layers = new Map(state.consumerLayers);
                const current = layers.get(consumerId) ?? {};
                layers.set(consumerId, {
                  ...current,
                  isPausedLocallyByViewer: isCurrentlyPaused
                });
                return { consumerLayers: layers };
              },
              false,
              "room/toggleLocalConsumerPauseRollback"
            );
          }
        });
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

          // Produce할때는 transport.produce()함수 먼저 호출하면 produce event handler 내부에서 EventNames.PRODUCE message를 emit한다.
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
              consumerLayers: new Map(state.consumerLayers).set(consumer.id, {
                ...state.consumerLayers.get(consumer.id),
                isPausedByProducer: consumer.paused
              })
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
                useConnectionStore.setState(
                  (state) => {
                    const updatedLayers = new Map(state.consumerLayers);
                    const existingLayerState =
                      updatedLayers.get(consumer.id) ?? {};

                    updatedLayers.set(consumer.id, {
                      ...existingLayerState,
                      isPausedByProducer: false
                    });

                    return { consumerLayers: updatedLayers };
                  },
                  false,
                  "room/consumerResumed"
                );
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
                const newConsumerLayers = new Map(state.consumerLayers);
                newConsumerLayers.delete(consumer.id);
                return {
                  consumersByPeerId: newConsumers,
                  remoteStreams: newStreams,
                  consumerLayers: newConsumerLayers
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
