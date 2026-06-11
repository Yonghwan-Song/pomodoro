import {
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
  MessageBody
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { DisconnectReason } from 'socket.io';
import { MediasoupService } from 'src/mediasoup/mediasoup.service';
import * as EventNames from 'src/common/webrtc/event-names';
import type {
  AckResponse,
  CommonPreferredLayersForAllConsumersData,
  ConsumerOptionsExtended,
  JOIN_ROOM_DATA
} from 'src/common/webrtc/payload-related';
import type {
  IceParameters,
  ProducerOptions,
  RtpCapabilities
} from 'mediasoup/types';
import { GroupStudyManagementService } from 'src/group-study-management/group-study-management.service';
import * as admin from 'firebase-admin';
import { Room } from 'src/group-study-management/entities/room.entity';
import { Peer } from 'src/group-study-management/entities/peer.entity';

//#region 차단 명령어들
// # 차단
// sudo iptables -A INPUT -p tcp -s 10.20.105.210 --sport 3000 -j DROP
// sudo iptables -A OUTPUT -p tcp -d 10.20.105.210 --dport 3000 -j DROP
// # 해제
// sudo iptables -D INPUT -p tcp --sport 3000 -j DROP
// sudo iptables -D OUTPUT -p tcp --dport 3000 -j DROP
//
// UDP
// sudo iptables -A INPUT -p udp -s 10.20.105.210 --sport 37735 -j DROP
// sudo iptables -D INPUT -p udp -s 10.20.105.210 --sport 37735 -j DROP
// sudo iptables -A OUTPUT -p udp -d 10.20.105.210 --dport <send:num> -j DROP
// sudo iptables -D INPUT -p udp -d 10.20.105.210 --dport <send:num> -j DROP
// #endregion
@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:4173',
      'https://pomodoro-yhs.vercel.app',
      'https://pomodoro-4sfpbz4x8-yhs-projects-00a441cb.vercel.app',
      'https://pomodoro-git-feature-integrate-webrtc-yhs-projects-00a441cb.vercel.app',
      'http://localhost:3001',
      'http://localhost:3000'
    ],
    credentials: true
  }
})
export class SignalingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly mediasoupService: MediasoupService,
    private readonly groupStudyManagementService: GroupStudyManagementService
  ) { }

  afterInit(server: Server) {
    server.use(async (socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication token required'));
      try {
        const decoded = await admin.auth().verifyIdToken(token);
        socket.data.userEmail = decoded.email;
        socket.data.uid = decoded.uid;
        socket.data.userNickname = decoded.name;
        next();
      } catch (err) {
        console.warn('firebase token related error thrown in afterInit', err);
        next(new Error('Authentication failed'));
      }
    });
  }

  //#region Socket connection/disconnection related
  /**
   * [클라이언트 특정 탭(소켓) TCP 연결 차단 테스트 방법]
   * 아래 upgrade 이벤트 로그에서 출력되는 IP와 PORT를 확인하여 다음 명령어를 터미널에 입력하세요.
   *
   * 1. IPv6 (IP가 '::1' 등인 경우) - ip6tables 사용
   *    차단:
   *    sudo ip6tables -I INPUT 1 -p tcp -i lo --sport <PORT> -j DROP
   *    sudo ip6tables -I OUTPUT 1 -p tcp -o lo --dport <PORT> -j DROP
   *    해제:
   *    sudo ip6tables -D INPUT -p tcp -i lo --sport <PORT> -j DROP
   *    sudo ip6tables -D OUTPUT -p tcp -o lo --dport <PORT> -j DROP
   *
   * 2. IPv4 (IP가 '::ffff:127.0.0.1' 또는 '127.0.0.1'인 경우) - iptables 사용
   *    차단:
   *    sudo iptables -I INPUT 1 -p tcp -i lo --sport <PORT> -j DROP
   *    sudo iptables -I OUTPUT 1 -p tcp -o lo --dport <PORT> -j DROP
   *    해제:
   *    sudo iptables -D INPUT -p tcp -i lo --sport <PORT> -j DROP
   *    sudo iptables -D OUTPUT -p tcp -o lo --dport <PORT> -j DROP
   */
  handleConnection(clientSocket: Socket) {
    const uid = clientSocket.data.uid as string;

    const clientPort = clientSocket.request.socket.remotePort;
    const clientIp = clientSocket.request.socket.remoteAddress;
    console.log(
      `[SignalingGateway:handleConnection] New connection from\n   UID=${uid}, ` +
      `IP=${clientIp}, PORT=${clientPort}`
    );

    //#region Add/Succeeds a peer
    // If a Peer with this uid already exists, treat it as a reconnect and
    // swap in the new socket without clearing peer/room state on disconnect.
    // Otherwise, this is a fresh connection — create a new Peer.
    const existingPeer = this.groupStudyManagementService.getPeer(uid);

    // RECONNECTION
    if (existingPeer) {
      // NOTE: reconnection
      console.log(
        `[SignalingGateway:handleConnection] Reconnect detected for uid=${uid}. ` +
        `Reusing existing peer and updating socket to ${clientSocket.id}.`
      );

      if (existingPeer.removalTimer !== null) {
        console.log(
          `about to clear existingPeer scheduled removal of ${existingPeer.id}`
        );
        clearTimeout(existingPeer.removalTimer);
      }

      this.groupStudyManagementService.updatePeerCurrentSocket(
        uid,
        clientSocket.id
      );

      if (existingPeer.room !== null) {
        const dataToSync =
          this.groupStudyManagementService.prepareDataForSyncOfPeerReconnected(
            // TODO: I need to add data about chat history to the retVal.
            // 1. First I need to
            uid
          );

        dataToSync !== undefined &&
          clientSocket.emit(
            EventNames.SYNC_DATA_TO_PEER_RECONNECTED,
            dataToSync
          );
      } else {
        console.log(
          `The peer ${existingPeer.id} was not joined in any room - no need for data sync`
        );
      }
    } else {
      // NEW CONNECTION
      console.log('new peer just entered the lobby', uid);
      this.groupStudyManagementService.addPeer(
        uid,
        clientSocket.id,
        clientSocket.data.userNickname
      );
    }
    //#endregion

    //#region Event listeners
    // Socket.IO 업그레이드(HTTP Polling -> WebSocket) 시 실제 사용되는 TCP 포트 로깅
    clientSocket.conn.on('upgrade', () => {
      const transport = clientSocket.conn.transport as any;
      const realPort =
        transport.req?.socket?.remotePort ||
        transport.socket?._socket?.remotePort;
      const realIp = clientSocket.conn.remoteAddress;
      const isIPv6 = realIp === '::1' || (realIp && !realIp.includes('.'));
      const firewallCmd = isIPv6 ? 'ip6tables' : 'iptables';

      console.log(
        `[SignalingGateway:handleConnection] Socket upgraded to WebSocket. Real PORT=${realPort} (UID=${uid})\n` +
        `  -> 차단 명령어: sudo ${firewallCmd} -I INPUT 1 -p tcp -i lo --sport ${realPort} -j DROP && sudo ${firewallCmd} -I OUTPUT 1 -p tcp -o lo --dport ${realPort} -j DROP\n` +
        `  -> 해제 명령어: sudo ${firewallCmd} -D INPUT -p tcp -i lo --sport ${realPort} -j DROP; sudo ${firewallCmd} -D OUTPUT -p tcp -o lo --dport ${realPort} -j DROP`
      );
    });

    //*TODO: Pong timeout (pong이 안옴)을 근거로 disconnect이 판단된다고함. (event도 그래서 발생하겠지?)
    //핑타임아웃은 어떻게 또 테스트하냐아아   -> Tlqkf 도커!ㅠㅠ
    clientSocket.on('disconnect', (reason: DisconnectReason) => {
      clientSocket.data.disconnectReason = reason;
      console.log(
        'clientSocket.data.disconnectReason',
        clientSocket.data.disconnectReason
      );
    });
    //#endregion
  }

  //* Pong timeout (pong이 안옴)을 근거로 disconnect이 판단된다고함. (event도 그래서 발생하겠지?)

  // This function runs after the "disconnect" event listener registere in the handleConnection().
  handleDisconnect(clientSocket: Socket) {
    const uid = clientSocket.data.uid as string;
    const disconnectReason = clientSocket.data
      .disconnectReason as DisconnectReason; // Docs -> https://socket.io/docs/v4/server-socket-instance/#disconnect
    const peer: Peer | undefined =
      this.groupStudyManagementService.getPeer(uid);
    console.log('The peer just disconnected', peer);

    if (peer) {
      const room: Room | null = peer.room;

      // DESIGN: 두가지 전제/조건하에서 아래의 block이 logout기능을 할 수 있음. 하나라도 깨지면, event matching 방식으로 바꾼 후 event handler가 로직을 담당하도록 해야함.
      // 그 전제는 내가 깰 수도 있는것이고, socket.io의 api update에 의해서 깨질 수도 있는 것이다. 후자는 나의 통제를 벗어난다.
      // 그렇다면 그 확률에 맡길것인가? (그런데 만약 그것이 best practice라면.. ?)
      // 1. 'client namespace disconnect'는 오로지 client side의 socket의 disconnect() 호출에 의해서만 촉발된다.
      //     (https://socket.io/docs/v4/server-socket-instance/#disconnect)
      // 2. 나는 client side 코드에서, 오로지 logout할때만 이 socket의 disconnect()를 호출한다.
      if (disconnectReason === 'client namespace disconnect') {
        console.log('disconnectReason is client namespace disconnect');
        console.log('about to call closeTransports on peer', peer.id);

        this.groupStudyManagementService.leaveRoom(clientSocket);
        this.groupStudyManagementService.removePeerFromPeerMap(uid);
      } else if (disconnectReason === 'ping timeout') {
        // NOTE: Other cases; for example, NETWORK DISCONNECTION -> "transport close"
        // QQQ: What happens if the reasons for the network down (which we simulate currently) and browser close, client app reload are the same as transport close?
        // 어떻게 구분하지? -> "transport error" | "transport close" | "forced close" | "ping timeout" | "parse error" | "server shutting down" | "forced server close" | "client namespace disconnect" | "server namespace disconnect"
        // TODO: 위의 질문에 대한 대답 -> browser close 했을때, transport close였음. 그런데 지금 ping timeout 테스트 하기도 애매하고 하니까, 도커 도입하고 나서 생각해보겠음.
        // DECISION: 그리고 사실 브라우저 닫거나 새로고침도 그냥 똑같이 30분 있다가 clean up해도 상관 없는거 아닌가?
        // 예를 들면, 실제로 인터넷에 문제가 있어서 끊긴 경우 말고도, 브라우저 실수로 닫을 수도 있고, 어떻게 잘못해서 컴퓨터가 꺼지거나 할수도 있고,
        // IMPT: 특히, 절전모드로 진입하는 경우도 transport close같은데... 그런 경우도 뭐.. 30분 유예를 주는것 나쁘지 않을듯...
        // 절전모드 테스트는 심지어 실제 cloud에 올리고 나서 테스트 가능할듯. :::...
        console.log(
          `Socket ${clientSocket.id} (uid=${uid}) disconnected with reason="${disconnectReason}" - [SignalingGateway:handleDisconnect]`
        );

        if (room === null || room === undefined) {
          // TODO: check if room is reset to null when a peer leaving his room.
          // This means the disconnected peer is in the lobby
          console.log(
            `[SignalingGateway:handleDisconnect] Socket ${clientSocket.id} (uid=${uid}) disconnected. ` +
            `Preserving only peer state for future reconnection.`
          );
          console.log('existingPeer.room', room); // null

          /** NOTE: Peer at the lobby.
           *  If the peer is not reconnected for some amount of time, he should be removed from the lobby.
           *  That means the peerMap is edited. I don't need to care about how client side handles this disconnection in the lobby.
           *  JUst... pick x mins.. For example,
           *  It seems that the 1 hour grace time does not benefit a client because.. lobby is just a lobby.
           *  The data kept during the period does not have much impact on UX in my opinion unlike the usecase of users disconnected during group study session.
           *  Just... be aware that the benefit from this disconnecting users completely, which
           *  must be done!, is for server memory.
           *  1. Create a method to remove a peer from the peerMap. 2. call it inside setTimeout with... 30*60*1000
           */
          console.log('about to call setTimeout in handleDisconnect()');
          peer.removalTimer = setTimeout(
            () => {
              console.log(
                '------------------------about to remove peer - ',
                uid
              );
              this.groupStudyManagementService.removePeerFromPeerMap(uid);
            },
            30 * 60 * 1000
          );
        } else {
          // Peer in a room
          console.log('existingPeer.room.id', peer.room.id);
          console.log(
            `[SignalingGateway:handleDisconnect] Socket ${clientSocket.id} (uid=${uid}) disconnected. ` +
            `Preserving peer and room state for future reconnection.`
          );

          //#region comments
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
           */
          //#endregion

          // 그냥 30분 지나서도 복구가 안되면 끝임. 방에서 나가고, socket정리하겠음.
          peer.removalTimer = setTimeout(
            () => {
              this.groupStudyManagementService.leaveRoom(clientSocket);
              this.groupStudyManagementService.removePeerFromPeerMap(uid);
            },
            30 * 60 * 1000
          );
        }
      } else if (disconnectReason === "transport close") {
        // NOTE: The connection was closed (example: the user has lost connection, or the network was changed from WiFi to 4G).
        peer.removalTimer = setTimeout(
          () => {
            this.groupStudyManagementService.leaveRoom(clientSocket);
            this.groupStudyManagementService.removePeerFromPeerMap(uid);
          },
          3 * 60 * 1000
        );
      } else {
        console.log(`due to the disconnectReason ${disconnectReason}, the peer resource is about to be cleaned up`)
        this.groupStudyManagementService.leaveRoom(clientSocket); // room이 없으면 알아서 early return해줌.
        this.groupStudyManagementService.removePeerFromPeerMap(uid);
      }
    } else {
      // WARNING: dead path - it should not happen. But if this happens, it means that the client socket was connected without its server side identity, which means a "peer".
    }
  }
  //#endregion Socket connection/disconnection related

  //#region Device related: 순서 1 -> 2 -> 3
  @SubscribeMessage(EventNames.GET_ROUTER_RTP_CAPABILITIES) // 1
  handleGetRouterRtpCapabilities(client: Socket): void {
    const capabilities = this.mediasoupService.getRtpCapabilities();
    client.emit(EventNames.SEND_ROUTER_RTP_CAPABILITIES, capabilities); // 2
  }
  @SubscribeMessage(EventNames.SET_DEVICE_RTP_CAPABILITIES) // 3
  handleSetDeviceRtpCapabilities(
    clientSocket: Socket,
    rtpCapabilities: RtpCapabilities
  ): AckResponse {
    this.groupStudyManagementService.setPeerRtpCapabilities(
      clientSocket.data.uid as string,
      rtpCapabilities
    );
    return { success: true };
  }
  //#endregion Device related

  //#region Transport related
  @SubscribeMessage(EventNames.CREATE_SEND_TRANSPORT)
  async handleCreateSendTransportRequest(clientSocket: Socket): Promise<void> {
    const transportOptions =
      await this.groupStudyManagementService.establishTransport(
        clientSocket.data.uid as string,
        'send'
      );

    clientSocket.emit(EventNames.SEND_TRANSPORT_CREATED, transportOptions);
  }

  @SubscribeMessage(EventNames.CREATE_RECV_TRANSPORT)
  async handleCreateRecvTransportRequest(clientSocket: Socket): Promise<void> {
    const transportOptions =
      await this.groupStudyManagementService.establishTransport(
        clientSocket.data.uid as string,
        'recv'
      );

    clientSocket.emit(EventNames.RECV_TRANSPORT_CREATED, transportOptions);
  }

  @SubscribeMessage(EventNames.CONNECT_SEND_TRANSPORT)
  async handleSendTransportConnect(
    @ConnectedSocket() clientSocket: Socket,
    @MessageBody() payload: { dtlsParameters: any }
  ): Promise<AckResponse> {
    return await this.groupStudyManagementService.connectTransport(
      clientSocket.data.uid as string,
      payload.dtlsParameters,
      'send'
    );
  }

  @SubscribeMessage(EventNames.CONNECT_RECV_TRANSPORT)
  async handleRecvTransportConnect(
    clientSocket: Socket,
    payload: { dtlsParameters: any }
  ): Promise<AckResponse> {
    return await this.groupStudyManagementService.connectTransport(
      clientSocket.data.uid as string,
      payload.dtlsParameters,
      'recv'
    );
  }

  // [ICE Restart 요청 수신]
  // 클라이언트가 네트워크 문제로 연결에 실패(failed)했을 때, 연결을 복구하기 위해 새로운 인증 정보를 요청하는 이벤트
  @SubscribeMessage(EventNames.RESTART_ICE)
  async handleRestartIce(
    @ConnectedSocket() clientSocket: Socket,
    @MessageBody() payload: { kind: 'send' | 'recv' }
  ): Promise<AckResponse<{ iceParameters: IceParameters }>> {
    console.log(
      `[SignalingGateway:handleRestartIce] Socket ${clientSocket.id} requested ICE restart for its ${payload.kind} transport`
    );
    return await this.groupStudyManagementService.restartIce(
      clientSocket.data.uid as string,
      payload.kind
    );
  }
  //#endregion Transport related

  //#region Producer related
  @SubscribeMessage(EventNames.PRODUCE)
  async handleMediaProduceRequest(
    @ConnectedSocket() clientSocket: Socket,
    @MessageBody()
    payload: {
      transportId: string;
      kind: 'audio' | 'video';
      rtpParameters: ProducerOptions['rtpParameters']; // RTP send params 같은데
    }
  ): Promise<AckResponse<{ producerId: string }>> {
    return await this.groupStudyManagementService.createProducer(
      clientSocket,
      payload.transportId,
      payload.kind,
      payload.rtpParameters
    );
  }

  @SubscribeMessage(EventNames.PAUSE_PRODUCER)
  async handlePauseProducer(
    @ConnectedSocket() clientSocket: Socket,
    @MessageBody() payload: { kind: 'video' | 'audio' }
  ): Promise<AckResponse> {
    return await this.groupStudyManagementService.pauseProducer(
      clientSocket.data.uid as string,
      payload.kind
    );
  }

  @SubscribeMessage(EventNames.RESUME_PRODUCER)
  async handleResumeProducer(
    @ConnectedSocket() clientSocket: Socket,
    @MessageBody() payload: { kind: 'video' | 'audio' }
  ): Promise<AckResponse> {
    return await this.groupStudyManagementService.resumeProducer(
      clientSocket.data.uid as string,
      payload.kind
    );
  }

  @SubscribeMessage(EventNames.PRODUCER_CLOSED)
  handleProducerClosed(
    @ConnectedSocket() clientSocket: Socket,
    @MessageBody() payload: { producerId?: string; kind?: 'video' | 'audio' }
  ): void {
    const { producerId, kind } = payload;
    this.groupStudyManagementService.closeProducer(
      clientSocket,
      producerId,
      kind
    );
  }
  //#endregion Producer related

  //#region Consumer related
  // TODO: INTENT_TO_CONSUME emit하는 위치 근처로 아가 그 socket listener 옮겨야 하는거 아니야?
  /**
   * WARNING: Inside ROOM_GET_PRODUCER event listener, consumePendingProducers() is called.
   * And the INTENT_TO_CONSUME is emitted in it.
   */
  @SubscribeMessage(EventNames.INTENT_TO_CONSUME)
  async handleIntentToConsume(
    @ConnectedSocket() clientSocket: Socket,
    @MessageBody() payload: { producerId: string; peerId: string }
  ): Promise<AckResponse<ConsumerOptionsExtended>> {
    return await this.groupStudyManagementService.createConsumer(
      clientSocket,
      payload.peerId,
      payload.producerId
    );
  }

  @SubscribeMessage(EventNames.PAUSE_CONSUMER)
  async handlePauseConsumer(
    @ConnectedSocket() clientSocket: Socket,
    @MessageBody() payload: { consumerId: string }
  ): Promise<AckResponse<{ paused: boolean }>> {
    return await this.groupStudyManagementService.pauseConsumer(
      clientSocket.data.uid as string,
      payload.consumerId
    );
  }

  @SubscribeMessage(EventNames.RESUME_CONSUMER)
  async handleResumeConsumer(
    @ConnectedSocket() clientSocket: Socket,
    @MessageBody() payload: { consumerId: string }
  ): Promise<AckResponse<{ resumed: boolean }>> {
    return await this.groupStudyManagementService.resumeConsumer(
      clientSocket.data.uid as string,
      payload.consumerId
    );
  }

  @SubscribeMessage(EventNames.SET_CONSUMER_PREFERRED_LAYERS)
  async handleSetConsumerPreferredLayers(
    @ConnectedSocket() clientSocket: Socket,
    @MessageBody() payload: { consumerId: string; spatialLayer: number }
  ): Promise<AckResponse> {
    // QQQ: Ack Callback 받아서 뭐... 딱히 사용하고 있지 않은데?..
    return await this.groupStudyManagementService.setConsumerPreferredLayers(
      clientSocket.data.uid as string,
      payload.consumerId,
      payload.spatialLayer
    );
  }

  @SubscribeMessage(EventNames.SET_COMMON_PREFERRED_LAYERS_FOR_ALL_CONSUMERS)
  async handleSetCommonPreferredLayersForAllConsumers(
    @ConnectedSocket() clientSocket: Socket,
    @MessageBody() payload: { spatialLayer: number }
  ): Promise<AckResponse<CommonPreferredLayersForAllConsumersData>> {
    return await this.groupStudyManagementService.setCommonPreferredLayersForAllConsumers(
      clientSocket.data.uid as string,
      payload.spatialLayer
    );
  }
  //#endregion Consumer related

  //#region Room related
  @SubscribeMessage(EventNames.GET_ROOMS) // 로비에서 RoomList.tsx에 의해
  handleGetRooms(@ConnectedSocket() client: Socket): void {
    const roomsList = this.groupStudyManagementService.getRoomList();
    client.emit(EventNames.ROOMS_LIST, roomsList);
  }

  @SubscribeMessage(EventNames.CREATE_ROOM)
  async handleCreateRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { name: string }
  ): Promise<AckResponse<{ roomId: string }>> {
    const roomId = await this.groupStudyManagementService.createRoom(
      payload.name
    );
    this.broadcastRoomList();
    return { success: true, data: { roomId } };
  }

  // [Client -> Server] 클라이언트가 "나 이 방에 들어갈래" 라고 서버에 요청하는 이벤트입니다.
  @SubscribeMessage(EventNames.JOIN_ROOM)
  async handleJoinRoom(
    @ConnectedSocket() connectedSocket: Socket,
    @MessageBody() payload: { roomId: string; todayTotalDuration: number }
  ): Promise<AckResponse<JOIN_ROOM_DATA>> {
    const { roomId, todayTotalDuration } = payload;

    // 이 시점에 내부적으로 방에 입장 처리(peersMap, roomsMap 업데이트) 및
    // 방에 있는 다른 사람들에게 "새로운 유저가 들어왔음(ROOM_PEER_JOINED)"을 브로드캐스트 합니다.
    //
    const result = await this.groupStudyManagementService.joinRoom(
      connectedSocket,
      roomId,
      todayTotalDuration
    );

    // QQQ: success인지는 이미 joinRoom함수에서 알 수 있는데, 여기에서 호출하는것보다 groupStudyManagementService의 joinRoom에서 호출하는게 더 좋을지도 모르겠음.
    // TODO: this.server를 사용하지 않고 그게 가능한지 알아보고, 혹시 premature optimization이 아닌지 한번 확인해보기
    if (result.success) {
      // 로비(메인 화면)에서 방 목록을 보고 있는 모든 유저들에게
      // 해당 방의 참가자 수가 증가했음을 실시간으로 알리기 위해 전체 소켓에 갱신된 방 목록을 뿌려줍니다.
      this.broadcastRoomList();
    }
    return result;
  }

  @SubscribeMessage(EventNames.LEAVE_ROOM)
  async handlePeerLeaveRoom(
    @ConnectedSocket() clientSocket: Socket
  ): Promise<AckResponse<{ left: boolean }>> {
    const result =
      await this.groupStudyManagementService.leaveRoom(clientSocket);
    if (result.success) {
      this.broadcastRoomList();
    }
    return result;
  }

  @SubscribeMessage(EventNames.CHAT_MESSAGE)
  handleChatMessage(
    @ConnectedSocket() clientSocket: Socket,
    @MessageBody() payload: { message: string }
  ): void {
    const { message } = payload;
    this.groupStudyManagementService.handleChatMessage(clientSocket, message);
  }

  // [Real-time Duration Sync]
  // 특정 Peer의 집중 시간이 증가했을 때, 이 이벤트를 받아서 서버 메모리에 반영하고 방에 있는 다른 사람들에게 뿌려줍니다.
  @SubscribeMessage(EventNames.SYNC_MY_TODAY_TOTAL_DURATION)
  handleUpdateTodayTotalDuration(
    @ConnectedSocket() clientSocket: Socket,
    @MessageBody() payload: { todayTotalDuration: number }
  ): void {
    const { todayTotalDuration } = payload;
    this.groupStudyManagementService.updatePeerTodayTotalDuration(
      clientSocket,
      todayTotalDuration
    );
  }

  private broadcastRoomList() {
    const roomsList = this.groupStudyManagementService.getRoomList();
    this.server.emit(EventNames.ROOMS_LIST, roomsList);
  }
  //#endregion Room related
}
