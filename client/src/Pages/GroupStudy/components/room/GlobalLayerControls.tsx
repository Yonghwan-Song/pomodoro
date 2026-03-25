/**
 * GlobalLayerControls — 무엇이고, RoomControls 와는 무엇이 다른가
 *
 * ## 한 줄 요약
 * **내 쪽(WebRTC Consumer)에서 “다른 사람 영상을 어떤 해상도 계층으로 받을지”를,
 * 원격 스트림 전체에 한 번에 요청하는 UI**입니다. (mediasoup simulcast 의 spatial layer 0/1/2)
 *
 * ## RoomControls 와의 차이 (역할이 겹치지 않음)
 *
 * | | RoomControls | GlobalLayerControls (이 파일) |
 * |---|---|---|
 * | 다루는 축 | **내가 방에 참여하는 행위** (나가기, 내 캠 공유 on/off) | **내가 이미 받고 있는 remote 영상의 수신 품질** |
 * | 데이터 흐름 | 부모(Room)가 props 로 콜백만 넘김 — store 직접 안 씀 | `useConnectionStore` 로 `setCommonPreferredLayersForAllConsumers` 호출 |
 * | 시그널링 | produce / producerClosed / leave 등 (송신·세션) 쪽과 연관 | `setCommonPreferredLayersForAllConsumers` 이벤트 (수신 consumer 일괄) |
 * | 범위 | 방 단위 “참여/공유” | “지금 내 peer 가 가진 **모든 consumer**”에 동일 spatial layer 적용 요청 |
 *
 * RoomControls 는 “이 방에서 내 미디어를 켜고 끄고 나간다”이고,
 * 이 컴포넌트는 “이미 consume 중인 **남의** 비디오들을 전부 Low/Mid/High 중 하나로 맞춰 달라”고 서버에 요청하는 쪽입니다.
 *
 * ## VideoPlayer 안의 Low/Mid/High 와의 관계
 * `VideoPlayer` 는 **consumer 하나당** `setConsumerPreferredLayers` → `consumerLayers[consumerId].requestedSpatialLayer` 입니다.
 * All streams 는 **한 번에 모든 consumer**에 같은 layer 를 서버에 요청하지만, **파란 하이라이트는 `lastGlobalPreferredSpatialLayer`**
 * (일괄 UI 전용, `setCommonPreferredLayersForAllConsumers`에서만 갱신) 로 표시합니다.
 * 타일에서 개별로 바꿔도 이 값은 바뀌지 않으므로, “마지막으로 All streams 에서 고른 일괄 의도”와 “각 타일의 실제 요청”이 UI 상에서 섞이지 않습니다.
 *
 * ## 왜 remote consumer 가 없으면 `null` 을 렌더하지?
 * 조절할 대상(consumer)이 없으면 버튼만 보이고 할 일이 없어서, UI 노이즈를 줄이기 위함입니다.
 *
 * ## `inFlightRef` + `pendingLayer`
 * - `inFlightRef`: 연속 클릭/더블클릭으로 동일 요청이 여러 번 나가는 것을 막음 (state 갱신보다 동기적으로 확실).
 * - `pendingLayer`: 어떤 버튼이 진행 중인지 표시(`…`) 및 나머지 버튼 시각적 dim 용.
 */
import { useCallback, useRef, useState } from "react";
import { css } from "../../../../../styled-system/css";
import { useConnectionStore } from "../../../../zustand-stores/connectionStore";

/** simulcast 일반적인 3단 spatial layer — VideoPlayer 의 Low/Mid/High 와 동일한 정수 */
const SPATIAL_LAYERS = [0, 1, 2] as const;

const layerLabel: Record<(typeof SPATIAL_LAYERS)[number], string> = {
  0: "Low",
  1: "Mid",
  2: "High"
};

export function GlobalLayerControls() {
  // 내 recv 쪽에 붙어 있는 consumer 개수 — 0 이면 아래에서 아무것도 렌더하지 않음
  const consumerCount = useConnectionStore((s) => s.consumersByPeerId.size);
  const lastGlobalPreferredSpatialLayer = useConnectionStore(
    (s) => s.lastGlobalPreferredSpatialLayer
  );
  const setCommonPreferredLayersForAllConsumers = useConnectionStore(
    (s) => s.setCommonPreferredLayersForAllConsumers
  );

  const [pendingLayer, setPendingLayer] = useState<number | null>(null);
  const inFlightRef = useRef(false);

  const handlePick = useCallback(
    async (spatialLayer: number) => {
      if (consumerCount === 0 || inFlightRef.current) return;
      inFlightRef.current = true;
      setPendingLayer(spatialLayer);
      try {
        const ack = await setCommonPreferredLayersForAllConsumers(spatialLayer); // AckRes에 failed한 consumer들 array로 받아오는데, 지금은 활용가치가 없어서 받아오지 않았다.
        console.log("ack", ack);
      } finally {
        inFlightRef.current = false;
        setPendingLayer(null);
      }
    },
    [consumerCount, setCommonPreferredLayersForAllConsumers]
  );

  if (consumerCount === 0) {
    return null;
  }

  return (
    <div
      className={css({
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "2"
      })}
      aria-label="Preferred quality for all remote videos"
    >
      {/*
        "All streams" = 내가 받는 모든 remote 비디오 consumer 에 공통 적용된다는 뜻.
        (내 로컬 캠 미리보기 품질과는 무관 — 송신/produce 쪽은 RoomControls + produce 플로우)
      */}
      <span
        className={css({
          fontSize: "xs",
          fontWeight: "medium",
          color: "text.muted",
          whiteSpace: "nowrap"
        })}
      >
        All streams
      </span>
      <div
        className={css({
          display: "flex",
          flexWrap: "wrap",
          gap: "1"
        })}
      >
        {SPATIAL_LAYERS.map((layer) => {
          const isBusy = pendingLayer !== null;
          // 일괄 UI 전용 값만 반영 (타일별 `consumerLayers` 와 독립).
          // in-flight 시 optimistic store 반영 전일 수 있어 pendingLayer 우선.
          const highlightedLayer =
            pendingLayer ?? lastGlobalPreferredSpatialLayer;
          const isSelected = highlightedLayer === layer;
          return (
            <button
              key={layer}
              type="button"
              disabled={isBusy}
              aria-pressed={isSelected}
              onClick={() => void handlePick(layer)}
              className={css({
                paddingX: "3",
                paddingY: "1",
                fontSize: "xs",
                fontWeight: "semibold",
                borderRadius: "pill",
                border: "1px solid",
                borderColor: isSelected ? "blue.300" : "borders.subtle",
                backgroundColor: "bg.surface",
                // VideoPlayer 오버레이 버튼과 같은 토큰 (선택된 spatial layer)
                color: isSelected ? "blue.300" : "text.main",
                cursor: isBusy ? "wait" : "pointer",
                opacity: isBusy && pendingLayer !== layer ? 0.55 : 1,
                _hover: {
                  borderColor: "accent.secondary",
                  color: "blue.300",
                  opacity: isBusy ? 0.55 : 0.92
                },
                _disabled: { cursor: "not-allowed", opacity: 0.5 }
              })}
            >
              {pendingLayer === layer ? "…" : layerLabel[layer]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
