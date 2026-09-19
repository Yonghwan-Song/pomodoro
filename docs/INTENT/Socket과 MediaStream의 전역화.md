# Socket과 MediaStream의 전역화

```txt
 group study url로 타고 들어가면 지금 socket을 연결해서 이 page url 아래엤는
  component들에 한해서 context로 공유하잖아? 그런데, socket 연결 자체는 "group-study"
   url에 접속했을 때 수립되지만 (useSocket()으로), 받아온 이 socket을 global
  state으로 저장할 수는 없나? 만약 이렇게 우선 설정을해놓고 추후 다른 설정들을
  조정하면, competitive room (각자의 timer를 돌리는)에서는 명시적으로 leave button을
  누르지 않는 이상, 어차피 그냥 화면만 공유하는 방에 있고 각자의 스케쥴대로 움직이는
  거니까, 다른 page url들을 자유롭게 움직여도 방에서 disconnect되지 않게 할 수
  있지않을까? 좀 어색한 디자인이긴 한데 그래도 뭔가 자유도가 높아지니까 구현 난이도가
   어렵지 않다면 시도해보고싶어서.
```

## 설계: 4개 레이어 분리

현재 GroupStudy.tsx에 뭉쳐있는 로직을 레이어별로 분리하고, 각각을 Zustand store (별도 store, pomo store와 분리)의 slice로 전역화한다.

| Layer | 상태 | 수명 |
|-------|------|------|
| 1. Socket | socket, connected | 로그인 ~ 명시적 disconnect |
| 2. Device | device, isDeviceLoaded | socket 연결 ~ disconnect |
| 3. Media | stream, isSharing | 카메라 권한 획득 ~ 명시적 release |
| 4. Room | transports, producer, consumers, chat | JOIN_ROOM ~ LEAVE_ROOM |

Layer 1~3이 전역이 되면, 페이지 이동해도 socket/device/stream이 유지되므로 competitive room에서 자유로운 페이지 이동이 가능해진다.

## Phase 계획

### Phase 1: socketSlice -- 완료

- [x] `useSocket` hook의 로직을 `zustand-stores/socketStore.ts`로 이동
- [x] `GroupStudy.tsx`에서 `useSocketStore`로 교체
- [x] socket이 컴포넌트 unmount에 자동 disconnect되지 않도록 변경

### Phase 2: deviceSlice -- 완료

- [x] Device 생성 + RTP capabilities 로드를 하나의 `initDevice()` action으로 합침
- [x] GroupStudy.tsx의 device 관련 useEffect 3개 제거 (→ 1개로)

### Phase 3: mediaSlice -- 완료

- [x] `useUserMedia` hook의 로직을 store에 이동 (obtainStream, startSharing, stopSharing, releaseStream)
- [x] stream cleanup을 `releaseStream()`에서 명시적으로 처리 (useEffect cleanup 제거)

### Phase 4: roomSlice -- 완료

- [x] Room.tsx의 transport/producer/consumer 로직을 store로 이동 (652줄 → 93줄)
- [x] `joinRoom(roomId)` / `leaveRoom()` / `createTransports()` / `produce()` / `endSharing()` / `sendChatMessage()` action 생성
- [x] Room.tsx는 UI 렌더링 + 3개 useEffect만 담당
- [x] RoomList에서 store 직접 읽도록 변경 + 방 참가 중이면 자동 redirect

### Phase 5: GroupStudy.tsx 정리 -- 완료

- [x] Outlet context 제거 (모든 자식이 store에서 직접 읽음)
- [x] GroupStudy.tsx는 레이아웃 컴포넌트로 축소 (connect + initDevice + `<Outlet />`)
- [x] `useConnectionInfoContext` 더 이상 사용되지 않음 (정의 파일만 잔존)
