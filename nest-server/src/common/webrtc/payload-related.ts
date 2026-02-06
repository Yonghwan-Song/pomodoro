import type { RtpParameters, MediaKind } from 'mediasoup/node/lib/types';

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

export type SocketID = string;
