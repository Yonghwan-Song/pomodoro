import { useRef, useEffect } from "react";

interface VideoPlayerProps {
  stream: MediaStream;
  isLocal?: boolean; // 로컬 비디오인지 여부를 나타내는 prop
}

const VideoPlayer = ({ stream, isLocal = false }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isLocal}
      style={{ width: "320px", margin: "5px", border: "1px solid black" }}
    />
  );
};

export default VideoPlayer;
