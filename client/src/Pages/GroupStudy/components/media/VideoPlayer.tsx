import { useRef, useEffect } from "react";
import { css } from "../../../../../styled-system/css";

interface VideoPlayerProps {
  stream?: MediaStream | null;
  isLocal?: boolean; // 로컬 비디오인지 여부를 나타내는 prop
}

const VideoPlayer = ({ stream, isLocal = false }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    if (stream) {
      videoRef.current.srcObject = stream;
    } else {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  if (!stream) {
    return (
      <div
        className={css({
          width: "100%",
          maxWidth: "100%",
          aspectRatio: "16 / 9",
          borderRadius: "lg",
          backgroundColor: "bg.canvas"
        })}
      />
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isLocal}
      className={css({
        display: "block",
        width: "100%",
        maxWidth: "100%",
        aspectRatio: "16 / 9",
        objectFit: "cover",
        borderRadius: "lg",
        backgroundColor: "bg.canvas"
      })}
    />
  );
};

export default VideoPlayer;
