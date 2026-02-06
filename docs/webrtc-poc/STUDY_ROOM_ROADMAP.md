# Study Room Implementation Roadmap

> 이 문서는 WebRTC 기반 Study Room 구현을 위한 핵심 기능 목록과 우선순위를 정리한 것입니다.

## 현재 완료된 기능

- [x] mediasoup Device 생성 및 로드
- [x] Send/Recv Transport 생성
- [x] Video Producer (카메라 공유)
- [x] Video Consumer (상대방 영상 수신)
- [x] Producer Close 처리 (공유 종료 시 UI 정리)

---

## 🔴 필수 기능 (Core)

### 1. Room 개념 구현

**현재 문제**: 모든 사용자가 같은 공간에 있음  
**필요한 것**:

- [ ] Signaling Server에서 Room 관리 (Map<roomId, Room>)
- [ ] Room 생성 API
- [ ] Room 입장/퇴장 이벤트
- [ ] Room별 Producer/Consumer 분리

**참고 파일**:

- `signaling-server/src/` - Room 관리 로직 추가 필요
- `webrtc-client/src/components/Room.tsx` - Room ID 기반 연결

### 2. Audio Track 지원

**현재 문제**: Video만 produce하고 있음  
**필요한 것**:

- [ ] Audio track produce (마이크)
- [ ] Audio consumer 처리
- [ ] Mute/Unmute 기능 (producer.pause/resume)
- [ ] UI: 마이크 on/off 버튼

**구현 위치**: `webrtc-client/src/components/Room.tsx`의 produce 부분 수정

### 3. Room 입장/퇴장 UI

- [ ] Room 목록 페이지
- [ ] Room 생성 버튼
- [ ] Room 참가 버튼
- [ ] 방 나가기 버튼
- [ ] 참가자 목록 표시

### 4. Reconnection 처리

**현재 문제**: 네트워크 끊기면 복구 안 됨  
**필요한 것**:

- [ ] Transport connectionstatechange에서 재연결 로직
- [ ] Socket reconnection 시 상태 복구
- [ ] Producer/Consumer 재생성

---

## 🟡 중요 기능 (Important)

### 5. Camera On/Off

- [ ] 카메라 끄기 (producer.pause)
- [ ] 카메라 켜기 (producer.resume)
- [ ] 서버에 상태 알림 → 다른 peer consumer도 pause

### 6. Screen Sharing

- [ ] `getDisplayMedia()` 사용
- [ ] Video producer와 별도로 Screen producer 관리
- [ ] 화면 공유 시작/종료 UI

### 7. 참가자 목록 UI

- [ ] 현재 Room에 있는 사용자 목록
- [ ] 각 사용자의 audio/video 상태 표시
- [ ] 사용자 이름/아이콘

---

## 🟢 선택 기능 (Nice to Have)

### 8. 채팅

- [ ] Socket.io를 통한 텍스트 메시지
- [ ] Room별 채팅방

### 9. 손들기 (Raise Hand)

- [ ] 손들기 버튼
- [ ] 다른 참가자에게 알림

### 10. 레이아웃 모드

- [ ] Grid View (모두 동일 크기)
- [ ] Focus View (발언자 크게)
- [ ] Active Speaker Detection

### 11. 발언자 하이라이트

- [ ] Audio level 감지
- [ ] 현재 말하는 사람 표시

---

## 추천 구현 순서

```
1. Room 개념 구현 (signaling server)
   ↓
2. Room 입장/퇴장 UI
   ↓
3. Audio track 추가
   ↓
4. Mute/Unmute 기능
   ↓
5. Screen sharing
   ↓
6. Reconnection 처리
```

---

## 참고 링크

- [mediasoup Documentation](https://mediasoup.org/documentation/v3/)
- [mediasoup-client API - Producer](https://mediasoup.org/documentation/v3/mediasoup-client/api/#producer)
- [mediasoup-client API - Consumer](https://mediasoup.org/documentation/v3/mediasoup-client/api/#consumer)
