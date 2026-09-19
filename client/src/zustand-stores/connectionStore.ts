import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createDeviceSlice } from './connection-slices/deviceSlice';
import { createMediaStreamSlice } from './connection-slices/mediaStreamSlice';
import { createRoomSlice } from './connection-slices/roomSlice';
import { createSocketSlice } from './connection-slices/socketSlice';
import type { ConnectionStore } from './connection-slices/types';
import { createTransportSlice } from './connection-slices/transportSlice';
import { createProducerSlice } from './connection-slices/producerSlice';
import { createConsumerSlice } from './connection-slices/consumerSlice';

/**
 * Socket + Mediasoup (Device, Transport, Media) + Room을 전역 상태로 관리하는 Zustand store.
 * Slice Pattern을 사용하여 로직을 분리함.
 */
export const useConnectionStore = create<ConnectionStore>()(
  devtools(
    immer((...a) => ({
      ...createSocketSlice(...a),
      ...createDeviceSlice(...a),
      ...createMediaStreamSlice(...a),
      ...createTransportSlice(...a),
      ...createProducerSlice(...a),
      ...createConsumerSlice(...a),
      ...createRoomSlice(...a),
    })),
    { name: 'ConnectionStore' },
  ),
);

export type { ConnectionStore };
