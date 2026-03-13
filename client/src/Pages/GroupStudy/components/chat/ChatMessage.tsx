import { css } from "../../../../../styled-system/css";

// TODO: 이거 type정의파일을 따로 만들
export interface ChatMessageData {
  senderId: string;
  senderNickname: string;
  message: string;
  timestamp: string;
}

interface ChatMessageProps {
  data: ChatMessageData;
  mySocketId: string;
}

export function ChatMessage({ data, mySocketId }: ChatMessageProps) {
  const isMe = data.senderId === mySocketId;

  return (
    <div
      className={css({
        alignSelf: isMe ? "flex-end" : "flex-start",
        maxWidth: "82%",
        display: "flex",
        flexDirection: "column",
        alignItems: isMe ? "flex-end" : "flex-start",
        gap: "1"
      })}
    >
      {!isMe && (
        <span
          className={css({
            fontSize: "10px",
            color: "text.subtle",
            paddingLeft: "2",
            fontWeight: "medium",
            letterSpacing: "0.02em"
          })}
        >
          {data.senderNickname}
        </span>
      )}

      <div
        className={css({
          backgroundColor: isMe ? "accent.secondary" : "bg.elevated",
          color: isMe ? "bg.canvas" : "text.strong",
          border: isMe ? "none" : "1px solid",
          borderColor: isMe ? "transparent" : "borders.subtle",
          padding: "10px 13px",
          borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          fontSize: "14px",
          lineHeight: "1.5",
          boxShadow: isMe
            ? "0 6px 18px rgba(139, 233, 253, 0.22)"
            : "0 2px 8px rgba(15, 23, 42, 0.08)",
          wordBreak: "break-word"
        })}
      >
        {data.message}
      </div>

      <span
        className={css({
          fontSize: "10px",
          color: "text.muted",
          paddingX: "2"
        })}
      >
        {new Date(data.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        })}
      </span>
    </div>
  );
}
