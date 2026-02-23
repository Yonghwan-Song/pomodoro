import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useConnectionStore } from "../../zustand-stores/connectionStore";
import * as EventNames from "../../common/webrtc/eventNames";
import type { AckResponse } from "../../common/webrtc/payloadRelated";

interface RoomInfo {
  id: string;
  name: string;
  peerCount: number;
}

export function RoomList() {
  const socket = useConnectionStore((s) => s.socket);
  const connected = useConnectionStore((s) => s.connected);
  const obtainStream = useConnectionStore((s) => s.obtainStream);
  const currentRoomId = useConnectionStore((s) => s.currentRoomId);
  const isRoomJoined = useConnectionStore((s) => s.isRoomJoined);
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // 이미 방에 참가 중이면 해당 방으로 redirect
  useEffect(() => {
    if (isRoomJoined && currentRoomId) {
      navigate(`room/${currentRoomId}`);
    }
  }, [isRoomJoined, currentRoomId, navigate]);

  // 방 목록 조회
  useEffect(() => {
    if (!socket || !connected) return;

    const handleRoomsList = (roomsList: RoomInfo[]) => {
      setRooms(roomsList);
    };

    socket.on(EventNames.ROOMS_LIST, handleRoomsList);
    socket.emit(EventNames.GET_ROOMS); // 연결되면 방 목록 요청

    return () => {
      socket.off(EventNames.ROOMS_LIST, handleRoomsList);
    };
  }, [socket, connected]);

  // 방 생성
  const createRoom = () => {
    if (!socket || !newRoomName.trim()) return;

    setIsCreating(true);
    socket.emit(
      EventNames.CREATE_ROOM,
      { name: newRoomName.trim() },
      (response: AckResponse<{ roomId: string }>) => {
        setIsCreating(false);
        if (response.success && response.data) {
          // 생성 후 바로 입장
          joinRoom(response.data.roomId);
        } else {
          console.error("Failed to create room:", response.error);
          alert("방 생성에 실패했습니다.");
        }
      }
    );
  };

  // 방 참가 - 먼저 카메라 권한을 얻은 후 이동
  const joinRoom = async (roomId: string) => {
    setIsJoining(true);
    try {
      const stream = await obtainStream();
      if (stream) {
        console.log("[RoomList] Stream obtained, navigating to room", roomId);
        navigate(`room/${roomId}`);
      } else {
        alert("카메라 권한이 필요합니다. 권한을 허용해주세요.");
      }
    } catch (error) {
      console.error("Failed to obtain stream:", error);
      alert("카메라 접근에 실패했습니다.");
    } finally {
      setIsJoining(false);
    }
  };

  // 방 목록 새로고침
  const handleRefresh = () => {
    if (socket && connected) {
      socket.emit(EventNames.GET_ROOMS);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Group Study Rooms</h2>

      {/* 방 생성 */}
      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="새 방 이름 입력..."
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createRoom()}
          style={{
            padding: "8px 12px",
            marginRight: "10px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            width: "200px",
          }}
        />
        <button
          onClick={createRoom}
          disabled={isCreating || !newRoomName.trim()}
          style={{
            padding: "8px 16px",
            borderRadius: "4px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          {isCreating ? "생성 중..." : "방 만들기"}
        </button>
      </div>

      {/* 방 목록 헤더 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        <h3 style={{ margin: 0 }}>방 목록 ({rooms.length}개)</h3>
        <button onClick={handleRefresh} style={{ padding: "4px 8px" }}>
          🔄 새로고침
        </button>
      </div>

      {/* 방 목록 */}
      {rooms.length === 0 ? (
        <p style={{ color: "#888" }}>
          현재 열린 방이 없습니다. 새 방을 만들어보세요!
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {rooms.map((room) => (
            <li
              key={room.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                marginBottom: "8px",
                backgroundColor: "#f5f5f5",
                borderRadius: "8px",
              }}
            >
              <div>
                <strong>{room.name}</strong>
                <span style={{ marginLeft: "10px", color: "#666" }}>
                  ({room.peerCount}명 참여 중)
                </span>
              </div>
              <button
                // room.id만 어떻게 제대로 DB에서 가져와서 뿌려주기만 하면 될지도?...
                onClick={() => joinRoom(room.id)}
                disabled={isJoining}
                style={{
                  padding: "6px 12px",
                  borderRadius: "4px",
                  backgroundColor: isJoining ? "#ccc" : "#2196F3",
                  color: "white",
                  border: "none",
                  cursor: isJoining ? "not-allowed" : "pointer",
                }}
              >
                {isJoining ? "접속 중..." : "참가"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 연결 상태 표시 */}
      <div style={{ marginTop: "20px", fontSize: "12px", color: "#888" }}>
        {connected ? "🟢 서버 연결됨" : "🔴 서버 연결 안 됨"}
      </div>
    </div>
  );
}
