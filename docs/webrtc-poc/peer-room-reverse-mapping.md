# Peer-Room 역매핑 (Reverse Mapping) 패턴

## 📍 위치

`signaling-server/src/signaling/signaling.gateway.ts`

```typescript
private peersMap: Map<string, Peer> = new Map();
private roomsMap: Map<string, Room> = new Map();
private peerToRoomMap: Map<string, string> = new Map(); // peerId -> roomId (역매핑)
```

---

## 🤔 왜 필요한가?

### 문제 상황

Peer가 disconnect될 때, 해당 Peer가 **어느 Room에 있었는지** 빠르게 알아야 합니다.

```typescript
handleDisconnect(client: Socket) {
  // client.id (peerId)는 알고 있음
  // 그런데 이 peer가 어느 room에 있었지?
}
```

### 역매핑 없이 찾는 방법 (비효율적)

```typescript
// 모든 Room을 순회하면서 찾아야 함 - O(n)
let foundRoomId: string | undefined;
for (const [roomId, room] of this.roomsMap) {
  if (room.peers.has(client.id)) {
    foundRoomId = roomId;
    break;
  }
}
```

- **시간 복잡도**: O(n) - Room 개수만큼 순회
- Room이 많아질수록 느려짐

### 역매핑 사용 (효율적)

```typescript
// 바로 조회 - O(1)
const roomId = this.peerToRoomMap.get(client.id);
```

- **시간 복잡도**: O(1) - 상수 시간
- Room이 아무리 많아도 동일한 속도

---

## 📊 데이터 구조 관계

```
peersMap                    roomsMap                   peerToRoomMap
─────────────────           ─────────────────          ─────────────────
socketId → Peer             roomId → Room              socketId → roomId
                                     │
                                     └── peers: Map<socketId, Peer>
```

### 정방향 vs 역방향

| 질문 | 사용하는 Map | 복잡도 |
|------|-------------|--------|
| "이 Room에 누가 있지?" | `room.peers` | O(1) |
| "이 Peer가 어느 Room에 있지?" | `peerToRoomMap` | O(1) |

**역매핑이 없다면** 두 번째 질문에 O(n) 소요

---

## 🔄 동기화 유지

역매핑을 사용할 때 **반드시 양쪽을 동기화**해야 합니다.

### Room 참가 시

```typescript
// 1. Room에 Peer 추가
room.addPeer(peer);

// 2. 역매핑도 추가 (동기화!)
this.peerToRoomMap.set(client.id, roomId);
```

### Room 퇴장 시

```typescript
// 1. Room에서 Peer 제거
room.removePeer(client.id);

// 2. 역매핑도 제거 (동기화!)
this.peerToRoomMap.delete(client.id);
```

⚠️ **주의**: 둘 중 하나만 업데이트하면 데이터 불일치 발생!

---

## 🚀 확장 가능성

### 현재 (단일 서버)

```typescript
private peerToRoomMap: Map<string, string> = new Map();
```

### 미래 (다중 서버 + Redis)

여러 Gateway 인스턴스가 상태를 공유해야 할 때:

```typescript
// Redis를 Map처럼 사용하는 래퍼
private peerToRoomMap = new RedisMap<string, string>('peer-room');
```

### 미래 (DB 기반)

영속성이 필요할 때:

```typescript
// DB를 Map처럼 사용하는 래퍼
private peerToRoomMap = new DbBackedMap<string, string>(this.peerRoomRepository);
```

**Map 인터페이스를 유지하면** 내부 구현만 교체하여 확장 가능!

---

## 💡 일반적인 패턴

이 역매핑 패턴은 다른 곳에서도 자주 사용됩니다:

- **User → Sessions**: 사용자가 어떤 세션들을 가지고 있는지
- **Socket → User**: 소켓이 어떤 사용자에게 속하는지
- **Entity → Parent**: 자식 엔티티가 어떤 부모에 속하는지

**Trade-off**:
- ✅ 조회 성능 향상 (O(n) → O(1))
- ❌ 메모리 추가 사용
- ❌ 동기화 관리 필요

---

## 📅 작성일

2025-01-21