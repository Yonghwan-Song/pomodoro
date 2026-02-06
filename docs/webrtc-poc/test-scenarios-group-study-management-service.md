# WebRTC Application Test Scenarios - 그룹스터디 management service만들고 난 후에 테스트 하는 것임. (20260123)

이 문서는 WebRTC 스터디 그룹 애플리케이션의 핵심 기능인 **방 입장, 미디어 공유(Produce), 미디어 수신(Consume), 방 퇴장(Leave)**에 대한 테스트 시나리오를 정의합니다.

## ✅ 사전 조건 (Pre-conditions)

1.  서버(`signaling-server`)가 정상적으로 실행 중이어야 한다.
    - Mediasoup Worker가 로드되어야 함.
    - Socket.IO Gateway가 포트를 열고 대기 중이어야 함.
2.  클라이언트(`webrtc-client`)가 최소 2개의 브라우저 탭(또는 다른 기기)에서 실행 가능해야 한다.
    - **User A**: 방장 역할 (먼저 입장)
    - **User B**: 참가자 역할 (나중에 입장)
3.  브라우저 권한(카메라/마이크)이 허용되어야 한다.

---

## 🧪 시나리오 1: 방 생성 및 입장 (Single User)

**목표**: User A가 방에 입장하여 기본적인 WebRTC 연결(Transport)을 수립하는지 확인한다.

### 1.1 방 입장 (Join Room)

1.  **User A**: `http://localhost:3000/room/test-room-1` 접속.
2.  **Expected (Logs)**:
    - Client Console: `Room joined successfully: { roomId: 'test-room-1', ... }`
    - Server Log: `Peer [id] joined room test-room-1`

### 1.2 Transport 생성 (Create Transports)

1.  **자동 실행**: 방 입장 후 자동으로 Transport 생성을 요청함.
2.  **Expected (Logs)**:
    - Client Console: `verify: local send-transport has been created`
    - Client Console: `verify: local recv-transport has been created`
    - Server Log: `verify: remote send-transport has been created`
    - Server Log: `verify: remote recv-transport has been created`

### 1.3 미디어 공유 시작 (Produce)

1.  **User A**: "Start Sharing" 버튼 클릭.
2.  **Expected (UI)**: "My Video" 섹션에 로컬 카메라 화면이 나타남.
3.  **Expected (Logs)**:
    - Client Console: `Video Producer created: { id: ... }`
    - Client Console: `Produce success { producerId: ... }`

---

## 🧪 시나리오 2: 다자간 미디어 스트리밍 (P2P Mesh/SFU)

**목표**: User B가 입장했을 때, 이미 방송 중인 User A의 영상을 보고, User B도 방송을 시작하면 User A가 이를 볼 수 있는지 확인한다.

### 2.1 늦게 들어온 참가자 (Late Joiner)

1.  **User B**: `http://localhost:3000/room/test-room-1` 접속 (User A는 이미 공유 중).
2.  **Expected (User B)**:
    - 입장 직후 `existingProducers` 목록을 받음.
    - 자동으로 `INTENT_TO_CONSUME` 실행.
    - **UI**: "Remote Video from [User A]" 화면이 나타나야 함.
3.  **Expected (Server)**:
    - `Consumer [id] created` 로그 확인.

### 2.2 새로운 방송 시작 (New Producer)

1.  **User B**: "Start Sharing" 버튼 클릭.
2.  **Expected (User A)**:
    - 소켓 이벤트 `EventNames.ROOM_GET_PRODUCER` 수신.
    - 자동으로 `INTENT_TO_CONSUME` 실행.
    - **UI**: "Remote Video from [User B]" 화면이 추가됨.

---

## 🧪 시나리오 3: 미디어 공유 중단 (Stop Sharing)

**목표**: "Stop Sharing" 버튼을 눌렀을 때(Graceful Stop), 상대방 화면에서 영상이 사라지는지 확인한다.

### 3.1 공유 중단

1.  **User A**: "Stop Sharing" 버튼 클릭.
2.  **Expected (User A - Local)**:
    - `producer.close()` 실행됨.
    - `track.stop()` 실행됨 (카메라 불 꺼짐).
    - **UI**: "My Video" 사라짐.
3.  **Expected (User B - Remote)**:
    - 소켓 이벤트 `PRODUCER_CLOSED` 수신.
    - `consumer.close()` 실행.
    - **UI**: "Remote Video from [User A]" 사라짐.

---

## 🧪 시나리오 4: 방 퇴장 및 연결 종료 (Disconnect/Leave)

**목표**: 사용자가 방을 나가거나 브라우저를 닫았을 때, 서버와 다른 클라이언트가 이를 올바르게 인지하고 리소스를 정리하는지 확인한다.

### 4.1 "Leave Room" 버튼 클릭 (Explicit Leave)

1.  **User B**: "Leave Room" 클릭.
2.  **Expected (User B)**:
    - `/group-study` (로비)로 이동.
    - `socket.emit('LEAVE_ROOM')` 전송.
3.  **Expected (Server)**:
    - `Peer [id] left room test-room-1` 로그.
    - `peersMap`에서는 유지(로비 상태), `roomsMap`의 해당 방 멤버 목록에서 제거.
    - `peer.close()` -> `transportclose` 이벤트 발생 -> 모든 Producer/Consumer 정리.
4.  **Expected (User A)**:
    - 소켓 이벤트 `ROOM_PEER_LEFT` 수신 (선택 사항 - UI 업데이트용).
    - (중요) `PRODUCER_CLOSED` 이벤트 수신 (User B의 Transport가 닫히면서 Trigger됨).
    - **UI**: User B의 화면 사라짐.

### 4.2 탭 닫기 / 새로고침 (Unexpected Disconnect)

1.  **User A**: 브라우저 탭 닫기.
2.  **Expected (Server)**:
    - `handleDisconnect` 실행.
    - `Client disconnected: [id]` 로그.
    - `peersMap`에서도 완전 삭제 (GC).
3.  **Expected (User B)**:
    - User A의 영상이 멈추거나 사라짐 (`PRODUCER_CLOSED` 수신).

---

## 🐞 엣지 케이스 (Edge Cases to Watch)

1.  **재입장 (Re-join)**: 방을 나갔다가(`Leave Room`) 즉시 다시 들어오면(`Join Room`) 정상 작동하는가? (Socket ID 유지 여부 확인)
2.  **새로고침 (Refresh)**: 방 안에서 새로고침(F5) 하면, 소켓이 끊기고(Disconnect) -> 다시 연결(Connect) -> 방 입장(Join) 시퀀스가 빠르게 일어나면서 꼬이지 않는가?
3.  **네트워크 단절**: WiFi를 껐다 켰을 때 `ICE state`가 `disconnected` -> `connected`로 복구되는가? (현재 구현 범위 밖일 수 있음)
