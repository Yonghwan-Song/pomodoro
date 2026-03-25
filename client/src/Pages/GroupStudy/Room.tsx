/** @jsxImportSource @emotion/react */
/* eslint-disable react/no-unknown-property */
import { css } from "@emotion/react";
import { useEffect, useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useConnectionStore } from "../../zustand-stores/connectionStore";
import { useBoundedPomoInfoStore } from "../../zustand-stores/pomoInfoStoreUsingSlice";
import { useAuthContext } from "../../Context/AuthContext";
import { ChatBox } from "./components/chat/ChatBox";
import { RoomControls } from "./components/room/RoomControls";
import { GlobalLayerControls } from "./components/room/GlobalLayerControls";
import { VideoGrid } from "./components/room/VideoGrid";
import { RoomTimer } from "./RoomTimer";
import { BoxShadowWrapper } from "../../ReusableComponents/Wrapper";

const roomLayoutCss = css`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px;
  padding: 12px;

  @media (max-width: 1023px) {
    grid-template-columns: 1fr;
  }
`;

const leftColumnCss = css`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const topBarCss = css`
  display: flex;
  justify-content: space-around;
  align-items: center;
  flex-wrap: wrap;
  row-gap: 11px;
`;
// ???:  0 ~ 1023px까지가 대상인건가?
const desktopChatCss = css`
  min-width: 0;
  height: calc(100vh - 100px);

  @media (max-width: 1023px) {
    display: none;
  }
`;

// 모바일에서만 보이는 floating chat FAB
const mobileFloatingFabCss = css`
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 55;
  width: 52px;
  height: 52px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2c7be5, #4da3ff);
  color: #ffffff;
  box-shadow: 0 12px 26px rgba(16, 24, 40, 0.34);
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 30px rgba(16, 24, 40, 0.4);
  }

  @media (min-width: 1024px) {
    display: none;
  }
`;

const mobileFabIconCss = css`
  font-size: 22px;
  line-height: 1;
`;

const mobileBackdropCss = css`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 45;

  @media (min-width: 1024px) {
    display: none;
  }
`;

const mobileOverlayStageCss = css`
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  pointer-events: none;

  @media (min-width: 1024px) {
    display: none;
  }
`;

const mobilePanelCss = css`
  width: min(92vw, 480px);
  height: clamp(480px, calc(100dvh - 180px), 700px);
  max-height: calc(100dvh - 112px);
  overflow: hidden;
  pointer-events: auto;

  @media (min-width: 1024px) {
    display: none;
  }
`;

export function Room() {
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

  const socket = useConnectionStore((s) => s.socket);
  const connected = useConnectionStore((s) => s.connected);
  const stream = useConnectionStore((s) => s.stream);
  const isSharing = useConnectionStore((s) => s.isSharing);
  const obtainStream = useConnectionStore((s) => s.obtainStream);
  const startSharing = useConnectionStore((s) => s.startSharing);
  const isDeviceLoaded = useConnectionStore((s) => s.isDeviceLoaded);
  const isRoomJoined = useConnectionStore((s) => s.isRoomJoined);
  const isSendTransportReady = useConnectionStore(
    (s) => s.isSendTransportReady
  );
  const remoteStreams = useConnectionStore((s) => s.remoteStreams);
  const peerNicknames = useConnectionStore((s) => s.peerNicknames);
  const peerTodayTotalDurations = useConnectionStore(
    (s) => s.peerTodayTotalDurations
  );
  const chatMessages = useConnectionStore((s) => s.chatMessages);
  const joinRoom = useConnectionStore((s) => s.joinRoom);
  const leaveRoom = useConnectionStore((s) => s.leaveRoom);
  const createTransports = useConnectionStore((s) => s.createTransports);
  const endSharing = useConnectionStore((s) => s.endSharing);
  const sendChatMessage = useConnectionStore((s) => s.sendChatMessage);

  const myTodayTotalDuration = useBoundedPomoInfoStore(
    (state) => state.todayTotalDuration
  );

  // useAuthContext()가 초기화 전이거나 Provider 외부일 때 null을 반환할 수 있습니다.
  // null에서 { user }를 구조 분해(destructuring)하려고 하면 런타임 에러(Cannot destructure property...)가 발생하여 앱이 다운됩니다.
  // 이를 방지하고 TypeScript 에러를 해결하기 위해 `|| {}`를 추가하여 null일 경우 빈 객체에서 분해하도록 안전하게 처리했습니다.
  const { user } = useAuthContext() || {};
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  // stream이 없으면 자동으로 카메라 권한 요청
  useEffect(() => {
    if (!stream && connected) {
      console.log("[Room] No stream found, obtaining stream...");
      obtainStream();
    }
  }, [stream, connected, obtainStream]);

  // 방 입장
  useEffect(() => {
    if (socket && connected && roomId && !isRoomJoined) {
      joinRoom(roomId, (error) => {
        alert("방 참가에 실패했습니다: " + error);
        navigate("/group-study");
      });
    }
  }, [socket, connected, roomId, isRoomJoined, joinRoom, navigate]);

  // device loaded + stream 존재 + room joined 시 transport 생성
  useEffect(() => {
    if (isRoomJoined && isDeviceLoaded && stream) {
      createTransports();
    }
  }, [isRoomJoined, isDeviceLoaded, stream, createTransports]);

  // 방 나가기 (UI → store action → navigate)
  const handleLeaveRoom = useCallback(() => {
    leaveRoom();
    navigate("/group-study");
  }, [leaveRoom, navigate]);

  // 채팅 메시지 전송
  const handleSendMessage = useCallback(
    (message: string) => {
      sendChatMessage(message, user?.displayName ?? "");
    },
    [sendChatMessage, user?.displayName]
  );

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileChatOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const handleDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setIsMobileChatOpen(false);
      }
    };

    mediaQuery.addEventListener("change", handleDesktop);
    return () => {
      mediaQuery.removeEventListener("change", handleDesktop);
    };
  }, []);

  return (
    <>
      <div css={roomLayoutCss}>
        <section css={leftColumnCss}>
          <BoxShadowWrapper>
            <div css={topBarCss}>
              <RoomTimer />
              <GlobalLayerControls />
              <RoomControls
                onLeaveRoom={handleLeaveRoom}
                isSharing={isSharing}
                onToggleSharing={isSharing ? endSharing : startSharing}
                canShare={isSendTransportReady}
              />
            </div>
          </BoxShadowWrapper>

          <VideoGrid
            localStream={stream}
            remoteStreams={remoteStreams}
            peerNicknames={peerNicknames}
            myTodayTotalDuration={myTodayTotalDuration}
            peerTodayTotalDurations={peerTodayTotalDurations}
          />
        </section>
        <aside css={desktopChatCss}>
          <ChatBox
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            mySocketId={socket?.id ?? ""}
            layout="sidebar"
          />
        </aside>
      </div>
      <button
        type="button"
        css={mobileFloatingFabCss}
        onClick={() => setIsMobileChatOpen((v) => !v)}
        aria-label={isMobileChatOpen ? "Close chat" : "Open chat"}
      >
        <span css={mobileFabIconCss}>{isMobileChatOpen ? "✕" : "💬"}</span>
      </button>
      {/* Mobile chat overlay */}
      {isMobileChatOpen && (
        <>
          <div
            css={mobileBackdropCss}
            onClick={() => setIsMobileChatOpen(false)}
          />
          <div css={mobileOverlayStageCss}>
            <section css={mobilePanelCss}>
              <ChatBox
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                mySocketId={socket?.id ?? ""}
                layout="sidebar"
              />
            </section>
          </div>
        </>
      )}
    </>
  );
}
