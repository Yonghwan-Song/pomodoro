import { useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useConnectionStore } from "../../zustand-stores/connectionStore";
import { useAuthContext } from "../../Context/AuthContext";
import { ChatBox } from "./components/chat/ChatBox";
import { RoomControls } from "./components/room/RoomControls";
import { VideoGrid } from "./components/room/VideoGrid";
import { RoomTimer } from "./RoomTimer";

export function Room() {
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
  const chatMessages = useConnectionStore((s) => s.chatMessages);
  const joinRoom = useConnectionStore((s) => s.joinRoom);
  const leaveRoom = useConnectionStore((s) => s.leaveRoom);
  const createTransports = useConnectionStore((s) => s.createTransports);
  const endSharing = useConnectionStore((s) => s.endSharing);
  const sendChatMessage = useConnectionStore((s) => s.sendChatMessage);

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

  return (
    <>
      <RoomControls
        onLeaveRoom={handleLeaveRoom}
        isSharing={isSharing}
        onToggleSharing={isSharing ? endSharing : startSharing}
        canShare={isSendTransportReady}
      />

      <VideoGrid
        localStream={stream}
        remoteStreams={remoteStreams}
        peerNicknames={peerNicknames}
      />

      <ChatBox
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        mySocketId={socket?.id ?? ""}
      />

      <RoomTimer />
    </>
  );
}
