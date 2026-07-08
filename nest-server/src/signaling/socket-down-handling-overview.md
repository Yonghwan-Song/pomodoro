# tcp socket is disconnected

## disconnection due to peer's network issue (and -> not restored for x amount of time)

### user is in the lobby

#### server behaviour

- just get him out
- in other words, peer is removed from the peerMap
- meaning that new connection from the same client side is considered as a new one.

#### client behaviour

- keep trying to reconnect -> with the options set when creating the socket.

```typescript
const newSocket = io(BASE_URL, {
  auth: async (cb) => {
    const currentUser = auth.currentUser;
    const token = currentUser ? await currentUser.getIdToken() : "";
    cb({ token });
  },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5
});
```

### user is in a room

#### server behaviour

- there is no timeout to clean up peer for now. 왜그랬지?...
- 그냥 아래처럼 경우의 수를 나눠서 socket이 결국 연결되는 상황만 상정해서 simulation and implementation했음.

```txt
          /** Peer was in a group study session when he was disconnected.
           * What happens if udp and tcp are disconnected and none of them are restored?
           *  - Client Side: (tcp, udp) connections
           *      1. (down, up) Even the Max ICE Restart Attempt Count will not increase if tcp is not restored, causing zero RESTART ICE emission.
           *      2. (up, down) If tcp is restored but udp is not, the variable will hit MAX~COUNT and then LEAVE_ROOM event is going to be handled in this SignalingGateway.
           *        - Since the tcp connection is up though, it is reasonable to keep the user in the peersMap in the server and let him stay at the lobby.
           *      3. (down, down) Just... we need to clean this peer up from our room and lobby too!
           *      4. (up, up) No prob - 최소 한번은 동시에 up, up인 경우가 발생해야 재연결이 되었었다고 볼 수 있다. 아니면 계속 (재)연결 되어있거나....
           *
           * Max count is reached -> user is removed from the room: only item 2 in the list above
           * DESIGN: What about case 1 and 3? How should we handle these? <-- Both are problematic because tcp is not restored.
           *  - case 1: 딱 한번 증가함. 최초 failed handling에서 attemptToRestartIce()를 호출하므로. (attemptToRestartIce()의 호출 횟수만큼 count는 증가)
           *  - case 3: 이것은 그냥 인터넷이 나가버린거잖아....
           * !그러니까 결국 tcp가 down이 x min만큼 지속되면 client쪽에서도 뭔가 조치를 취해야한다. //?(노트북 뚜껑 닫거나, 절전모드 이런거랑은 구분 해야하는데... 어떻게 하지?)
           * tcp가 한번이라도 재연결 되어서 ICE negotitation이 일어나지 않는 한, 답이 없다. 연속이 아니더라도 된다.. udp가 up되었다고 판단할 수 있는
           * udp가 up되었다고 internet이 up된것은 아니지만, internet이 up되었다면 udp는 무조건 up이 된것이라고 볼 수 있다. 라고 우리가 가정한다면,
           * internet이 up되었다는 WebAPI를 활용한 어떤 인지 방법이 존재할 것이고, tcp가 딱 한번 잠시 연결되었다가 끊겼다고 가정했을때, 그 연결당시에 ICE params인가? (ufrag와 pwd)를
           * 우리쪽으로 가져올 수만 있다면(client side로), 그것을 keep해두었다가 방금전에 말한 특정한 event에 반응하여 udp up을 가정할수 있을듯,
           * * 그런데 udp가 up인지는 결국 packet을 던져봐야 알 수 있다고 하는데, 반면에 down인지는 그냥 인터넷 연결상태만 확인하면 되는거 아니야? 인터넷이 연결이 안되었늗네 어떻게
           * * STUN Check packet이 서버쪽에 도달하고 또 뭔가를 받아서 우리가 up이라고 판단할 수 있느냐 이말이지. 그러니까..
           * TODO: 위의 초록색에서 언급한 부분은 실제 서버를 배포한 후에 기존 방식 작동이 통과하고 나면, 그다음에 더 효과적인 방법으로서 시도 해보든 말든 하면 된다. :::...
           *
           */
          /** 절전모드 - docker 도입 하기전에 대략 상상으로 전략 짜보기.
           * ping timeout이 언제 발생할지 뭐 그런거에 대한 생각 하지 말고, 그냥 30분 지나면 꺼지게 해야함. 서버쪽에서도 30분으로 해놓았는데,
           * 이게 동일하지는 않지만 뭐 언저리에서 비슷한 시간대에 끊길테니까 packet이 왔다 갔다할때 걸리는 그런 시간까지 고려하지는 못할듯 (아무튼 그런게 있다고 했음).
           *
           */
```

- 그중 지금 상황과 연관있는 것은 아래임.
  - 1. **(down, up) :** Even the Max ICE Restart Attempt Count will not increase if tcp is not restored, causing zero RESTART ICE emission.
  - 3. **(down, down) :** Just... we need to clean this peer up from our room and lobby too!

##### 1.

이런 경우가 존재하기는 하는거야?... 그냥 clean up해버려 30분 뒤에.

- [ ] just clean up after 30min
- [ ] think about it again after we introducing the fucking.. docker

##### 3.

- [ ] simply clean up after 30min
      이것은 그냥 로비에서 30분간 연결 안된것과 거의 동치라고 봐도 될듯?... _:::..._
- [ ] and think about it again after we introducing the fucking.. docker

#### client behaviour

Get him the fuck out of the room

- give new values to slice states
  - **MediaStreamSliceStates, TransportSliceStates, ProducerSliceStates, ConsumerSliceStates**

##### not sure about the _deviceSliceStates_

### Ping timeout

- [ ] think about it after introducing Docker

- 아래의 코드들은 `/group-study`에 접속하면 실행됨 (in GroupStudy component)
- 그냥 대충 `device: null, isDeviceLoaded: false` 이렇게 초기화 해주면 될듯 그런데 아래가 좀 궁금해.
- [x] device initialization은 서버에서 peer와 어떻게 연관지어지고 있지?
- peer.rtpCapabilities

```tsx
useEffect(() => {
  console.log("in the connect() useEffect");
  connect();
}, [connect]);

useEffect(() => {
  if (connected && socket && !isDeviceLoaded) {
    initDevice();
  }
}, [connected, socket, isDeviceLoaded, initDevice]);
```

**Summary: 그냥 똑같이 초기값을 재대입한다.**
socket연결 직후 device load하고 그 device의 rtpCapabilities가 server peer instance에 저장된다.

## intentional disconnection

### logout

We don't define a dedicated handler in the signaling gateway for this use case.
It is handled as part of the `handleDisconnection()`.
In the viewpoint of the signaling server, disconnect due to _client namespace disconnect_, which is caused by the `socket.disconnect()` in the client side, corresponds to the behaviour, _log out_ in the client side.

### close browser or reload the app for some reasons

- [x] close and check the name of reason
- [ ]

이것은 disconnectReason (`"transport error" | "transport close" | "forced close" | "ping timeout" | "parse error" | "server shutting down" | "forced server close" | "client namespace disconnect" | "server namespace disconnect"`) 중에 뭘까?

_transport close같지?..._
