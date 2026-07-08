# Disconnection 시 Cleanup 흐름

## 전제: mediasoup cascade close chain

mediasoup는 서버 측에서 다음과 같은 자동 cascade를 제공한다.

```
transport.close()
  → transport 위의 모든 producer.close() (자동)
    → 해당 producer를 consume하던 다른 peer의 consumer에 "producerclose" 이벤트 발생 (자동)
```

이 chain 덕분에 서버에서 transport 하나만 닫으면 연쇄적으로 관련 리소스가 정리된다.

---

## Disconnect 시나리오별 흐름

### 1. 정상 퇴장 (클라이언트가 "방 나가기" 클릭)

```
Client: leaveRoom() 호출
  ├─ producer.close()           ← 내 송신 정리
  ├─ consumersByPeerId 전부 close() ← 내 수신 정리
  ├─ sendTransport.close()
  ├─ recvTransport.close()
  │    └─ consumer "transportclose" 이벤트 발생 → state에서 consumer 제거
  ├─ socket.emit(LEAVE_ROOM)    ← 서버에 알림
  └─ state 초기화 (consumersByPeerId = new Map(), ...)

Server: handlePeerLeaveRoom → leaveRoom()
  ├─ peer의 server-side transport close
  │    └─ cascade: producer close → 다른 peer들의 consumer에 "producerclose"
  ├─ 서버가 다른 peer들에게 PRODUCER_CLOSED emit
  └─ 다른 peer 클라이언트: PRODUCER_CLOSED 수신 → consumersByPeerId에서 해당 consumer 제거
```

양쪽 모두 정상 정리된다.

### 2. 비정상 연결 끊김 (네트워크 단절, 브라우저 종료 등)

```
Server: handleDisconnect(clientSocket) 자동 호출
  ├─ leaveRoom(clientSocket)
  │    └─ cascade: transport close → producer close → 다른 peer들의 consumer "producerclose"
  ├─ 서버가 다른 peer들에게 PRODUCER_CLOSED emit
  └─ 다른 peer 클라이언트: 정상적으로 consumer 정리 ✅

Client (끊긴 본인): socket "disconnect" 이벤트 발생
  └─ ??? (아래 "cascade chain의 한계" 참고)
```

---

## Cascade chain의 한계: "자기 자신"은 정리되지 않는다

mediasoup cascade는 **다른 peer들의 cleanup**을 처리한다.
**끊긴 본인의 client-side state**는 cascade로 정리되지 않는다.

### 왜?

1. **서버 → 클라이언트 알림 불가**: socket이 이미 끊겼으므로 서버가 이 클라이언트에게
   `PRODUCER_CLOSED` 같은 이벤트를 보낼 수 없다.

2. **client-side transport는 자동으로 닫히지 않는다**: socket.io disconnect와
   mediasoup의 client-side transport는 별개의 연결이다.
   `consumer.on("transportclose")`는 client-side `recvTransport.close()`가
   호출될 때만 발생하는데, socket disconnect만으로는 이 호출이 일어나지 않는다.

3. **결과**: socket은 null인데 `consumersByPeerId`에 consumer가 남아있는 상태가 된다.

### 해결: disconnect 핸들러에서 leaveRoom() 호출

```typescript
// connectionStore.ts — socket "disconnect" 이벤트 핸들러
newSocket.on("disconnect", (reason) => {
  get().leaveRoom();   // client-side state 정리
  set({ connected: false }, false, "socket/disconnected");
});
```

`leaveRoom()`이 client-side transport를 닫고, consumer를 정리하고,
state를 초기화한다. 이미 socket이 끊겨있으므로 `socket.emit(LEAVE_ROOM)`은
실질적으로 전달되지 않지만, 서버 측은 `handleDisconnect`에서 이미
자체적으로 정리하므로 문제없다.

---

## 요약: 누가 누구를 정리하는가

| 대상 | 정리 주체 | 메커니즘 |
|---|---|---|
| **다른 peer들의 consumer** (내 producer를 consume하던) | 서버 cascade + `PRODUCER_CLOSED` emit | mediasoup cascade chain |
| **내 client-side consumer** (다른 peer의 producer를 consume하던) | client `disconnect` 핸들러 → `leaveRoom()` | 명시적 cleanup |
| **내 server-side transport/producer/consumer** | 서버 `handleDisconnect` → `leaveRoom()` | 서버 측 명시적 cleanup |
