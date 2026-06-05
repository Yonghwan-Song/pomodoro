import type { ConsumerLayers, RtpParameters, MediaKind } from 'mediasoup/types';

// WARNING: 1) ~~appData는 쓰긴 하는거야?...~~ 2) Producer<AppData>와 비교
// /home/yhs/Repos/pomodoro-from-arch/nest-server/node_modules/mediasoup/node/lib/ProducerTypes.d.ts
// 위에 정의된 Producer와는 뭐 producerId를 get으로 가져와서 여기에다 집어 넣은 것 말고는 연관성이 없음.
export type ProducerPayload = {
  producerId: string;
  peerId: string; // Firebase uid of the producing peer
  kind: 'audio' | 'video';
  displayName?: string;
  // appData?: Record<string, any>; // WARNING: 프로젝트 어디에서도 appData를 사용하고있지 않음. -> 그냥 지운다.
  // 아래의 정의... 랑 뭐 비슷한건가... 맞네?
  // path: /home/yhs/Repos/pomodoro-from-arch/nest-server/node_modules/mediasoup/node/lib/types.d.ts
  // export type AppData = {
  //     [key: string]: unknown;
  // };
};

export type ConsumerOptionsExtended = {
  id: string;
  producerId: string;
  kind: MediaKind;
  rtpParameters: RtpParameters;
  peerId: string;
};

export type AckResponse<T = any> = {
  success: boolean;
  error?: string;
  data?: T;
};

export type DataToSyncForPeerReconnected = {
  peersTodayTotalFocusArray: TodayTotalFocusOfPeer[];
  chatMessages: ChatMessageInfo[];
}

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

export type JOIN_ROOM_DATA = {
  selfPeerId: string; // Disconnection handling할때 nest log에서 편하게 알아보기 위해
  roomId: string;
  existingProducers: ProducerPayload[];
  peersTodayTotalFocusArray: TodayTotalFocusOfPeer[];
};

/** Ack `data` for batch preferred spatial layer on all of a peer's consumers */
export type CommonPreferredLayersForAllConsumersData = {
  succeeded: number;
  failed: Array<{ consumerId: string; reason: string }>;
};

export type ConsumerLayersChangedPayload = {
  consumerId: string;
  layers?: ConsumerLayers;
  // Mediasoup에서 정의한 ConsumerLayers type의 temporalLayer property가 optional인것과
  // I cannot say that layers as an optional property is weird because the ConsumerLayers, which is predefined by the mediasoup, has one of its property temporalLayer as optional.
  // This is because payload is totally different thing. It is possible that a payload might not include a consumerLayers for any reason.
};

export type SocketID = string;
