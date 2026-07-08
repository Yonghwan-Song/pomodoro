# Concurrency and Event Ordering in WebSockets (웹소켓 환경에서의 동시성과 이벤트 순서)

> 방에 있는 여러 유저가 "동시에" 집중 시간을 업데이트하면 상태가 꼬이지 않을까?
> 프론트엔드의 상태 관리 라이브러리(Zustand)는 이 이벤트 폭격을 어떻게 버텨낼까?

실시간 다중 접속 애플리케이션(WebRTC, 채팅 등)을 개발하다 보면 자연스럽게 마주하게 되는 **동시성(Concurrency)과 Race Condition(경합 조건)**에 대한 엔지니어링적 고찰과 그 해답을 정리합니다.

---

## 1. 물리적 네트워크와 서버의 처리 (Node.js & Socket.IO)

여러 클라이언트(A, B, C)가 물리적으로 완전히 똑같은 0.000000초에 버튼을 눌렀다고 가정해 봅시다. 
과연 서버는 이 이벤트들을 "동시에" 처리하다가 데이터가 꼬이게 될까요?

### 1-1. 네트워크 카드의 직렬화 (Serialization)
클라이언트 A, B, C가 쏜 패킷은 각기 다른 라우터와 해저 케이블을 거쳐 서버가 위치한 데이터센터로 날아옵니다. 서버 컴퓨터의 **네트워크 인터페이스 카드(NIC)**에 이 패킷들이 도달할 때, 1Gbps 랜카드라 할지라도 내부적으로는 아주 미세한 마이크로초(µs) 단위의 도착 시간 차이가 발생합니다. 
NIC는 이 패킷들을 들어온 순서대로 일렬로 세워(Queueing) 운영체제 커널에 전달합니다. 즉, 네트워크 레이어에서 이미 **"물리적인 동시성"은 "미세한 시간차를 둔 직렬 데이터"로 변환**됩니다.

### 1-2. Node.js의 싱글 스레드 이벤트 루프
이렇게 들어온 TCP/WebSocket 패킷들은 Node.js 환경에서 동작하는 Socket.IO 서버로 전달됩니다.
Node.js의 핵심 아키텍처는 **싱글 스레드 기반의 이벤트 루프(Event Loop)**입니다.

서버는 여러 요청을 멀티 스레드로 병렬 처리하여 자원(Memory/State)을 놓고 싸우는(Race) 방식이 아니라,
도착한 이벤트들을 **이벤트 큐(Event Queue)**에 순서대로 담아두고 메인 스레드가 1개씩 차례대로 꺼내서 실행합니다.

```javascript
// 서버의 동작 흐름 (개념적 모델)
1. NIC -> OS Kernel -> Node.js Event Queue: [Event_A, Event_B, Event_C]
2. Event Loop가 Event_A를 꺼냄 -> 방 안의 사람들에게 Broadcast emit!
3. Event Loop가 Event_B를 꺼냄 -> 방 안의 사람들에게 Broadcast emit!
4. Event Loop가 Event_C를 꺼냄 -> 방 안의 사람들에게 Broadcast emit!
```

결과적으로, 서버는 병목(Bottleneck)이 발생하여 터지는 것이 아니라, 설계된 대로 패킷을 줄 세워 아주 빠르게 **순차적으로 처리**해 냅니다.

---

## 2. 클라이언트의 수신과 상태 병합 (Browser & Zustand)

서버가 순차적으로 뿌려준 `PEER_TODAY_TOTAL_DURATION_UPDATED` 브로드캐스트 이벤트 3개가 이제 내 브라우저(클라이언트)로 쏟아져 들어옵니다. 내 브라우저 화면의 상태(State)는 무사할까요?

### 2-1. 브라우저의 이벤트 루프
브라우저의 자바스크립트 엔진(V8 등) 역시 서버(Node.js)와 마찬가지로 **싱글 스레드 이벤트 루프** 모델로 동작합니다.
웹소켓을 통해 브라우저 프로세스로 수신된 이벤트들은 웹 워커나 백그라운드 스레드에서 함부로 메인 UI 상태를 건드리지 못합니다. 오직 메인 스레드(UI Thread)의 **메시지 큐(Message Queue)**에 쌓이게 됩니다.

### 2-2. Zustand의 안전한 상태 업데이트 패턴
Zustand를 비롯한 모던 상태 관리 라이브러리들은 함수형 업데이트 패턴을 제공하여 Race Condition을 방지합니다.

```typescript
// 클라이언트의 Zustand 상태 업데이트 로직
socket.on('PEER_TODAY_TOTAL_DURATION_UPDATED', (payload) => {
  set((state) => { 
    // 여기서 주입받는 `state`는 무조건 "가장 최신의 상태"입니다.
    const updatedDurations = new Map(state.peerTodayTotalDurations);
    updatedDurations.set(payload.peerId, payload.todayTotalDuration);
    return { peerTodayTotalDurations: updatedDurations };
  });
});
```

이벤트 큐에 쌓인 이벤트들이 다음과 같이 실행됩니다.

1. **이벤트 A 처리 시작:**
   - 현재 Store의 상태(빈 Map)를 가져옵니다.
   - A의 데이터를 Map에 넣습니다.
   - Store 업데이트 완료. (이제 Map에는 A가 있음)
2. **이벤트 B 처리 시작:**
   - **(중요)** 현재 Store의 최신 상태(A가 포함된 Map)를 가져옵니다.
   - B의 데이터를 Map에 넣습니다.
   - Store 업데이트 완료. (Map에 A, B가 있음)
3. **이벤트 C 처리 시작:**
   - Store의 최신 상태(A, B가 포함된 Map)를 가져옵니다.
   - C의 데이터를 Map에 넣습니다.
   - Store 업데이트 완료. (최종적으로 Map에 A, B, C 모두 존재)

만약 `set` 함수 바깥에서 `const currentState = get().peerTodayTotalDurations` 처럼 상태를 미리 꺼내놓고 업데이트를 시도했다면, A, B, C가 모두 "빈 Map"을 기준으로 업데이트를 시도하여 마지막에 실행된 C의 데이터만 남는 참사(Race Condition)가 발생했을 것입니다.

하지만 Zustand의 `set((state) => ...)` 패턴은 호출 시점의 동기적 락(Lock)을 흉내내듯, 그 순간의 가장 최신 상태를 파라미터로 밀어넣어 줌으로써 **이벤트 폭격 속에서도 안전하게 상태를 누적(Merge)**시킬 수 있도록 해줍니다.

---

## 3. 결론

여러 클라이언트가 아무리 동시에 이벤트를 발생시키더라도:
1. **네트워크 레이어와 Node.js 서버**가 물리적인 시간차를 바탕으로 이벤트를 안전하게 **순차적(Serial)**으로 큐에 세워 브로드캐스트합니다.
2. **브라우저의 JS 엔진** 역시 이를 순서대로 큐에서 꺼내어 처리하며, **Zustand의 함수형 업데이트**가 직전 이벤트의 처리가 끝난 '최신 상태' 위에서 다음 이벤트를 처리하도록 보장합니다.

따라서 데이터가 유실되거나 꼬이는 일(Race Condition) 없이 완벽하게 최종 상태(Eventual Consistency)에 도달하게 됩니다.
