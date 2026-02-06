import { css } from "../../../../../styled-system/css";

export interface ChatMessageData {
  senderId: string;
  message: string;
  timestamp: string;
}

interface ChatMessageProps {
  data: ChatMessageData;
}

export function ChatMessage({ data }: ChatMessageProps) {
  const isMe = data.senderId === "Me";

  return (
    <div
      className={css({
        alignSelf: isMe ? "flex-end" : "flex-start",
        maxWidth: "75%",
        display: "flex",
        flexDirection: "column",
        alignItems: isMe ? "flex-end" : "flex-start",
      })}
    >
      {!isMe && (
        <span
          className={css({
            fontSize: "11px",
            color: "gray.500",
            marginBottom: "1",
            paddingLeft: "1",
          })}
        >
          {data.senderId.substring(0, 6)}
        </span>
      )}

      <div
        className={css({
          backgroundColor: isMe ? "blue.500" : "gray.100",
          color: isMe ? "white" : "gray.800",
          padding: "10px 14px",
          borderRadius: isMe ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
          fontSize: "14px",
          lineHeight: "1.5",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          wordBreak: "break-word",
        })}
      >
        {data.message}
      </div>

      <span
        className={css({
          fontSize: "10px",
          color: "gray.400",
          marginTop: "0.5",
          paddingX: "1",
        })}
      >
        {new Date(data.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </div>
  );
}
