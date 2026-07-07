import { enableMapSet } from 'immer';
import type { StateCreator } from 'zustand';
import * as EventNames from '../../common/webrtc/eventNames';
import { ConnectionStore, ProducerSlice } from './types';
import { AckResponse } from '../../common/webrtc/payloadRelated';
import { createSimulcastEncodingsFromTrack } from './utils';

enableMapSet();

export const createProducerSlice: StateCreator<
  ConnectionStore,
  [['zustand/devtools', never], ['zustand/immer', never]],
  [],
  ProducerSlice
> = (set, get) => {
  return {
    producer: null,
    isProducerPaused: false,
    initializeProducerSliceStates: () => {
      set(
        {
          producer: null,
          isProducerPaused: false,
        },
        false,
        'producer/resetToInitialValues',
      );
    },
    produce: async () => {
      const { mediaStream, isBeingShared, sendTransport, producer } = get();
      if (!mediaStream || !isBeingShared || !sendTransport || producer) return;

      const videoTrack = mediaStream.getVideoTracks()[0];
      if (!videoTrack) return;

      try {
        const newProducer = await sendTransport.produce({
          track: videoTrack,
          stopTracks: false,
          encodings: createSimulcastEncodingsFromTrack(
            videoTrack.getSettings(),
          ),
          codecOptions: { videoGoogleStartBitrate: 1000 },
        });
        set({ producer: newProducer }, false, 'room/produced');
      } catch (e) {
        console.error('Produce failed', e);
      }
    },

    /**
     * TODO: 1. remove endSharing and create closeProducer()
     *       2. define a new stopSharing where the closeProducer() above is invoked.
     */
    closeProducer: () => {
      const { producer, socket } = get();
      if (producer) {
        producer.close();
        socket?.emit(EventNames.PRODUCER_CLOSED, { producerId: producer.id });
        set({ producer: null, isProducerPaused: false });
      }
    },

    // The following two functions are responsible for toggling user sharing his video.
    pauseProducer: () => {
      const { producer, socket, isProducerPaused } = get();
      if (!producer || !socket || isProducerPaused) return;
      producer.pause();
      socket.emit(
        EventNames.PAUSE_PRODUCER,
        { kind: 'video' },
        (ack: AckResponse) => {
          if (!ack.success) {
            producer.resume();
            set({ isProducerPaused: false });
          }
        },
      );
      set({ isProducerPaused: true });
    },

    resumeProducer: () => {
      const { producer, socket, isProducerPaused } = get();
      if (!producer || !socket || !isProducerPaused) return;
      producer.resume();
      socket.emit(
        EventNames.RESUME_PRODUCER,
        { kind: 'video' },
        (ack: AckResponse) => {
          if (!ack.success) {
            producer.pause();
            set({ isProducerPaused: true });
          }
        },
      );
      set({ isProducerPaused: false });
    },
  };
};
