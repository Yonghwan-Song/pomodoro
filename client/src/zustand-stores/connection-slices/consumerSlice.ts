import { enableMapSet } from "immer";
import type { StateCreator } from "zustand";
import * as EventNames from "../../common/webrtc/eventNames";
import { ConnectionStore, ConsumerSlice, ConsumerLayerState } from "./types";
import {
  AckResponse,
  ConsumerOptionsExtended
} from "../../common/webrtc/payloadRelated";
import { types as mediasoupTypes } from "mediasoup-client";

enableMapSet();

export const createConsumerSlice: StateCreator<
  ConnectionStore,
  [["zustand/devtools", never], ["zustand/immer", never]],
  [],
  ConsumerSlice
> = (set, get) => {
  // utilities

  return {
    consumersByPeerId: new Map(),
    consumerLayers: new Map(),
    lastGlobalPreferredSpatialLayer: undefined,
    initializeConsumerSliceStates: () => {
      set({
        consumersByPeerId: new Map(),
        consumerLayers: new Map(),
        lastGlobalPreferredSpatialLayer: undefined,
      }, false, "consumer/resetToInitialValues")
    },
    // complex one
    // NOTE: joinRoom -> ON ROOM_GET_PRODUCER's Ack cb
    consumePendingProducers: () => {
      const {
        socket,
        isRecvTransportReady,
        recvTransport,
        isDeviceLoaded,
        peerProducerList
      } = get();

      if (!socket || !isRecvTransportReady || !recvTransport || !isDeviceLoaded)
        return;

      peerProducerList.forEach((peerProducer) => {
        if (peerProducer.kind !== "video" || peerProducer.isBeingConsumed)
          return;

        //#region locally
        set(
          (state) => ({
            peerProducerList: state.peerProducerList.map((p) =>
              p.producerId === peerProducer.producerId
                ? { ...p, isBeingConsumed: true } // <---
                : p
            )
          }),
          false,
          "room/markingConsumed"
        );
        //#endregion

        //#region remotely
        // NOTE: RESUME_CONSUMER event is emitted inside the ack res callback of the INTENT_TO_CONSUME.
        socket.emit(
          EventNames.INTENT_TO_CONSUME,
          { producerId: peerProducer.producerId, peerId: peerProducer.peerId },
          // TODO: ack cb 정의 위에 따로 정의하기
          async (response: AckResponse<ConsumerOptionsExtended>) => {
            if (!response.success || !response.data) return;

            const { peerId, ...consumerOptions } = response.data;
            try {
              const currentTransport = get().recvTransport;
              if (!currentTransport) return;

              const consumer = await currentTransport.consume(consumerOptions);

              set(
                (state) => ({
                  consumersByPeerId: new Map(state.consumersByPeerId).set(
                    peerId,
                    consumer
                  ),
                  consumerLayers: new Map(state.consumerLayers).set(
                    consumer.id,
                    {
                      requestedSpatialLayer: undefined,
                      currentSpatialLayer: undefined,
                      isPausedByProducer: consumer.paused,
                      isPausedLocallyByViewer: false
                    }
                  )
                }),
                false,
                "room/consumerCreated"
              );

              // IMPT: Nested emit inside INTENT_TO_CONSUME
              socket.emit(
                EventNames.RESUME_CONSUMER,
                { consumerId: consumer.id },
                (ack: AckResponse) => {
                  if (ack.success) {
                    set(
                      (state) => {
                        const layers = new Map(state.consumerLayers);
                        const existing =
                          layers.get(consumer.id) || ({} as ConsumerLayerState);
                        layers.set(consumer.id, {
                          ...existing,
                          isPausedByProducer: false
                        });
                        return { consumerLayers: layers };
                      },
                      false,
                      "room/consumerResumed"
                    );
                  }
                }
              );

              const newStream = new MediaStream([consumer.track]);
              set(
                (state) => ({
                  remoteStreams: new Map(state.remoteStreams).set(
                    peerId,
                    newStream
                  )
                }),
                false,
                "room/remoteStreamAdded"
              );

              consumer.on("transportclose", () => {
                set(
                  (state) => {
                    const newConsumers = new Map(state.consumersByPeerId);
                    newConsumers.delete(peerId);
                    const newStreams = new Map(state.remoteStreams);
                    newStreams.delete(peerId);
                    const newLayers = new Map(state.consumerLayers);
                    newLayers.delete(consumer.id);
                    return {
                      consumersByPeerId: newConsumers,
                      remoteStreams: newStreams,
                      consumerLayers: newLayers
                    };
                  },
                  false,
                  "room/consumerTransportClosed"
                );
              });
            } catch (error) {
              console.error("Error creating consumer:", error);
            }
          }
        );
        //#endregion
      });
    },

    // simple ones
    // NOTE: pauseOrResumeVideo -> VideoPlayer component
    toggleLocalConsumerPause: (consumerId) => {
      const { consumersByPeerId, consumerLayers, socket } = get();
      let target: mediasoupTypes.Consumer | undefined;
      consumersByPeerId.forEach((c) => {
        if (c.id === consumerId) target = c;
      });
      if (!target || !socket) return;

      const current =
        consumerLayers.get(consumerId) || ({} as ConsumerLayerState);
      const next = !current.isPausedLocallyByViewer;

      next ? target.pause() : target.resume();
      set((s) => {
        const l = new Map(s.consumerLayers);
        l.set(consumerId, { ...current, isPausedLocallyByViewer: next });
        return { consumerLayers: l };
      });

      socket.emit(
        next ? EventNames.PAUSE_CONSUMER : EventNames.RESUME_CONSUMER,
        { consumerId: consumerId },
        (ack: AckResponse) => {
          if (!ack.success) {
            next ? target?.resume() : target?.pause();
            set((s) => {
              const l = new Map(s.consumerLayers);
              l.set(consumerId, { ...current, isPausedLocallyByViewer: !next });
              return { consumerLayers: l };
            });
          }
        }
      );
    },
    // NOTE: setPreferredVideoQuality -> VideoPlayer component
    setConsumerPreferredLayers: (consumerId, spatialLayer) => {
      get().socket?.emit(EventNames.SET_CONSUMER_PREFERRED_LAYERS, {
        consumerId: consumerId,
        spatialLayer: spatialLayer
      });
      set((s) => {
        const l = new Map(s.consumerLayers);
        const e = l.get(consumerId) || ({} as ConsumerLayerState);
        l.set(consumerId, { ...e, requestedSpatialLayer: spatialLayer });
        return { consumerLayers: l };
      });
    },
    // NOTE: setCommonPreferredVideoQuality -> GlobalLayerControls component
    setCommonPreferredLayersForAllConsumers: (spatialLayer) => {
      const { socket, consumersByPeerId } = get();
      if (!socket) return Promise.resolve(null);

      set((s) => {
        const l = new Map(s.consumerLayers);
        consumersByPeerId.forEach((c) => {
          const e = l.get(c.id) || ({} as ConsumerLayerState);
          l.set(c.id, { ...e, requestedSpatialLayer: spatialLayer });
        });
        return {
          consumerLayers: l,
          lastGlobalPreferredSpatialLayer: spatialLayer
        };
      });

      return new Promise((res) => {
        socket.emit(
          EventNames.SET_COMMON_PREFERRED_LAYERS_FOR_ALL_CONSUMERS,
          { spatialLayer: spatialLayer },
          res
        );
      });
    }
  };
};
