# SFU State Management: Peer와 Producer 동기화에 대한 고찰

## 질문

SFU에 `Peer`라는 것은 실제 WWW 상에 흩어져 있는 실제 peer들에 상응하는 것이기 때문에, SFU의 peer들에게도 모든 producer를 등록해서 마치 sync를 맞추는 게 올바른 설계인가?

## 결론

**Over-engineering이다.** 각 Peer 객체에 방 전체 producer 목록을 중복 저장할 필요 없음.

## 현재 설계

### 1. SFU의 `Peer` 객체 구조

```typescript
class Peer {
  producers: Map<string, Producer>; // 자기가 **만든** producer들만 저장
  consumers: Map<string, Consumer>; // 자기가 **소비 중인** consumer들만 저장
}
```

### 2. Global View는 `peersMap`이 담당

```typescript
private peersMap: Map<string, Peer> = new Map();
```

- SFU는 언제든 `peersMap`을 순회하면서 모든 producer를 파악 가능
- 굳이 각 Peer에 "방 전체 producer 목록"을 중복 저장할 필요 없음

### 3. 싱크 맞추기는 Signaling 계층이 담당

| 이벤트                   | 방향            | 목적                   |
| ------------------------ | --------------- | ---------------------- |
| `NEW_PRODUCER_AVAILABLE` | Server → Client | "이런 producer 있어"   |
| `PRODUCER_CLOSED`        | Server → Client | "이 producer 없어졌어" |
| `INTENT_TO_CONSUME`      | Client → Server | "이 producer 소비할게" |

## 왜 이게 올바른 설계인가

1. **Signaling과 State 분리**:

   - "모든 producer에 대한 awareness"는 signaling 이벤트로 동기화
   - 실제 미디어 라우팅 상태는 각 Peer의 producers/consumers로 관리

2. **Single Source of Truth**:

   - 방 전체 상태는 `peersMap` 하나로 관리
   - 중복 저장 시 데이터 불일치 위험

3. **최소 책임 원칙**:
   - 각 Peer는 "내가 뭘 produce하고 있고, 뭘 consume하고 있는가"만 알면 충분

## 요약

```
┌─────────────────────────────────────────────────────────────┐
│                         SFU Server                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                     peersMap                         │   │
│  │  (Global view - 모든 Peer와 그들의 producer 보유)    │   │
│  └─────────────────────────────────────────────────────┘   │
│           │              │              │                   │
│        Peer A         Peer B         Peer C                 │
│     (자기 producer)  (자기 producer)  (자기 producer)        │
│     (자기 consumer)  (자기 consumer)  (자기 consumer)        │
└─────────────────────────────────────────────────────────────┘
                    │
            Signaling Events
            (NEW_PRODUCER_AVAILABLE, PRODUCER_CLOSED)
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                      WWW Clients                            │
│      Client A          Client B          Client C           │
│   (producers state)  (producers state)  (producers state)   │
│   (UI 목록 렌더링)    (UI 목록 렌더링)    (UI 목록 렌더링)     │
└─────────────────────────────────────────────────────────────┘
```

**핵심**: 클라이언트들이 "방에 어떤 producer들이 있는지" 아는 것은 signaling 이벤트로 충분. SFU 내부에서 각 Peer에 모든 producer를 중복 저장할 필요 없음.
