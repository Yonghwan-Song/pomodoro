# Replace peerRoomMap with peer's property

관념적으로 peerRoomMap이 gateway class에 존재하는것이 이상한 것은 아니라고 생각한다.
그러나, peer class에 자기 자신이 어떤 room에 속해있는지 알지 못한다는 것은 이치에 맞지 않는다고 생각한다.
그에 대한 증거는 어찌보면, room class가 자신의 room에 어떤 peer들이 있는지를 알고 있다는 사실이다.

room.ts
```ts
```

peer.ts
```ts
```
