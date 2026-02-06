// Import the functions you need from the SDKs you need
import { useState, useCallback, useEffect } from "react";

export const useUserMedia = (
  trackOption: { video: boolean; audio: boolean } = {
    video: true,
    audio: true,
  }
) => {
  /**
   * A MediaStream consists of zero or more MediaStreamTrack objects,
   * representing various audio or video tracks.
   * Each MediaStreamTrack may have one or more channels.
   */
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  // MediaStream만 얻기 (공유 시작 X) - Room 입장 전에 호출
  const obtainStream = useCallback(async () => {
    // 이미 stream이 있으면 재사용
    if (stream) return stream;

    try {
      const newStream = await navigator.mediaDevices.getUserMedia(trackOption);
      console.log("[useUserMedia] obtainStream SUCCESS", newStream.id);

      newStream.getTracks().forEach((track) => {
        track.addEventListener("ended", () => {
          console.log(`Track ${track.kind} (${track.label}) ended`);
          console.log("MediaStreamTrack.readyState", track.readyState);
        });
      });
      setStream(newStream);
      return newStream;
    } catch (error) {
      console.error("카메라/마이크에 접근할 수 없습니다:", error);
      return null;
    }
  }, [trackOption, stream]);

  // 이미 있는 stream으로 공유 시작 (produce 트리거)
  const startSharing = useCallback(() => {
    if (stream) {
      console.log("[useUserMedia] startSharing - isSharing set to true");
      setIsSharing(true);
    } else {
      console.warn(
        "[useUserMedia] startSharing called but no stream available"
      );
    }
  }, [stream]);

  // 공유 중지 (isSharing만 false로, stream은 유지)
  const stopSharing = useCallback(() => {
    console.log("[useUserMedia] stopSharing - isSharing set to false");
    setIsSharing(false);
  }, []);

  // stream 완전 해제 (track stop + stream null)
  const releaseStream = useCallback(() => {
    if (stream) {
      console.log("[useUserMedia] releaseStream - stopping tracks");
      stream.getTracks().forEach((track) => track.stop());
    }
    setStream(null);
    setIsSharing(false);
  }, [stream]);

  // TODO: I don't have to stop the tracks here manually. producer.close() should do it. <-- documentation에는 이렇게 나와있기는 한데 실제로 그렇게 될지는 테스트를 해봐야 알 수 있다.
  useEffect(() => {
    // This effect runs when 'stream' changes.
    // If 'stream' was not null, it means we are either starting a new one or just finished one.
    // The cleanup function handles the "stopping" part of the *previous* stream.
    return () => {
      if (stream) {
        console.log("Cleaning up stream tracks...");
        stream.getTracks().forEach((track) => {
          console.log(`Stopping track: ${track.kind} (${track.label})`);
          track.stop();
        });
      }
    };
  }, [stream]);
  /**
   * MediaStreamTrack.stop():
   * Stops playing the source associated to the track, both the source and the track are disassociated.
   * The track state is set to `ended`.
   *
   * `ended` event:
   *  Sent when playback of the track ends (when the value readyState changes to ended), except when the track is ended by calling MediaStreamTrack.stop.
   */

  // 이 훅을 사용하는 컴포넌트가 쓸 수 있도록 필요한 값과 함수들을 반환
  return {
    stream,
    isSharing,
    obtainStream,
    startSharing,
    stopSharing,
    releaseStream,
  };
};
