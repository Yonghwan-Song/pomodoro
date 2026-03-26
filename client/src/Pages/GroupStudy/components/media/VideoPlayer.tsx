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

function getCurrentLayerText(layer?: number) {
  return layer == null ? "동기화 중" : `현재 ${getLayerLabel(layer)}`;
}

function getRequestedLayerText(layer?: number) {
  return layer == null ? "요청 자동" : `요청 ${getLayerLabel(layer)}`;
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
  const requestedLayerLabel = getRequestedLayerText(
    layerState?.requestedSpatialLayer
  );
  const currentLayerLabel = getCurrentLayerText(
    layerState?.currentSpatialLayer
  );

  // layerState가 존재하지만 currentSpatialLayer가 undefined이면
  // mediasoup가 현재 어떤 레이어도 forwarding하지 않고 있다는 뜻.
  // 원인은 다양함 (producer pause, 대역폭 부족, 초기 연결 등).
  const noActiveLayer =
    !isLocal &&
    consumerId != null &&
    layerState != null &&
    layerState.currentSpatialLayer === undefined;

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
      className={css({
        width: "100%"
      })}
    >
      <div
        className={css({
          position: "relative",
          width: "100%"
        })}
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
        {noActiveLayer && (
          <div
            className={css({
              position: "absolute",
              inset: "0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0, 0, 0, 0.55)",
              borderRadius: "lg",
              zIndex: 5,
              gap: "3"
            })}
          >
            <div
              className={css({
                width: "8",
                height: "8",
                border: "3px solid rgba(255, 255, 255, 0.25)",
                borderTopColor: "white",
                borderRadius: "full",
                animation: "spin 1s linear infinite"
              })}
            />
            <span
              className={css({
                color: "white",
                fontSize: "sm",
                fontWeight: "medium"
              })}
            >
              영상 수신 대기 중
            </span>
          </div>
        )}
      </div>
      {!isLocal && consumerId && (
        <div
          className={css({
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: "2",
            padding: "2",
            marginTop: "2",
            width: "100%",
            backgroundColor: "bg.canvas",
            borderRadius: "lg",
            border: "1px solid",
            borderColor: "borders.subtle",
            color: "text.main",
            fontSize: "xs",
            minWidth: 0
          })}
        >
          <div
            className={css({
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: "1.5"
            })}
          >
            <span
              className={css({
                paddingX: "2",
                paddingY: "1",
                borderRadius: "full",
                backgroundColor: "bg.surface",
                border: "1px solid",
                borderColor: "borders.subtle",
                color: "text.main",
                whiteSpace: "nowrap"
              })}
            >
              {currentLayerLabel}
            </span>
            <span
              className={css({
                paddingX: "2",
                paddingY: "1",
                borderRadius: "full",
                backgroundColor: "bg.surface",
                border: "1px solid",
                borderColor: "borders.subtle",
                color: "text.muted",
                whiteSpace: "nowrap"
              })}
            >
              {requestedLayerLabel}
            </span>
          </div>
          <div
            className={css({
              display: "inline-flex",
              alignItems: "center",
              gap: "1",
              padding: "1",
              borderRadius: "md",
              backgroundColor: "bg.surface",
              border: "1px solid",
              borderColor: "borders.subtle"
            })}
          >
            <button
              type="button"
              onClick={() => handleQualityChange(0)}
              className={css({
                minWidth: "11",
                paddingX: "2",
                paddingY: "1",
                borderRadius: "sm",
                cursor: "pointer",
                border: "1px solid",
                borderColor:
                  layerState?.requestedSpatialLayer === 0
                    ? "blue.300"
                    : "transparent",
                backgroundColor:
                  layerState?.requestedSpatialLayer === 0
                    ? "bg.surface"
                    : "transparent",
                color:
                  layerState?.requestedSpatialLayer === 0 ? "blue.300" : "text.main",
                _hover: {
                  borderColor:
                    layerState?.requestedSpatialLayer === 0
                      ? "blue.300"
                      : "borders.subtle",
                  backgroundColor: "bg.surface"
                }
              })}
            >
              Low
            </button>
            <button
              type="button"
              onClick={() => handleQualityChange(1)}
              className={css({
                minWidth: "11",
                paddingX: "2",
                paddingY: "1",
                borderRadius: "sm",
                cursor: "pointer",
                border: "1px solid",
                borderColor:
                  layerState?.requestedSpatialLayer === 1
                    ? "blue.300"
                    : "transparent",
                backgroundColor:
                  layerState?.requestedSpatialLayer === 1
                    ? "bg.surface"
                    : "transparent",
                color:
                  layerState?.requestedSpatialLayer === 1 ? "blue.300" : "text.main",
                _hover: {
                  borderColor:
                    layerState?.requestedSpatialLayer === 1
                      ? "blue.300"
                      : "borders.subtle",
                  backgroundColor: "bg.surface"
                }
              })}
            >
              Mid
            </button>
            <button
              type="button"
              onClick={() => handleQualityChange(2)}
              className={css({
                minWidth: "11",
                paddingX: "2",
                paddingY: "1",
                borderRadius: "sm",
                cursor: "pointer",
                border: "1px solid",
                borderColor:
                  layerState?.requestedSpatialLayer === 2
                    ? "blue.300"
                    : "transparent",
                backgroundColor:
                  layerState?.requestedSpatialLayer === 2
                    ? "bg.surface"
                    : "transparent",
                color:
                  layerState?.requestedSpatialLayer === 2 ? "blue.300" : "text.main",
                _hover: {
                  borderColor:
                    layerState?.requestedSpatialLayer === 2
                      ? "blue.300"
                      : "borders.subtle",
                  backgroundColor: "bg.surface"
                }
              })}
            >
              High
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
