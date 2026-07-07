import { type ConsumerOptions } from 'mediasoup-client/types';

// WARNING:
export type ProducerPayload = {
  producerId: string;
  peerId: string; // Firebase uid of the producing peer
  kind: 'audio' | 'video';
  displayName?: string; // 선택적 정보
  // appData?: Record<string, any>; // WARNING: 프로젝트 어디에서도 appData를 사용하고있지 않음. -> 그냥 지운다.
};

// 서버로부터 받을 payload의 타입을 정의할 때 사용합니다.
// export type ConsumerCreatedPayload = {
//   consumerOptions: ConsumerOptions;
//
//   // id?: string;
//   // producerId?: string;
//   // kind?: 'audio' | 'video';
//   // rtpParameters: RtpParameters;
//   // streamId?: string;
//   // onRtpReceiver?: OnRtpReceiverCallback;
//   // appData?: ConsumerAppData;
//   // 필요에 따라 다른 정보(예: 어떤 peer의 consumer인지)를 추가할 수 있습니다.
//   peerId: string;
// }

export type ConsumerOptionsExtended = ConsumerOptions & { peerId: string }; // TODO: - I am not sure if it would be better to tweak ConsumerOptions making some properties of them required.

export type AckResponse<T = any> = {
  success: boolean;
  error?: string;
  data?: T;
};

export type DataToSyncForPeerReconnected = {
  peersTodayTotalFocusArray: TodayTotalFocusOfPeer[];
  chatMessages: ChatMessageInfo[];
};

export interface ChatMessageInfo {
  senderId: string;
  senderNickname: string;
  message: string;
  timestamp: string;
}

export type TodayTotalFocusOfPeer = {
  peerId: string;
  todayTotalDuration: number;
};

// NOTE: data를 받아올 때는 undefined properties가 존재할 수 있지만,
// 우리가 여기에서 사용하고자 하는 participant 타입 수준부터는 다른 대체 값을 할당하여 undefined를 허용하지 않는다.
export type NEW_PEER_JOINED_DATA = {
  peerId: string;
  todayTotalDuration: number;
  nickName: string | null;
  picture: string | null;
};

export type ParticipantBasicData = {
  peerId: string;
  nickName: string;
  picture: string;
  todayTotalDuration: number;
};

export type JOIN_ROOM_DATA = {
  selfPeerId: string; // Disconnection handling할때 nest log에서 편하게 알아보기 위해
  roomId: string;
  existingProducers: ProducerPayload[];
  participantBasicDataArray: ParticipantBasicData[];
};

/** Ack `data` for batch preferred spatial layer on all of a peer's consumers (server shape). */
export type CommonPreferredLayersForAllConsumersData = {
  succeeded: number;
  failed: Array<{ consumerId: string; reason: string }>;
};

export type ConsumerLayersPayload = {
  spatialLayer: number;
  temporalLayer?: number;
};

export type ConsumerLayersChangedPayload = {
  consumerId: string;
  layers?: ConsumerLayersPayload;
};

export type SocketID = string;

export type PeerStatus = {
  doesPeerExistInPeerMap: boolean;
  isPeerInRoom: boolean;
};
