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
import { MediasoupService } from 'src/mediasoup/mediasoup.service';
import * as EventNames from 'src/common/webrtc/event-names';
import type {
  AckResponse,
  ConsumerOptionsExtended
} from 'src/common/webrtc/payload-related';
import { type RtpCapabilities } from 'mediasoup/node/lib/types';
import { GroupStudyManagementService } from 'src/group-study-management/group-study-management.service';
import * as admin from 'firebase-admin';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:5173',
      'https://pomodoro-yhs.vercel.app',
      'http://localhost:3001',
      'http://localhost:3000'
    ],
    credentials: true
  }
})
export class SignalingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly mediasoupService: MediasoupService,
    private readonly groupStudyManagementService: GroupStudyManagementService
  ) {}

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
        next(new Error('Authentication failed'));
      }
    });
  }

  // --- Connection and Disconnection ---

  handleConnection(clientSocket: Socket) {
    this.groupStudyManagementService.addPeer(
      clientSocket.id,
      clientSocket.data.userNickname
    );
  }

  async handleDisconnect(clientSocket: Socket) {
    await this.groupStudyManagementService.leaveRoom(clientSocket);
    this.groupStudyManagementService.removePeer(clientSocket.id);
    this.broadcastRoomList();
  }

  // --- Room Management ---
  @SubscribeMessage(EventNames.GET_ROOMS)
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
    @ConnectedSocket() clientSocket: Socket,
    @MessageBody() payload: { roomId: string; todayTotalDuration: number }
  ): Promise<
    AckResponse<{
      roomId: string;
      routerRtpCapabilities: RtpCapabilities;
      existingProducers: {
        producerId: string;
        socketId: string;
        kind: string;
        displayName?: string;
      }[];
      peers: { id: string; todayTotalDuration: number }[];
    }>
  > {
    const { roomId, todayTotalDuration } = payload;

    // 이 시점에 내부적으로 방에 입장 처리(peersMap, roomsMap 업데이트) 및
    // 방에 있는 다른 사람들에게 "새로운 유저가 들어왔음(ROOM_PEER_JOINED)"을 브로드캐스트 합니다.
    const result = await this.groupStudyManagementService.joinRoom(
      clientSocket,
      roomId,
      todayTotalDuration
    );

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

  @SubscribeMessage(EventNames.CHAT_MESSAGE)
  handleChatMessage(
    @ConnectedSocket() clientSocket: Socket,
    @MessageBody() payload: { message: string }
  ): void {
    const { message } = payload;
    this.groupStudyManagementService.handleChatMessage(clientSocket, message);
  }

  // --- Setup and Transport Creation ---
  @SubscribeMessage(EventNames.GET_ROUTER_RTP_CAPABILITIES)
  handleRtcCapabilitiesRequest(client: Socket): void {
    const capabilities = this.mediasoupService.getRtcCapabilities();
    client.emit(EventNames.SEND_ROUTER_RTP_CAPABILITIES, capabilities);
  }

  @SubscribeMessage(EventNames.SET_DEVICE_RTP_CAPABILITIES)
  handleSetRtpCapabilities(
    clientSocket: Socket,
    rtpCapabilities: RtpCapabilities
  ): AckResponse {
    this.groupStudyManagementService.setPeerRtpCapabilities(
      clientSocket.id,
      rtpCapabilities
    );
    return { success: true };
  }

  @SubscribeMessage(EventNames.CREATE_SEND_TRANSPORT)
  async handleCreateSendTransportRequest(clientSocket: Socket): Promise<void> {
    const transportOptions =
      await this.groupStudyManagementService.establishTransport(
        clientSocket.id,
        'send'
      );

    clientSocket.emit(EventNames.SEND_TRANSPORT_CREATED, transportOptions);
  }

  @SubscribeMessage(EventNames.CREATE_RECV_TRANSPORT)
  async handleCreateRecvTransportRequest(clientSocket: Socket): Promise<void> {
    const transportOptions =
      await this.groupStudyManagementService.establishTransport(
        clientSocket.id,
        'recv'
      );

    clientSocket.emit(EventNames.RECV_TRANSPORT_CREATED, transportOptions);
  }

  @SubscribeMessage(EventNames.INTENT_TO_CONSUME)
  async handleIntentToConsume(
    @ConnectedSocket() clientSocket: Socket,
    @MessageBody() payload: { producerId: string; peerId: string }
  ): Promise<AckResponse<ConsumerOptionsExtended>> {
    return await this.groupStudyManagementService.createConsumer(
      clientSocket.id,
      payload.peerId,
      payload.producerId
    );
  }

  @SubscribeMessage(EventNames.RESUME_CONSUMER)
  async handleResumeConsumer(
    @ConnectedSocket() clientSocket: Socket,
    @MessageBody() payload: { consumerId: string }
  ): Promise<AckResponse<{ resumed: boolean }>> {
    return await this.groupStudyManagementService.resumeConsumer(
      clientSocket.id,
      payload.consumerId
    );
  }

  // --- Transport Connection and Media Production ---

  @SubscribeMessage(EventNames.CONNECT_SEND_TRANSPORT)
  async handleSendTransportConnect(
    @ConnectedSocket() clientSocket: Socket,
    @MessageBody() payload: { dtlsParameters: any }
  ): Promise<AckResponse> {
    return await this.groupStudyManagementService.connectTransport(
      clientSocket.id,
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
      clientSocket.id,
      payload.dtlsParameters,
      'recv'
    );
  }

  @SubscribeMessage(EventNames.PRODUCE)
  async handleMediaProduceRequest(
    @ConnectedSocket() clientSocket: Socket,
    @MessageBody() payload: { kind: 'audio' | 'video'; rtpParameters: any }
  ): Promise<AckResponse<{ producerId: string }>> {
    return await this.groupStudyManagementService.createProducer(
      clientSocket,
      payload.kind,
      payload.rtpParameters
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

  private broadcastRoomList() {
    const roomsList = this.groupStudyManagementService.getRoomList();
    this.server.emit(EventNames.ROOMS_LIST, roomsList);
  }
}
