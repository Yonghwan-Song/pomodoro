import { StateCreator } from "zustand";
import { ConnectionStore, MediaStreamSlice } from "./types";

export const createMediaStreamSlice: StateCreator<
  ConnectionStore,
  [["zustand/devtools", never], ["zustand/immer", never]],
  [],
  MediaStreamSlice
> = (set, get) => ({
  mediaStream: null,
  isBeingShared: false,
  initializeMediaStreamSliceStates: () => {
    set({
      mediaStream: null,
      isBeingShared: false,
    }, false, "mediaStream/resetToInitialValues")
  },
  // Room에 입장하면
  obtainStream: async (trackOption = { video: true, audio: false }) => {
    const { mediaStream } = get();
    if (mediaStream) return mediaStream;

    try {
      const newStream = await navigator.mediaDevices.getUserMedia(trackOption);
      set({ mediaStream: newStream }, false, "media/streamObtained");
      return newStream;
    } catch (error) {
      console.error("카메라/마이크 접근 실패:", error);
      return null;
    }
  }

  // 예전에 만들어 놓은것. 지금은 안씀.
  // releaseStream: () => {
  //   const { mediaStream } = get();
  //   if (mediaStream) {
  //     mediaStream.getTracks().forEach((track) => track.stop());
  //   }
  //   set(
  //     { mediaStream: null, isBeingShared: false },
  //     false,
  //     "media/streamReleased"
  //   );
  // }
});
