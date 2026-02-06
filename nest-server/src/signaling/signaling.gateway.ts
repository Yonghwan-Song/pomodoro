import {
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MediasoupService } from 'src/mediasoup/mediasoup.service';
import * as EventNames from 'src/common/webrtc/event-names';
import type {
  AckResponse,
  ConsumerOptionsExtended,
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
      'http://localhost:3000',
    ],
    credentials: true,
  },
})
export class SignalingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly mediasoupService: MediasoupService,
    private readonly groupStudyManagementService: GroupStudyManagementService,
  ) {}

  afterInit(server: Server) {
    server.use(async (socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication token required'));
      try {
        const decoded = await admin.auth().verifyIdToken(token);
        socket.data.userEmail = decoded.email;
        socket.data.uid = decoded.uid;
        next();
      } catch (err) {
        next(new Error('Authentication failed'));
      }
    });
  }

  // --- Connection and Disconnection ---

  handleConnection(clientSocket: Socket) {
    this.groupStudyManagementService.addPeer(clientSocket.id);
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
  handleCreateRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { name: string },
  ): AckResponse<{ roomId: string }> {
    const roomId = this.groupStudyManagementService.createRoom(payload.name);
    this.broadcastRoomList();
    return { success: true, data: { roomId } };
  }

  @SubscribeMessage(EventNames.JOIN_ROOM)
  async handleJoinRoom(
    @ConnectedSocket() clientSocket: Socket,
    @MessageBody() payload: { roomId: string },
  ): Promise<
    AckResponse<{
      roomId: string;
      routerRtpCapabilities: RtpCapabilities;
      existingProducers: {
        producerId: string;
        socketId: string;
        kind: string;
      }[];
      peers: string[];
    }>
  > {
    const { roomId } = payload;
    const result = await this.groupStudyManagementService.joinRoom(
      clientSocket,
      roomId,
    );
    if (result.success) {
      this.broadcastRoomList();
    }
    return result;
  }

  @SubscribeMessage(EventNames.LEAVE_ROOM)
  async handlePeerLeaveRoom(
    @ConnectedSocket() clientSocket: Socket,
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
    @MessageBody() payload: { message: string },
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
    rtpCapabilities: RtpCapabilities,
  ): AckResponse {
    this.groupStudyManagementService.setPeerRtpCapabilities(
      clientSocket.id,
      rtpCapabilities,
    );
    return { success: true };
  }

  @SubscribeMessage(EventNames.CREATE_SEND_TRANSPORT)
  async handleCreateSendTransportRequest(
    clientSocket: Socket,
  ): Promise<void> {
    const transportOptions =
      await this.groupStudyManagementService.establishTransport(
        clientSocket.id,
        'send',
      );

    clientSocket.emit(EventNames.SEND_TRANSPORT_CREATED, transportOptions);
  }

  @SubscribeMessage(EventNames.CREATE_RECV_TRANSPORT)
  async handleCreateRecvTransportRequest(
    clientSocket: Socket,
  ): Promise<void> {
    const transportOptions =
      await this.groupStudyManagementService.establishTransport(
        clientSocket.id,
        'recv',
      );

    clientSocket.emit(EventNames.RECV_TRANSPORT_CREATED, transportOptions);
  }

  @SubscribeMessage(EventNames.INTENT_TO_CONSUME)
  async handleIntentToConsume(
    @ConnectedSocket() clientSocket: Socket,
    @MessageBody() payload: { producerId: string; peerId: string },
  ): Promise<AckResponse<ConsumerOptionsExtended>> {
    return await this.groupStudyManagementService.createConsumer(
      clientSocket.id,
      payload.peerId,
      payload.producerId,
    );
  }

  @SubscribeMessage(EventNames.RESUME_CONSUMER)
  async handleResumeConsumer(
    @ConnectedSocket() clientSocket: Socket,
    @MessageBody() payload: { consumerId: string },
  ): Promise<AckResponse<{ resumed: boolean }>> {
    return await this.groupStudyManagementService.resumeConsumer(
      clientSocket.id,
      payload.consumerId,
    );
  }

  // --- Transport Connection and Media Production ---

  @SubscribeMessage(EventNames.CONNECT_SEND_TRANSPORT)
  async handleSendTransportConnect(
    @ConnectedSocket() clientSocket: Socket,
    @MessageBody() payload: { dtlsParameters: any },
  ): Promise<AckResponse> {
    return await this.groupStudyManagementService.connectTransport(
      clientSocket.id,
      payload.dtlsParameters,
      'send',
    );
  }

  @SubscribeMessage(EventNames.CONNECT_RECV_TRANSPORT)
  async handleRecvTransportConnect(
    clientSocket: Socket,
    payload: { dtlsParameters: any },
  ): Promise<AckResponse> {
    return await this.groupStudyManagementService.connectTransport(
      clientSocket.id,
      payload.dtlsParameters,
      'recv',
    );
  }

  @SubscribeMessage(EventNames.PRODUCE)
  async handleMediaProduceRequest(
    @ConnectedSocket() clientSocket: Socket,
    @MessageBody() payload: { kind: 'audio' | 'video'; rtpParameters: any },
  ): Promise<AckResponse<{ producerId: string }>> {
    return await this.groupStudyManagementService.createProducer(
      clientSocket,
      payload.kind,
      payload.rtpParameters,
    );
  }

  @SubscribeMessage(EventNames.PRODUCER_CLOSED)
  handleProducerClosed(
    @ConnectedSocket() clientSocket: Socket,
    @MessageBody() payload: { producerId?: string; kind?: 'video' | 'audio' },
  ): void {
    const { producerId, kind } = payload;
    this.groupStudyManagementService.closeProducer(
      clientSocket,
      producerId,
      kind,
    );
  }

  private broadcastRoomList() {
    const roomsList = this.groupStudyManagementService.getRoomList();
    this.server.emit(EventNames.ROOMS_LIST, roomsList);
  }
}
