import { StateCreator } from "zustand";
import { Device } from "mediasoup-client";
import * as mediasoupClient from "mediasoup-client";
import * as EventNames from "../../common/webrtc/eventNames";
import { ConnectionStore, DeviceSlice } from "./types";

export const createDeviceSlice: StateCreator<
  ConnectionStore,
  [["zustand/devtools", never], ["zustand/immer", never]],
  [],
  DeviceSlice
> = (set, get) => ({
  device: null,
  isDeviceLoaded: false,
  initializeDeviceSliceStates: () => {
    set({
      device: null,
      isDeviceLoaded: false,
    }, false, "device/resetToInitialValues")
  },
  // Called in GroupStudy component as a side effect.
  initDevice: async () => {
    const { device, socket } = get();
    if (device?.loaded) {
      set({ isDeviceLoaded: true }, false, "device/alreadyLoaded");
      return;
    }

    try {
      const handlerName = await mediasoupClient.detectDeviceAsync();
      const newDevice = await Device.factory();
      set({ device: newDevice }, false, "device/created");

      if (!socket) return;

      socket.on(
        EventNames.SEND_ROUTER_RTP_CAPABILITIES, // 2
        async (routerRtpCapabilities) => {
          try {
            const currentDevice = get().device;
            if (!currentDevice || currentDevice.loaded) return;

            await currentDevice.load({ routerRtpCapabilities });

            socket.emit(
              EventNames.SET_DEVICE_RTP_CAPABILITIES, // 3
              currentDevice.rtpCapabilities,
              () => {
                set({ isDeviceLoaded: true }, false, "device/loaded");
              }
            );
          } catch (error) {
            console.warn("Error loading device:", error);
          }
        }
      );

      socket.emit(EventNames.GET_ROUTER_RTP_CAPABILITIES); // 1
    } catch (error) {
      console.error("initDevice failed:", error);
    }
  }
});
