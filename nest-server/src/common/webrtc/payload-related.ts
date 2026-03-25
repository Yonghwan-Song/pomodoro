import type { ConsumerLayers, RtpParameters, MediaKind } from 'mediasoup/types';

export type ProducerPayload = {
  producerId: string;
  socketId: string;
  kind: 'audio' | 'video';
  displayName?: string;
  appData?: Record<string, any>;
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
