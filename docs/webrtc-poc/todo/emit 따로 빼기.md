# emit 하는거 빼야함
`signaling-server/src/group-study-management/group-study-management.service.ts`에서...


원래 이 목적이... gateway가 하는 일을 덜어주는거였는데 시바 지금 아예 gateway한테만? 시키기로한 그 고유한 일도 몇개?... 맞나... 얘기 가져왔음.. emit하는거... .. 왜지? 흐름상 밖으로 빼기 어려웠나?

`emit\(`를 위의 파일이 5개 그리고 gateway가 오히려 하나 적게 4개... 흠...


## 어떤 것들을 놓아주지 못했는지 보면

**Broadcasting messages to peers in the same room**

```typescript
  clientSocket
    .to(roomId)
    .emit(EventNames.ROOM_GET_PRODUCER, [producerPayload]); // ??? 이거 전달이 안되는 것 같은데?...

  clientSocket.to(roomId).emit(EventNames.PRODUCER_CLOSED, {
    producerId: targetProducerId,
  });

  clientSocket
    .to(roomId)
    .emit(EventNames.ROOM_PEER_JOINED, { peerId: clientSocket.id }); //! broadcast: 같은 방 사람들에게 알림 (socket.io 기능 사용)
    
  private notifyPeerLeft(clientSocket: Socket, roomId: string) {
    clientSocket
      .to(roomId)
      .emit(EventNames.ROOM_PEER_LEFT, { peerId: clientSocket.id });
  }
  
  private notifyProducerClosed(
    clientSocket: Socket,
    roomId: string,
    producerId: string,
  ) {
    clientSocket.to(roomId).emit(EventNames.PRODUCER_CLOSED, {
      producerId,
    });
  }
```
