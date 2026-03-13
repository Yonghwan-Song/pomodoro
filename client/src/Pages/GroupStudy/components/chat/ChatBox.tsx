import { useMemo, useState } from "react";
import { css } from "../../../../../styled-system/css";
import { ChatMessage, type ChatMessageData } from "./ChatMessage";

type ChatLayout = "sidebar" | "stacked";

interface ChatBoxProps {
  messages: ChatMessageData[];
  onSendMessage: (message: string) => void;
  mySocketId: string;
  layout?: ChatLayout | { base: ChatLayout; lg?: ChatLayout };
  participantCount?: number;
}

export function ChatBox({
  messages,
  onSendMessage,
  mySocketId,
  layout = "stacked",
  participantCount = 1
}: ChatBoxProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [input, setInput] = useState("");

  const heightByLayout =
    typeof layout === "string"
      ? layout === "sidebar"
        ? "100%"
        : isOpen ? "400px" : "auto"
      : {
          base: layout.base === "sidebar" ? "100%" : (isOpen ? "400px" : "auto"),
          lg: layout.lg === "sidebar" ? "100%" : (isOpen ? "400px" : "auto")
        };

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSend();
  };

  const recentActivityLabel = useMemo(() => {
    if (messages.length === 0) return "활동 없음";
    const latest = messages[messages.length - 1]!;
    const latestTime = new Date(latest.timestamp);
    if (Number.isNaN(latestTime.getTime())) return "기록 없음";
    return latestTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [messages]);

  return (
    <div
      className={css({
        width: "100%",
        minWidth: 0,
        height: heightByLayout,
        backgroundColor: "bg.canvas", // 본문 배경색
        border: "1px solid",
        borderColor: "borders.subtle",
        borderRadius: "xl",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 12px 30px rgba(15, 23, 42, 0.16)",
        overflow: "hidden",
        transition: "height 0.2s ease"
      })}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={css({
          padding: "4",
          backgroundColor: "bg.surface", // 헤더 배경색 (비디오 카드 헤더와 동일하게)
          borderBottom: isOpen ? "1px solid" : "none",
          borderColor: "borders.subtle",
          fontWeight: "semibold",
          fontSize: "md",
          color: "text.main",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          width: "100%",
          textAlign: "left",
          _hover: { opacity: 0.92 }
        })}
      >
        <span
          className={css({
            display: "inline-flex",
            alignItems: "center",
            gap: "2",
            fontWeight: "bold"
          })}
        >
          <span
            className={css({
              width: "2",
              height: "2",
              borderRadius: "full",
              backgroundColor: "status.running",
              boxShadow: "0 0 0 3px rgba(80, 250, 123, 0.18)"
            })}
          />
          Chat
        </span>
        <div className={css({ display: "flex", alignItems: "center", gap: "2" })}>
          <span
            className={css({
              fontSize: "xs",
              color: "text.main",
              fontWeight: "medium",
              backgroundColor: "bg.canvas",
              border: "1px solid",
              borderColor: "borders.strong",
              borderRadius: "full",
              paddingX: "2",
              paddingY: "0.5"
            })}
          >
            {messages.length}
          </span>
          <span className={css({ fontSize: "sm", color: "text.muted", width: "5", textAlign: "center" })}>
            {isOpen ? "▾" : "▸"}
          </span>
        </div>
      </button>

      {isOpen && (
        <div
          className={css({
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingX: "4",
            paddingY: "2",
            borderBottom: "1px solid",
            borderColor: "borders.subtle",
            backgroundColor: "bg.canvas", 
            fontSize: "xs",
            color: "text.muted"
          })}
        >
          <span>
            온라인 <strong>{participantCount}</strong>명
          </span>
          <span>최근 활동 {recentActivityLabel}</span>
        </div>
      )}

      {isOpen && (
        <>
          <div
            className={css({
              flex: 1,
              minHeight: 0,
              padding: "4",
              overflowY: messages.length === 0 ? "hidden" : "auto",
              display: "flex",
              flexDirection: "column",
              gap: "3",
              backgroundColor: "bg.canvas", // 메시지 영역 배경
              justifyContent: messages.length === 0 ? "center" : "flex-start"
            })}
          >
            {messages.length === 0 ? (
              <div
                className={css({
                  textAlign: "center",
                  color: "text.subtle",
                  fontSize: "sm",
                  lineHeight: "1.8"
                })}
              >
                아직 메시지가 없습니다.
                <br />첫 인사를 남겨보세요.
              </div>
            ) : (
              messages.map((msg, idx) => (
                <ChatMessage key={idx} data={msg} mySocketId={mySocketId} />
              ))
            )}
          </div>

          <div
            className={css({
              padding: "4",
              borderTop: "1px solid",
              borderColor: "borders.subtle",
              backgroundColor: "bg.surface", // 입력창 감싸는 영역 배경
              display: "flex",
              gap: "2"
            })}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className={css({
                flex: 1,
                padding: "10px 14px",
                borderRadius: "full",
                border: "1px solid",
                borderColor: "borders.strong",
                backgroundColor: "bg.canvas",
                fontSize: "sm",
                outline: "none",
                color: "text.strong",
                transition: "all 0.2s",
                _focus: {
                  borderColor: "accent.secondary",
                  backgroundColor: "bg.canvas",
                  boxShadow: "0 0 0 3px rgba(139, 233, 253, 0.18)"
                }
              })}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim()}
              className={css({
                paddingX: "4",
                paddingY: "2",
                minWidth: "68px",
                backgroundColor: input.trim() ? "accent.secondary" : "bg.subtle",
                color: input.trim() ? "bg.canvas" : "text.muted",
                border: "1px solid",
                borderColor: input.trim() ? "transparent" : "borders.subtle",
                borderRadius: "full",
                cursor: input.trim() ? "pointer" : "default",
                fontSize: "sm",
                fontWeight: "semibold",
                transition: "all 0.2s",
                _hover: input.trim() ? { transform: "translateY(-1px)", filter: "brightness(1.02)" } : {}
              })}
            >
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
}
