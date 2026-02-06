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
  canShare,
}: RoomControlsProps) {
  return (
    <div className={css({ display: "flex", gap: "3", marginBottom: "4" })}>
      <button
        type="button"
        onClick={onLeaveRoom}
        className={css({
          paddingX: "4",
          paddingY: "2",
          backgroundColor: "red.500",
          color: "white",
          borderRadius: "md",
          fontWeight: "medium",
          cursor: "pointer",
          border: "none",
          _hover: { backgroundColor: "red.600" },
        })}
      >
        Leave Room
      </button>

      {canShare && (
        <button
          type="button"
          onClick={onToggleSharing}
          className={css({
            paddingX: "4",
            paddingY: "2",
            backgroundColor: isSharing ? "gray.500" : "blue.500",
            color: "white",
            borderRadius: "md",
            fontWeight: "medium",
            cursor: "pointer",
            border: "none",
            _hover: { backgroundColor: isSharing ? "gray.600" : "blue.600" },
          })}
        >
          {isSharing ? "Stop Sharing" : "Start Sharing"}
        </button>
      )}
    </div>
  );
}
