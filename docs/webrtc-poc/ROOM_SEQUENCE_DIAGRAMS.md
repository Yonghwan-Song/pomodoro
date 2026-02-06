# Room Feature - Sequence Diagrams

## 1. 방 생성 후 입장 (Create Room & Join)

```mermaid
sequenceDiagram
    participant C as Client (RoomList.tsx)
    participant S as Server (SignalingGateway)

    Note over C: 사용자가 "방 만들기" 클릭
    C->>S: CREATE_ROOM { name: "스터디방" }
    S->>S: handleCreateRoom()
    S->>S: new Room(roomId, name)
    S->>S: roomsMap.set(roomId, room)
    S-->>C: ACK { roomId, name }

    Note over C: navigate(`room/${roomId}`)
    Note over C: Room.tsx 마운트
```

---

## 2. 방 참가 (Join Room)

```mermaid
sequenceDiagram
    participant C as Client (Room.tsx)
    participant S as Server (SignalingGateway)

    Note over C: useParams()로 roomId 추출

    C->>S: JOIN_ROOM { roomId }
    S->>S: handleJoinRoom()
    S->>S: room.addPeer(peer)
    S->>S: peerRoomMap.set(peerId, roomId)
    S->>S: client.join(roomId)
    S->>S: room.getAllProducers()

    S-->>C: ACK { routerRtpCapabilities, existingProducers[], peers[] }

    Note over C: Device.factory()
    Note over C: device.load(routerRtpCapabilities)
    C->>S: SET_DEVICE_RTP_CAPABILITIES
    Note over C: setIsDeviceLoaded(true)

    S--)C: ROOM_PEER_JOINED { peerId } (to other peers)
```

---

## 3. Transport 생성 및 Media 공유

```mermaid
sequenceDiagram
    participant C as Client (Room.tsx)
    participant S as Server (SignalingGateway)

    Note over C: isDeviceLoaded가 true가 되면

    C->>S: CREATE_SEND_TRANSPORT
    S->>S: handleCreateSendTransportRequest()
    S-->>C: SEND_TRANSPORT_CREATED { id, iceParameters, iceCandidates, dtlsParameters }
    Note over C: device.createSendTransport()
    Note over C: setIsSendTransportCreatedLocally(true)

    C->>S: CREATE_RECV_TRANSPORT
    S->>S: handleCreateRecvTransportRequest()
    S-->>C: RECV_TRANSPORT_CREATED { id, iceParameters, iceCandidates, dtlsParameters }
    Note over C: device.createRecvTransport()
    Note over C: setIsRecvTransportCreatedLocally(true)

    Note over C: "Start Sharing" 버튼 활성화
```

---

## 4. Video Producer 생성

```mermaid
sequenceDiagram
    participant C as Client (Room.tsx)
    participant S as Server (SignalingGateway)
    participant O as Other Clients (Same Room)

    Note over C: 사용자가 "Start Sharing" 클릭
    Note over C: startSharing() → getUserMedia()

    Note over C: sendTransport.produce()
    C->>S: CONNECT_SEND_TRANSPORT { dtlsParameters }
    S->>S: handleTransportConnect()
    S->>S: peer.sendTransport.connect()

    C->>S: PRODUCE { kind: "video", rtpParameters }
    S->>S: handleMediaProduceRequest()
    S->>S: peer.sendTransport.produce()
    S->>S: peer.addProducer(producer)

    Note over S: roomId = peerRoomMap.get(peerId)
    S--)O: NEW_PRODUCER_AVAILABLE [{ producerId, socketId, kind }]
    Note over S: client.to(roomId).emit() ← Room 기반!

    S-->>C: ACK { producerId }
    Note over C: producerRef.current = producer
```

---

## 5. Video Consumer 생성 (다른 사람 영상 받기)

```mermaid
sequenceDiagram
    participant C as Client (Room.tsx)
    participant S as Server (SignalingGateway)

    Note over C: producers state에 새 producer 추가됨
    Note over C: useEffect 트리거 (producer consume)

    C->>S: INTENT_TO_CONSUME { producerId }
    S->>S: handleIntentToConsume()
    S->>S: router.canConsume() 확인
    S->>S: recvTransport.consume()
    S-->>C: ACK { id, producerId, kind, rtpParameters, peerId }

    Note over C: recvTransport.consume() → Consumer 생성
    C->>S: RESUME_CONSUMER { consumerId }
    S->>S: consumer.resume()
    S-->>C: ACK { resumed: true }

    Note over C: const { track } = consumer
    Note over C: new MediaStream([track])
    Note over C: handleNewRemoteStream(peerId, stream)
    Note over C: 비디오 표시!
```

---

## 6. 공유 종료 (Producer Close)

```mermaid
sequenceDiagram
    participant C as Client (Room.tsx)
    participant S as Server (SignalingGateway)
    participant O as Other Clients (Same Room)

    Note over C: 사용자가 "Stop Sharing" 클릭
    Note over C: endSharing()
    Note over C: producerRef.current.close()

    C->>S: PRODUCER_CLOSED { producerId }
    S->>S: handleProducerClosed()
    S->>S: producer.close()
    S->>S: peer.producers.delete(producerId)

    Note over S: roomId = peerRoomMap.get(peerId)
    S--)O: PRODUCER_CLOSED { producerId }
    Note over S: client.to(roomId).emit() ← Room 기반!

    Note over O: handleProducerClosed() in useEffect
    Note over O: consumer.close()
    Note over O: handleStreamClosed(peerId)
    Note over O: 비디오 제거!
```

---

## 7. 방 나가기 / 연결 종료

```mermaid
sequenceDiagram
    participant C as Client (Room.tsx)
    participant S as Server (SignalingGateway)
    participant O as Other Clients (Same Room)

    alt 명시적 나가기
        C->>S: LEAVE_ROOM
        S->>S: handleLeaveRoom()
    else 연결 종료
        Note over C: 브라우저 닫기 / 네트워크 끊김
        S->>S: handleDisconnect()
    end

    S->>S: room.removePeer(peerId)
    S->>S: peerRoomMap.delete(peerId)

    loop 해당 peer의 모든 producer
        S--)O: PRODUCER_CLOSED { producerId }
    end

    S--)O: ROOM_PEER_LEFT { peerId }

    Note over S: room.isEmpty() 확인
    alt 방이 비었으면
        S->>S: roomsMap.delete(roomId)
    end
```

---

## 핵심 포인트: Room 기반 격리

```
Before (전체 broadcast):
  client.broadcast.emit(EVENT, data)  ← 모든 연결된 클라이언트에게

After (Room 기반):
  const roomId = peerRoomMap.get(client.id)
  client.to(roomId).emit(EVENT, data)  ← 같은 방에만!
```

**영향받는 이벤트:**

- `NEW_PRODUCER_AVAILABLE`
- `PRODUCER_CLOSED`
- `ROOM_PEER_JOINED`
- `ROOM_PEER_LEFT`
