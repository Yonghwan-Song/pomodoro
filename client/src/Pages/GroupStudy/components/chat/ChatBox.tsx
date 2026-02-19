import { useState } from "react";
import { css } from "../../../../../styled-system/css";
import { ChatMessage, type ChatMessageData } from "./ChatMessage";

interface ChatBoxProps {
  messages: ChatMessageData[];
  onSendMessage: (message: string) => void;
  mySocketId: string;
}

export function ChatBox({ messages, onSendMessage, mySocketId }: ChatBoxProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <div
      className={css({
        position: "fixed",
        bottom: "5",
        right: "5",
        width: "320px",
        height: isOpen ? "450px" : "auto",
        backgroundColor: "white",
        border: "1px solid",
        borderColor: "gray.200",
        borderRadius: "xl",
        display: "flex",
        flexDirection: "column",
        boxShadow: "lg",
        zIndex: 1000,
        overflow: "hidden",
        transition: "height 0.3s ease",
        fontFamily: "sans-serif",
      })}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={css({
          padding: "4",
          backgroundColor: "gray.50",
          borderBottom: isOpen ? "1px solid" : "none",
          borderColor: "gray.200",
          fontWeight: "semibold",
          fontSize: "md",
          color: "gray.900",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          width: "100%",
          textAlign: "left",
          _hover: { backgroundColor: "gray.100" },
        })}
      >
        <span>Chat Room</span>
        <div
          className={css({ display: "flex", alignItems: "center", gap: "2" })}
        >
          <span
            className={css({
              fontSize: "xs",
              color: "gray.500",
              fontWeight: "normal",
            })}
          >
            {messages.length} messages
          </span>
          <span className={css({ fontSize: "xs", color: "gray.400" })}>
            {isOpen ? "▼" : "▲"}
          </span>
        </div>
      </button>

      {isOpen && (
        <>
          {/* Messages */}
          <div
            className={css({
              flex: 1,
              padding: "4",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "3",
              backgroundColor: "white",
            })}
          >
            {messages.length === 0 ? (
              <div
                className={css({
                  textAlign: "center",
                  color: "gray.400",
                  marginTop: "10",
                  fontSize: "sm",
                })}
              >
                No messages yet.
                <br />
                Say hello!
              </div>
            ) : (
              messages.map((msg, idx) => (
                <ChatMessage key={idx} data={msg} mySocketId={mySocketId} />
              ))
            )}
          </div>

          {/* Input */}
          <div
            className={css({
              padding: "4",
              borderTop: "1px solid",
              borderColor: "gray.200",
              backgroundColor: "gray.50",
              display: "flex",
              gap: "2",
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
                borderColor: "gray.300",
                backgroundColor: "white",
                fontSize: "sm",
                outline: "none",
                color: "black",
                _focus: { borderColor: "blue.400" },
              })}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim()}
              className={css({
                paddingX: "4",
                paddingY: "2",
                backgroundColor: input.trim() ? "blue.500" : "gray.400",
                color: "white",
                border: "none",
                borderRadius: "full",
                cursor: input.trim() ? "pointer" : "default",
                fontSize: "sm",
                fontWeight: "medium",
                transition: "background-color 0.2s",
                _hover: input.trim() ? { backgroundColor: "blue.600" } : {},
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
