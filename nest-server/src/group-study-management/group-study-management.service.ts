import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import * as EventNames from 'src/common/webrtc/event-names';
import { Room } from './entities/room.entity';
import { Peer } from './entities/peer.entity';
import { MediasoupService } from 'src/mediasoup/mediasoup.service';
import { Socket } from 'socket.io';
import { RtpCapabilities } from 'mediasoup/node/lib/types';
import { ProducerPayload } from 'src/common/webrtc/payload-related';
import { InjectModel } from '@nestjs/mongoose';
import { Room as RoomSchemaClass, RoomDocument } from 'src/schemas/room.schema';
import { Model } from 'mongoose';

@Injectable()
export class GroupStudyManagementService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(GroupStudyManagementService.name);
  private peersMap: Map<string, Peer> = new Map();
  private roomsMap: Map<string, Room> = new Map();

  constructor(
    private readonly mediasoupService: MediasoupService,
    @InjectModel(RoomSchemaClass.name)
    private readonly roomModel: Model<RoomDocument>, // TODO: RoomDocument는 대체 정체가 뭐임...
  ) {}

  async onModuleInit() {
    this.logger.log('Service has been initialized.');
    await this.loadRoomsFromDB();
  }

  private async loadRoomsFromDB() {
    try {
      const rooms = await this.roomModel.find().exec();
      rooms.forEach((roomDoc) => {
        const roomId = roomDoc._id.toString();
        const room = new Room(roomId, roomDoc.name, roomDoc.isPermanent);
        this.roomsMap.set(roomId, room);
      });
      this.logger.log(`Loaded ${rooms.length} rooms from DB into memory.`);
    } catch (error) {
      this.logger.error('Failed to load rooms from DB', error);
    }
  }

  onModuleDestroy() {
    this.logger.log('Cleaning up resources before shutdown...');
  }

  //#region Only Peer
  addPeer(socketId: string, userNickname: string) {
    const newPeer = new Peer(socketId, userNickname);
    this.peersMap.set(socketId, newPeer);
    this.logCurrentState('[group-study-management.service:addPeer]');
  }

  private logCurrentState(prefix: string) {
    console.log(`${prefix} ========== STATE SNAPSHOT ==========`);
    console.log(
      `${prefix} Total peers: ${this.peersMap.size}, Total rooms: ${this.roomsMap.size}`,
    );

    if (this.peersMap.size > 0) {
      console.log(`${prefix} --- PEERS ---`);
      this.peersMap.forEach((peer) => {
        peer.logProperties(prefix);
      });
    }

    if (this.roomsMap.size > 0) {
      console.log(`${prefix} --- ROOMS ---`);
      this.roomsMap.forEach((room, roomId) => {
        const peers = room.getPeers();
        const producers = room.getAllProducers();
        console.log(`${prefix} Room [${roomId}] "${room.name}":`, {
          peerCount: peers.length,
          peerIds: peers.map((p) => p.id),
          producerCount: producers.length,
          producers: producers.map((p) => ({
            id: p.producerId,
            socketId: p.socketId,
            kind: p.kind,
          })),
        });
      });
    }

    console.log(`${prefix} =====================================`);
  }

  removePeer(socketId: string) {
    if (this.peersMap.delete(socketId)) {
      console.log(
        `[group-study-management.service:removePeer] Peer ${socketId} removed from peersMap`,
      );
    } else {
      console.warn(
        `[group-study-management.service:removePeer] Peer ${socketId} not found in peersMap`,
      );
    }
  }

  setPeerRtpCapabilities(socketId: string, rtpCapabilities: RtpCapabilities) {
    const peer = this.peersMap.get(socketId);
    if (!peer) return;
    peer.rtpCapabilities = rtpCapabilities;
  }

  async establishTransport(socketId: string, type: 'send' | 'recv') {
    const peer = this.peersMap.get(socketId);
    if (!peer) return;

    const transport = await this.mediasoupService.getWebRtcTransport();

    transport.on('dtlsstatechange', (dtlsState) => {
      console.log(
        `[group-study-management.service:establishTransport] [${type}-Transport ${transport.id}] DTLS state changed: ${dtlsState}`,
      );
    });
    transport.on('icestatechange', (iceState) => {
      console.log(
        `[group-study-management.service:establishTransport] [${type}-Transport ${transport.id}] ICE state changed: ${iceState}`,
      );
    });

    peer.addTransport(transport, type);

    console.log(
      `[group-study-management.service:establishTransport] verify: remote ${type}-transport has been created`,
      transport.id,
    );

    const transportOptions = {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };

    return transportOptions;
  }

  async createConsumer(
    consumingPeerId: string,
    producingPeerId: string,
    producerId: string,
  ) {
    try {
      const consumingPeer = this.peersMap.get(consumingPeerId);
      const producingPeer = this.peersMap.get(producingPeerId);

      if (!producingPeer) {
        return { success: false, error: 'Producer not found.' };
      }

      if (!consumingPeer || !consumingPeer.rtpCapabilities) {
        return {
          success: false,
          error: 'RTP capabilities not set. Please join room first.',
        };
      }

      if (!consumingPeer.recvTransport) {
        return {
          success: false,
          error:
            'Receive transport not created. Please create recv transport first.',
        };
      }
      if (
        !this.mediasoupService.checkIfClientCanConsume(
          producerId,
          consumingPeer.rtpCapabilities,
        )
      ) {
        return {
          success: false,
          error:
            'Client cannot consume the producer due to RTP capabilities issue',
        };
      }

      const consumer = await this.mediasoupService.createConsumer(
        consumingPeer.recvTransport,
        producerId,
        consumingPeer.rtpCapabilities,
      );

      consumer.on('producerclose', () => {
        console.log(
          `[group-study-management.service:createConsumer:producerclose] Consumer ${consumer.id} closed due to producer close`,
        );
        consumingPeer.consumers.delete(consumer.id);
        console.log(
          `[group-study-management.service:createConsumer:producerclose] Consumer ${consumer.id} removed from peer ${consumingPeer.id}`,
        );
      });

      consumer.on('transportclose', () => {
        console.log(
          `[group-study-management.service:createConsumer:transportclose] Consumer ${consumer.id} closed due to transport close`,
        );
      });

      consumingPeer.addConsumer(consumer);

      return {
        success: true,
        data: {
          id: consumer.id,
          producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
          peerId: producingPeer.id,
        },
      };
    } catch (error) {
      console.warn(
        '[group-study-management.service:createConsumer] Error is thrown in the createConsumer of groupStudyManagementService',
        error,
      );
      return {
        success: false,
        error: 'Failed to create consumer',
      };
    }
  }

  async resumeConsumer(socketId: string, consumerId: string) {
    const peer = this.peersMap.get(socketId);
    if (!peer) {
      return { success: false, error: 'Peer does not exist' };
    }
    const consumer = peer.consumers.get(consumerId);
    if (!consumer) {
      console.error(
        `[group-study-management.service:resumeConsumer] Consumer ${consumerId} not found for peer ${socketId}`,
      );
      return { success: false, error: 'Consumer not found' };
    }

    await consumer.resume();
    console.log(
      `[group-study-management.service:resumeConsumer] Consumer ${consumerId} resumed for peer ${socketId}`,
    );

    return { success: true, data: { resumed: true } };
  }

  async connectTransport(
    socketId: string,
    dtlsParameters: any,
    type: 'send' | 'recv',
  ) {
    const peer = this.peersMap.get(socketId);
    if (!peer) {
      console.error(
        `[group-study-management.service:connectTransport] Peer not found for client ${socketId}`,
      );
      return { success: false, error: 'Peer transport not found' };
    }
    if (!peer.sendTransport) {
      console.error(
        `[group-study-management.service:connectTransport] Send transport not found for client ${socketId}`,
      );
      return { success: false, error: 'Send transport not found' };
    }
    if (!peer.recvTransport) {
      console.error(
        `[group-study-management.service:connectTransport] Receive transport not found for client ${socketId}`,
      );
      return { success: false, error: 'Receive transport not found' };
    }
    if (type === 'send') {
      await peer.sendTransport.connect({
        dtlsParameters: dtlsParameters,
      });
    }
    if (type === 'recv') {
      await peer.recvTransport.connect({
        dtlsParameters: dtlsParameters,
      });
    }
    return { success: true };
  }

  async createProducer(
    clientSocket: Socket,
    kind: 'video' | 'audio',
    rtpParameters: any,
  ) {
    try {
      const peer = this.peersMap.get(clientSocket.id);

      if (!peer) {
        console.error(
          `[group-study-management.service:createProducer] Peer not found for client ${clientSocket.id}`,
        );
        return { success: false, error: 'Peer transport not found' };
      }
      if (!peer.sendTransport) {
        console.error(
          `[group-study-management.service:createProducer] Send transport not found for client ${clientSocket.id}`,
        );
        return { success: false, error: 'Send transport not found' };
      }

      const producer = await peer.sendTransport.produce({
        kind,
        rtpParameters,
      });

      producer.addListener('transportclose', () => {
        console.log(
          '[group-study-management.service:createProducer:transportclose] sendTransport has been closed',
        );
        const roomId = peer.room?.id;
        if (roomId) {
          this.notifyProducerClosed(clientSocket, roomId, producer.id);
        }
      });

      peer.addProducer(producer);

      console.log(
        `[group-study-management.service:createProducer] Producer created: ${producer.id} for client ${clientSocket.id} of kind ${kind}`,
      );

      const producerPayload: ProducerPayload = {
        producerId: producer.id,
        socketId: clientSocket.id,
        kind,
        displayName: peer.userNickname,
      };
      console.log(
        '[group-study-management.service:createProducer] producerPayload',
        producerPayload,
      );

      const roomId = peer.room?.id;

      if (roomId) {
        console.log(
          '[group-study-management.service:createProducer] broadcasting new producer to room',
          roomId,
        );
        clientSocket
          .to(roomId)
          .emit(EventNames.ROOM_GET_PRODUCER, [producerPayload]);
      } else {
        console.warn(
          `[group-study-management.service:createProducer] Peer ${clientSocket.id} is not in any room, producer not broadcast`,
        );
      }

      return { success: true, data: { producerId: producer.id } };
    } catch (error) {
      console.error(
        '[group-study-management.service:createProducer] Error in produce:',
        error,
      );

      return {
        success: false,
        error: 'Error occurred while creating a producer',
      };
    }
  }

  closeProducer(
    clientSocket: Socket,
    producerId?: string,
    kind?: 'video' | 'audio',
  ) {
    const peer = this.peersMap.get(clientSocket.id);
    if (!peer) {
      console.warn(
        `[group-study-management.service:closeProducer] Peer not found for client ${clientSocket.id} during producer close.`,
      );
      return;
    }

    let targetProducerId = producerId;

    if (!targetProducerId && kind) {
      console.log(
        `[group-study-management.service:closeProducer] Searching for producer by kind '${kind}' in peer ${clientSocket.id}. Producers count: ${peer.producers.size}`,
      );
      for (const [id, producer] of peer.producers) {
        console.log(
          `[group-study-management.service:closeProducer] Checking producer ${id}: kind=${producer.kind}`,
        );
        if (producer.kind === kind) {
          targetProducerId = id;
          console.log(
            `[group-study-management.service:closeProducer] Found producer ${id} by kind ${kind}`,
          );
          break;
        }
      }
    }

    if (!targetProducerId) {
      console.warn(
        `[group-study-management.service:closeProducer] No producerId provided and could not find producer by kind ${kind} for peer ${clientSocket.id}`,
      );
      return;
    }

    const producer = peer.producers.get(targetProducerId);
    if (producer) {
      producer.close();
      peer.producers.delete(targetProducerId);
      console.log(
        `[group-study-management.service:closeProducer] Producer ${targetProducerId} closed for peer ${clientSocket.id}`,
      );

      const roomId = peer.room?.id;
      if (roomId) {
        clientSocket.to(roomId).emit(EventNames.PRODUCER_CLOSED, {
          producerId: targetProducerId,
        });
      }
    } else {
      console.warn(
        `[group-study-management.service:closeProducer] Producer ${targetProducerId} not found for peer ${clientSocket.id}`,
      );
    }
  }
  //#endregion

  //#region Only Room
  getRoomList() {
    return Array.from(this.roomsMap.values()).map((room) =>
      room.toClientInfo(),
    );
  }

  async createRoom(name: string) {
    // 1. Create room in DB
    const newRoomDoc = await new this.roomModel({
      name: name || 'Untitled Room',
    }).save();
    const roomId = newRoomDoc._id.toString();

    // 2. Create in-memory Room entity
    const room = new Room(roomId, newRoomDoc.name, newRoomDoc.isPermanent);
    this.roomsMap.set(roomId, room);

    console.log(
      `[group-study-management.service:createRoom] Room created: ${roomId} (${room.name})`,
    );

    return roomId;
  }
  //#endregion

  //#region Peer & Room
  async joinRoom(clientSocket: Socket, roomId: string) {
    const peer = this.peersMap.get(clientSocket.id);
    if (!peer) {
      return {
        success: false,
        error: `peer ${clientSocket.id} does not exist`,
      };
    }

    const room = this.roomsMap.get(roomId);
    if (!room) {
      return { success: false, error: `room ${roomId} does not exist` };
    }

    peer.addRoom(room);
    room.addPeer(peer);

    await clientSocket.join(roomId);
    console.log(
      `[group-study-management.service:joinRoom] Peer ${peer.id} joined room ${room.id}`,
    );
    console.log(
      `[group-study-management.service:joinRoom] The room ${room.id} has ${room.getPeers().length} members`,
    );

    clientSocket
      .to(roomId)
      .emit(EventNames.ROOM_PEER_JOINED, { peerId: clientSocket.id });

    const existingProducers = room
      .getAllProducers()
      .filter((p) => p.socketId !== clientSocket.id);
    const routerRtpCapabilities = this.mediasoupService.getRtcCapabilities();
    const peers = room
      .getPeers()
      .map((p) => p.id)
      .filter((id) => id !== clientSocket.id);

    return {
      success: true,
      data: {
        roomId,
        routerRtpCapabilities,
        existingProducers,
        peers,
      },
    };
  }

  // NOTE: 현재 Room이 사라지는 것은... in-memory에서 더이상 ref가 참조하지 않을때 GC되는 것을 기반으로 하고 있음. 어떻게?...
  // 참조하는 주체 - 1)peer 2)roomsMap
  async leaveRoom(clientSocket: Socket) {
    try {
      const peer = this.peersMap.get(clientSocket.id);
      if (!peer) {
        return { success: false, error: 'Peer not found' };
      }

      const room = peer.room;
      if (!room) {
        return { success: false, error: 'Peer is not in any room' };
      }

      room.removePeer(peer.id);

      this.notifyPeerLeft(clientSocket, room.id);
      if (room.isEmpty() && !room.isPermanent) {
        this.roomsMap.delete(room.id);
        // Also remove from DB to keep sync
        try {
          await this.roomModel.findByIdAndDelete(room.id).exec();
          console.log(
            `[group-study-management.service:leaveRoom] Room ${room.id} deleted from DB as it is empty`,
          );
        } catch (dbErr) {
          console.error(
            `[group-study-management.service:leaveRoom] Failed to delete room ${room.id} from DB`,
            dbErr,
          );
        }
      }

      peer.close();

      await clientSocket.leave(room.id);

      peer.removeRoom();
      console.log(
        `[group-study-management.service:leaveRoom] Peer ${clientSocket.id} left room ${room.id}`,
      );

      return { success: true, data: { left: true } };
    } catch (error) {
      console.warn(
        '[group-study-management.service:leaveRoom] Error in handlePeerLeaveRoom in the SignalingGateway',
        error,
      );

      return {
        success: false,
        error: 'Unknown error occurred while a peer leaving a room',
      };
    }
  }

  handleChatMessage(
    clientSocket: Socket,
    message: string,
  ): { success: boolean; error?: string } {
    const peer = this.peersMap.get(clientSocket.id);
    if (!peer) {
      return { success: false, error: 'Peer not found' };
    }

    const room = peer.room;
    if (!room) {
      return { success: false, error: 'Peer is not in any room' };
    }

    const chatPayload = {
      senderId: clientSocket.id,
      // senderNickname: ... // peer에 nickname을 등록해야
      senderNickname: peer.userNickname,
      message: message,
      timestamp: new Date().toISOString(),
    };

    clientSocket.to(room.id).emit(EventNames.CHAT_MESSAGE, chatPayload);

    return { success: true };
  }

  //#endregion

  //#region Kind of helpers
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
  //#endregion
}
