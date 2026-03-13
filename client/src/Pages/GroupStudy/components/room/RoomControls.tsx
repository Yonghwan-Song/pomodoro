import { css } from "../../../../../styled-system/css";

interface RoomControlsProps {
  onLeaveRoom: () => void;
  isSharing: boolean;
  onToggleSharing: () => void;
  canShare: boolean;
}

export function RoomControls({
  onLeaveRoom,
  isSharing,
  onToggleSharing,
  canShare
}: RoomControlsProps) {
  return (
    <div
      className={css({
        // Room.tsx에서 "어디에 놓을지" 정렬을 담당하고,
        // 여기서는 "내부 버튼들"의 배치(줄바꿈/간격/수직정렬)를 담당합니다.
        display: "flex",
        flexWrap: "wrap",
        gap: "3",
        alignItems: "center"
      })}
    >
      {canShare && (
        <button
          type="button"
          onClick={onToggleSharing}
          className={css({
            paddingX: "4",
            paddingY: "2",
            backgroundColor: isSharing ? "text.muted" : "accent.secondary",
            color: isSharing ? "text.main" : "bg.canvas",
            borderRadius: "pill",
            fontWeight: "bold",
            cursor: "pointer",
            border: "none",
            _hover: { opacity: 0.8 }
          })}
        >
          {isSharing ? "Stop Sharing" : "Start Sharing"}
        </button>
      )}

      <button
        type="button"
        onClick={onLeaveRoom}
        className={css({
          paddingX: "4",
          paddingY: "2",
          backgroundColor: "status.error",
          color: "bg.canvas",
          borderRadius: "pill",
          fontWeight: "bold",
          cursor: "pointer",
          border: "none",
          _hover: { opacity: 0.8 }
        })}
      >
        Leave Room
      </button>
    </div>
  );
}
