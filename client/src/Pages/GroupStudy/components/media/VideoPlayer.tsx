import { useRef, useEffect } from "react";
import { css } from "../../../../../styled-system/css";
import { useConnectionStore } from "../../../../zustand-stores/connectionStore";

interface VideoPlayerProps {
  stream?: MediaStream | null;
  isLocal?: boolean; // 로컬 비디오인지 여부를 나타내는 prop
  consumerId?: string; // 원격 비디오의 화질 조절을 위한 consumer ID
}

function getLayerLabel(layer?: number) {
  if (layer === 0) return "Low";
  if (layer === 1) return "Mid";
  if (layer === 2) return "High";
  return undefined;
}

const VideoPlayer = ({
  stream,
  isLocal = false,
  consumerId
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // 화질 조절을 위한 store action 및 상태 가져오기
  const setQuality = useConnectionStore(
    (state) => state.setConsumerPreferredLayers
  );
  const layerState = useConnectionStore((state) =>
    consumerId ? state.consumerLayers?.get(consumerId) : undefined
  );
  const requestedLayerLabel = getLayerLabel(layerState?.requestedSpatialLayer);
  const currentLayerLabel = getLayerLabel(layerState?.currentSpatialLayer);

  useEffect(() => {
    if (!videoRef.current) return;

    if (stream) {
      videoRef.current.srcObject = stream;
    } else {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const handleQualityChange = (layer: number) => {
    if (consumerId) {
      setQuality(consumerId, layer);
    }
  };

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
    <div
      className={css({ position: "relative", width: "100%", height: "100%" })}
    >
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
      {!isLocal && consumerId && (
        <div
          className={css({
            position: "absolute",
            bottom: "2",
            right: "2",
            display: "flex",
            alignItems: "center",
            gap: "2",
            padding: "2",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            borderRadius: "md",
            color: "white",
            fontSize: "xs",
            zIndex: 10
          })}
        >
          <span>현재: {currentLayerLabel ?? "확인 중"}</span>
          <span className={css({ color: "whiteAlpha.700" })}>
            요청: {requestedLayerLabel ?? "자동"}
          </span>
          <button
            onClick={() => handleQualityChange(0)}
            className={css({
              paddingX: "1",
              cursor: "pointer",
              // QQQ: 색상은 왜 다 똑같은거야?...
              color:
                layerState?.requestedSpatialLayer === 0 ? "blue.300" : "white",
              _hover: { color: "blue.300" }
            })}
          >
            Low
          </button>
          <button
            onClick={() => handleQualityChange(1)}
            className={css({
              paddingX: "1",
              cursor: "pointer",
              color:
                layerState?.requestedSpatialLayer === 1 ? "blue.300" : "white",
              _hover: { color: "blue.300" }
            })}
          >
            Mid
          </button>
          <button
            onClick={() => handleQualityChange(2)}
            className={css({
              paddingX: "1",
              cursor: "pointer",
              color:
                layerState?.requestedSpatialLayer === 2 ? "blue.300" : "white",
              _hover: { color: "blue.300" }
            })}
          >
            High
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
