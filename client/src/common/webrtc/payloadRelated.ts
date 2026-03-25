import { type ConsumerOptions } from "mediasoup-client/types";

export type ProducerPayload = {
  producerId: string;
  socketId: string;
  kind: "audio" | "video";
  displayName?: string; // 선택적 정보
  appData?: Record<string, any>; // 선택적 커스텀 데이터
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
