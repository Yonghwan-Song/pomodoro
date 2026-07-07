//#region original right after applying slice pattern
import type { Socket } from 'socket.io-client';
import type { Device, types as mediasoupTypes } from 'mediasoup-client';
import type {
  AckResponse,
  CommonPreferredLayersForAllConsumersData,
} from '../../common/webrtc/payloadRelated';
import type { ProducerInfo } from '../../Pages/GroupStudy/typeDef';
import { ChatMessageInfo } from '../../common/webrtc/payloadRelated';

// TODO: 이제 행동과 필요한 재료들을 가져다가 사용하는 관점으로 바뀌었기 때문에,
// 최대한 행동들을 체계화 해서 RoomSliceActions에 정의해야함.

//#region <--- CONNECTIONSTORE DEFINITION AND TOP LEVEL INTERFACES
// 1.
export type ConnectionStore = RoomSlice & UtilitySlice; // CONCEPT: User가 RoomSliceStates과 UtilitySlice를 이용해서 RoomSliceActions를 취한다.

// 2.
export interface RoomSlice extends RoomSliceStates, RoomSliceActions {}
export interface UtilitySlice
  extends SocketSlice, MediaStreamSlice, MediasoupSlice {}

// 3.
export interface SocketSlice extends SocketSliceStates, SocketSliceActions {}
export interface MediaStreamSlice
  extends MediaStreamSliceStates, MediaStreamSliceActions {}
export interface MediasoupSlice
  extends DeviceSlice, TransportSlice, ProducerSlice, ConsumerSlice {}

// 4.
export interface DeviceSlice extends DeviceSliceStates, DeviceSliceActions {}
export interface TransportSlice
  extends TransportSliceStates, TransportSliceActions {}
export interface ProducerSlice
  extends ProducerSliceStates, ProducerSliceActions {}
export interface ConsumerSlice
  extends ConsumerSliceStates, ConsumerSliceActions {}
//#endregion CONNECTIONSTORE DEFINITION AND TOP LEVEL INTERFACES --->

export type Participant = {
  peerId: string;
  // firebase api 보니까 아래 두개는 optional.
  nickName: string | null;
  picture: string | null;
  // subject to change during group study session
  todayTotalDuration: number;
  stream: MediaStream | null; // null로 하는 이유: null일 때에도 그냥 participant Video Grid Item 보여주려고.
};

//#region <--- ROOM
export interface RoomSliceStates {
  isUserInRoom: boolean;
  currentRoomId: string | null;
  forcedRoomExitReason: ForcedRoomExitReason; // (참가자 말고) 내가 방에서 나가지는 이유

  // TODO: 이것의 구성요소를 할당할 때마다 찾아서 똑같이 participants를 update, video grid item만들 때 log찍고, 괜찮으면 render해보기
  // - [x] peerNicknames
  // - [x] peerTodayTotalDurations
  // - [x] remoteStreams
  participants: Map<string, Participant>; // peerId -> Participant

  // 참가자 정보
  peerNicknames: Map<string, string>;
  peerTodayTotalDurations: Map<string, number>;
  remoteStreams: Map<string, MediaStream>;

  // 참가자에 종속시키지 않겠음
  peerProducerList: ProducerInfo[]; // 이거는  방에 참가한 사람들중에 produce를 하고 있는 사람들의 producer에 관한 것이니까 user의 producer쪽으로 보내는 것은 아닌 것 같아.
  chatMessages: ChatMessageInfo[]; // TODO: 이름부터 좀 바꿔야할듯. chatMessageObjects정도는 되어야 안에 여러 구조로 나뉘어져 있구나 싶고 string이 아니라는 생각이 명확하게 드니까 덜 헷갈리는듯?
}
// Room에서 user가 할 수 있는 action들
export interface RoomSliceActions {
  /**
   * ! joinRoom과 leaveRoom에 개입되는 states -> 뭔가.... transport, socket, producer, consumer처럼 각각 혹은 이것들의 작은 조합보다는 조금더 큰 종합적인 관점의 어떤 조합들이 개입될듯. :::...
   * * joinRoom: socket, createTransports(), boundedPomoInfoStore's todayTotalDuration,
   * *           isUserInRoom, currentRoomId, producerList, peerNicknames, peerTodayTotalDurations
   * * leaveRoom:
   */
  initializeRoomSliceStates: () => void;
  // biggest ones
  joinRoom: (roomId: string, onError?: (error: string) => void) => void;
  leaveRoom: (socketEmitFlag?: boolean) => void;
  removePeerFromRoomForLongDisconnection?: () => void; //

  // detailed ones
  sendChatMessage: (message: string, senderNickname: string | null) => void;
  setPreferredVideoQuality: (consumerId: string, spatialLayer: number) => void;
  setCommonPreferredVideoQuality: (
    spatialLayer: number,
  ) => Promise<AckResponse<CommonPreferredLayersForAllConsumersData> | null>;
  pauseOrResumeVideo: (consumerId: string) => void;
  startSharing: () => void;
  stopSharing: () => void;
  toggleOnCamera: () => void;
  toggleOffCamera: () => void;

  // etc
  clearForcedRoomExitReason: () => void;
}
//#endregion ROOM --->

//#region <--- UTILITY

//#region Socket.io related
export interface SocketSliceStates {
  socket: Socket | null;
  isSocketConnected: boolean;
  isSocketConnecting: boolean;
  socketResetTimer: number | null;
}
export interface SocketSliceActions {
  initializeSocketSliceStates: () => void;
  connect: (caller: string) => Promise<void>;
  disconnect: () => void;
  informLogout: () => void;
}
//#endregion
//#region MediaStream API Related
export interface MediaStreamSliceStates {
  mediaStream: MediaStream | null; // Local Media Source
  isBeingShared: boolean;
}
export interface MediaStreamSliceActions {
  initializeMediaStreamSliceStates: () => void;
  obtainStream: (trackOption?: {
    video: boolean;
    audio: boolean;
  }) => Promise<MediaStream | null>;
  // releaseStream: () => void;
}
//#endregion
//#region Mediasoup
export interface DeviceSliceStates {
  device: Device | null;
  isDeviceLoaded: boolean;
}
export interface DeviceSliceActions {
  initializeDeviceSliceStates: () => void;
  initDevice: () => Promise<void>;
}

export interface TransportSliceStates {
  sendTransport: mediasoupTypes.Transport | null;
  recvTransport: mediasoupTypes.Transport | null;
  isSendTransportReady: boolean;
  isRecvTransportReady: boolean;
  isCreatingTransports: boolean;
  // disconnection restore
  iceRestartAttemptCount: {
    send: number;
    recv: number;
  };

  timersForIceRestartAttempt: {
    send: ReturnType<typeof setTimeout> | null;
    recv: ReturnType<typeof setTimeout> | null;
  };

  iceSignalingStatus: {
    send: {
      isIceRestartEmitted: boolean;
      isAckResponseNotReceived: boolean;
    };
    recv: {
      isIceRestartEmitted: boolean;
      isAckResponseNotReceived: boolean;
    };
  };
}
export interface TransportSliceActions {
  initializeTransportSliceStates: () => void;
  createTransports: () => void;
  attemptToRestartIceWithGuards: (
    transport: mediasoupTypes.Transport,
    kind: 'send' | 'recv',
    socket: Socket,
  ) => void; // null check는 던질때 한번 하는게 함수 정의 내부에서 야랄나는것보다 나는 더 좋음!
}

export interface ProducerSliceStates {
  producer: mediasoupTypes.Producer | null;
  isProducerPaused: boolean;
}
export interface ProducerSliceActions {
  initializeProducerSliceStates: () => void;
  produce: () => Promise<void>; // startSharing에서
  closeProducer: () => void;
  pauseProducer: () => void;
  resumeProducer: () => void;
}

export interface ConsumerSliceStates {
  consumersByPeerId: Map<PeerId, mediasoupTypes.Consumer>;
  consumerLayers: Map<ConsumerId, ConsumerLayerState>;
  lastGlobalPreferredSpatialLayer: number | undefined;
}
export interface ConsumerSliceActions {
  initializeConsumerSliceStates: () => void;
  consumePendingProducers: () => void; // state update의 시간차에 의존하는데 (ROOM_GET_PRODUCER에서 isBeingConsumed: false -> 조금 있다가 이 함수를 호출해서 true로 바꾸는 방식임.)
  setConsumerPreferredLayers: (
    // Consumer related?..최소한 이것은 this user's consumer is not involved.
    // It is more about asking the mediasoup server's Room to modify the consumers' settings it owns.
    //* 그러니까 지금 이 사용자의 consumer가 뭔가를 능동적으로 한다기보다는 server에게 어떠한 요청을 하고(signaling server를 통해서), 실질적으로 consumer하고있는 producer in server side의 어떤 값을 조정하고 그러는걸까?.. 시바루..?
    consumerId: string,
    spatialLayer: number,
  ) => void;
  setCommonPreferredLayersForAllConsumers: (
    spatialLayer: number,
  ) => Promise<AckResponse<CommonPreferredLayersForAllConsumersData> | null>;
  toggleLocalConsumerPause: (consumerId: string) => void;
}
//#endregion

//#endregion UTILITY --->

//#region <-- OTHER TYPE DEFINITIONS
export type PeerId = string;
export type ConsumerId = string;
export type ConsumerLayerState = {
  // WARNING: When rejoining the room after a user reloaded, he cannot guarantee that the consumers he had still exist. For example, if he had a consumer for the firefox peer and the peer stopped sharing while he was out, the corresponding consumer of the reloaded peer in the server side should be cleaned up so that he can sync producers and consumers correctly when rejoining the room.
  requestedSpatialLayer?: number;
  currentSpatialLayer?: number;
  isPausedByProducer?: boolean;
  isPausedLocallyByViewer?: boolean;
};
export type ForcedRoomExitReason =
  | 'kicked'
  | 'room-closed'
  | 'tcp-socket-prolonged-disconnect'
  | 'transport-recovery-failed'
  | null;
//#endregion OTHER TYPE DEFINITIONS --->
