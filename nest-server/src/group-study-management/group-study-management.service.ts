import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy
} from '@nestjs/common';
import * as EventNames from 'src/common/webrtc/event-names';
import { Room } from './entities/room.entity';
import { Peer } from './entities/peer.entity';
import { MediasoupService } from 'src/mediasoup/mediasoup.service';
import { Socket } from 'socket.io';
import type {
  Consumer,
  ConsumerLayers,
  RtpCapabilities,
  ProducerOptions,
  DtlsParameters,
  RtpEncodingParameters
} from 'mediasoup/types';
import {
  AckResponse,
  CommonPreferredLayersForAllConsumersData,
  ConsumerLayersChangedPayload,
  ProducerPayload
} from 'src/common/webrtc/payload-related';
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
    private readonly roomModel: Model<RoomDocument> // TODO: RoomDocument는 대체 정체가 뭐임...
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
      `${prefix} Total peers: ${this.peersMap.size}, Total rooms: ${this.roomsMap.size}`
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
            kind: p.kind
          }))
        });
      });
    }

    console.log(`${prefix} =====================================`);
  }

  removePeer(socketId: string) {
    if (this.peersMap.delete(socketId)) {
      console.log(
        `[group-study-management.service:removePeer] Peer ${socketId} removed from peersMap`
      );
    } else {
      console.warn(
        `[group-study-management.service:removePeer] Peer ${socketId} not found in peersMap`
      );
    }
  }

  private requirePeer(socketId: string, context: string): Peer | null {
    const peer = this.peersMap.get(socketId);

    if (peer) {
      return peer;
    }

    console.error(
      `[group-study-management.service:${context}] Peer ${socketId} not found`
    );

    return null;
  }

  private requireConsumer(
    peer: Peer,
    consumerId: string,
    context: string
  ): Consumer | null {
    const consumer = peer.consumers.get(consumerId);

    if (consumer) {
      return consumer;
    }

    console.error(
      `[group-study-management.service:${context}] Consumer ${consumerId} not found for peer ${peer.id}`
    );

    return null;
  }

  setPeerRtpCapabilities(socketId: string, rtpCapabilities: RtpCapabilities) {
    const peer = this.requirePeer(socketId, 'setPeerRtpCapabilities');
    if (!peer) return;
    peer.rtpCapabilities = rtpCapabilities;
  }

  async establishTransport(socketId: string, type: 'send' | 'recv') {
    const peer = this.requirePeer(socketId, 'establishTransport');
    if (!peer) return;

    const transport = await this.mediasoupService.getWebRtcTransport();

    transport.on('dtlsstatechange', (dtlsState) => {
      console.log(
        `[group-study-management.service:establishTransport] [${type}-Transport ${transport.id}] DTLS state changed: ${dtlsState}`
      );
    });
    transport.on('icestatechange', (iceState) => {
      console.log(
        `[group-study-management.service:establishTransport] [${type}-Transport ${transport.id}] ICE state changed: ${iceState}`
      );
    });

    peer.addTransport(transport, type);

    console.log(
      `[group-study-management.service:establishTransport] verify: remote ${type}-transport has been created`,
      transport.id
    );

    const transportOptions = {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters
    };

    return transportOptions;
  }

  async createConsumer(
    clientSocket: Socket,
    producingPeerId: string,
    producerId: string
  ) {
    try {
      const consumingPeerId = clientSocket.id;
      const consumingPeer = this.peersMap.get(consumingPeerId);
      const producingPeer = this.peersMap.get(producingPeerId);

      if (!producingPeer) {
        return { success: false, error: 'Producer not found.' };
      }

      if (!consumingPeer || !consumingPeer.rtpCapabilities) {
        return {
          success: false,
          error: 'RTP capabilities not set. Please join room first.'
        };
      }

      if (!consumingPeer.recvTransport) {
        return {
          success: false,
          error:
            'Receive transport not created. Please create recv transport first.'
        };
      }
      if (
        !this.mediasoupService.checkIfClientCanConsume(
          producerId,
          consumingPeer.rtpCapabilities
        )
      ) {
        return {
          success: false,
          error:
            'Client cannot consume the producer due to RTP capabilities issue'
        };
      }

      const consumer = await this.mediasoupService.createConsumer(
        consumingPeer.recvTransport,
        producerId,
        consumingPeer.rtpCapabilities
      );

      consumer.on('producerclose', () => {
        console.log(
          `[group-study-management.service:createConsumer:producerclose] Consumer ${consumer.id} closed due to producer close`
        );
        consumingPeer.consumers.delete(consumer.id);
        console.log(
          `[group-study-management.service:createConsumer:producerclose] Consumer ${consumer.id} removed from peer ${consumingPeer.id}`
        );
      });

      consumer.on('transportclose', () => {
        console.log(
          `[group-study-management.service:createConsumer:transportclose] Consumer ${consumer.id} closed due to transport close`
        );
      });

      consumer.on('layerschange', (layers: ConsumerLayers | undefined) => {
        // mediasoup의 `layerschange`는 "preferred layer를 이렇게 원한다"가 아니라
        // "지금 실제로 forwarding 중인 current layer가 이렇게 바뀌었다"는 신호다.
        // 그래서 UI 표시값은 preferredLayers보다 이 이벤트 payload를 신뢰하는 편이 맞다.
        //
        // 또한 이 이벤트는 품질이 바뀔 때만 오는 것이 아니라, consume 직후
        // 초기 current layer가 처음 결정되는 시점에도 올 수 있다. 다만 항상
        // 즉시 온다고 가정하면 안 되고, 실제 RTP 흐름이 잡힌 뒤에야 올 수도 있다.
        console.log(
          `[group-study-management.service:createConsumer:layerschange] Consumer ${consumer.id} layers changed:`,
          layers
        );
        const payload: ConsumerLayersChangedPayload = {
          consumerId: consumer.id,
          layers
        };

        clientSocket.emit(EventNames.CONSUMER_LAYERS_CHANGED, payload);
      });

      consumingPeer.addConsumer(consumer);

      return {
        success: true,
        data: {
          id: consumer.id,
          producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
          peerId: producingPeer.id
        }
      };
    } catch (error) {
      console.warn(
        '[group-study-management.service:createConsumer] Error is thrown in the createConsumer of groupStudyManagementService',
        error
      );
      return {
        success: false,
        error: 'Failed to create consumer'
      };
    }
  }

  async setConsumerPreferredLayers(
    socketId: string,
    consumerId: string,
    spatialLayer: number
  ) {
    const peer = this.requirePeer(socketId, 'setConsumerPreferredLayers');
    if (!peer) {
      return { success: false, error: 'Peer does not exist' };
    }

    try {
      // temporalLayer를 생략하면 mediasoup worker가 해당 consumer에서 가능한
      // 최대 temporal layer를 기본값으로 채운다. 즉 현재 정책은
      // "spatial(해상도)만 명시적으로 낮추고 temporal(fps 계층)은 최대 유지"다.
      //
      // 이 호출은 preferred layer를 바꾸는 것이고, 실제로 선택된 current layer는
      // 네트워크 상태나 producer 상태에 따라 더 낮아질 수 있다. 실제 값은
      // 위의 `layerschange` 이벤트를 통해 클라이언트에 전달된다.
      return await peer.setPreferredLayersOfConsumer(spatialLayer, consumerId);
    } catch (error) {
      console.error(
        `[group-study-management.service:setConsumerPreferredLayers] Failed to set preferred layers for consumer ${consumerId}:`,
        error
      );
      return {
        success: false,
        error: `Failed to set preferred layers - message -> ${error.message}` // QQQ: 이거 message field가 존재하나?
      };
    }
  }

  async setCommonPreferredLayersForAllConsumers(
    socketId: string,
    spatialLayer: number
  ): Promise<AckResponse<CommonPreferredLayersForAllConsumersData>> {
    const peer = this.requirePeer(
      socketId,
      'setCommonPreferredLayersForAllConsumers'
    );
    if (!peer) {
      return { success: false, error: 'Peer does not exist' };
    }

    try {
      const result =
        await peer.setCommonPreferredLayersForAllConsumer(spatialLayer);
      return {
        success: result.success,
        error: result.success
          ? undefined
          : `${result.failed.length} consumer(s) failed to set preferred layers`,
        data: {
          succeeded: result.succeeded,
          failed: result.failed
        }
      };
    } catch (error) {
      console.error(
        '[group-study-management.service:setCommonPreferredLayersForAllConsumers] Failed:',
        error
      );
      return {
        success: false,
        error: `Failed to set preferred layers for all consumers - message -> ${
          error instanceof Error ? error.message : String(error)
        }`
      };
    }
  }

  async resumeConsumer(socketId: string, consumerId: string) {
    const peer = this.requirePeer(socketId, 'resumeConsumer');
    if (!peer) {
      return { success: false, error: 'Peer does not exist' };
    }
    const consumer = this.requireConsumer(peer, consumerId, 'resumeConsumer');
    if (!consumer) {
      return { success: false, error: 'Consumer not found' };
    }

    await consumer.resume();
    console.log(
      `[group-study-management.service:resumeConsumer] Consumer ${consumerId} resumed for peer ${socketId}`
    );

    return { success: true, data: { resumed: true } };
  }

  async connectTransport(
    socketId: string,
    dtlsParameters: DtlsParameters,
    type: 'send' | 'recv'
  ) {
    const peer = this.requirePeer(socketId, 'connectTransport');
    if (!peer) {
      return { success: false, error: 'Peer transport not found' };
    }
    if (!peer.sendTransport) {
      console.error(
        `[group-study-management.service:connectTransport] Send transport not found for client ${socketId}`
      );
      return { success: false, error: 'Send transport not found' };
    }
    if (!peer.recvTransport) {
      console.error(
        `[group-study-management.service:connectTransport] Receive transport not found for client ${socketId}`
      );
      return { success: false, error: 'Receive transport not found' };
    }
    if (type === 'send') {
      await peer.sendTransport.connect({
        dtlsParameters: dtlsParameters
      });
    }
    if (type === 'recv') {
      await peer.recvTransport.connect({
        dtlsParameters: dtlsParameters
      });
    }
    return { success: true };
  }

  async createProducer(
    clientSocket: Socket,
    transportId: string,
    kind: 'video' | 'audio',
    rtpParameters: ProducerOptions['rtpParameters']
  ) {
    try {
      const peer = this.requirePeer(clientSocket.id, 'createProducer');

      if (!peer) {
        return { success: false, error: 'Peer transport not found' };
      }
      if (!peer.sendTransport) {
        console.error(
          `[group-study-management.service:createProducer] Send transport not found for client ${clientSocket.id}`
        );
        return { success: false, error: 'Send transport not found' };
      }
      if (peer.sendTransport.id !== transportId) {
        console.error(
          `[group-study-management.service:createProducer] Send transport mismatch for client ${clientSocket.id}. expected=${peer.sendTransport.id}, received=${transportId}`
        );
        return { success: false, error: 'Send transport mismatch' };
      }

      const shouldLog = process.env.NODE_ENV !== 'production';

      const incomingEncodings: RtpEncodingParameters[] =
        rtpParameters?.encodings ?? [];
      if (shouldLog) {
        console.log(
          '[group-study-management.service:createProducer] incoming encoding summary',
          {
            count: incomingEncodings.length,
            encodings: incomingEncodings.map((encoding, index) => {
              // mediasoup 타입에는 없지만 WebRTC 클라이언트가 보내는 encodings에 올 수 있음
              const e = encoding as RtpEncodingParameters & {
                active?: boolean;
                maxFramerate?: number;
              };
              return {
                index,
                rid: e.rid,
                active: e.active,
                maxBitrate: e.maxBitrate,
                maxFramerate: e.maxFramerate,
                scalabilityMode: e.scalabilityMode,
                ssrc: e.ssrc
              };
            })
          }
        );
      }

      const producer = await peer.sendTransport.produce({
        kind,
        rtpParameters
      });

      const negotiatedEncodings = producer.rtpParameters?.encodings ?? [];
      if (shouldLog) {
        console.log(
          '[group-study-management.service:createProducer] negotiated encoding summary',
          {
            count: negotiatedEncodings.length,
            encodings: negotiatedEncodings.map((encoding, index) => ({
              index,
              rid: encoding.rid,
              maxBitrate: encoding.maxBitrate,
              dtx: encoding.dtx,
              scalabilityMode: encoding.scalabilityMode,
              ssrc: encoding.ssrc
            }))
          }
        );
      }

      // 첫 전송이 시작된 직후 stats를 보면 simulcast 레이어별 SSRC 유입 여부를 확인하기 쉽다.
      setTimeout(async () => {
        try {
          const stats = await producer.getStats();
          const uniqueSsrcs = [
            ...new Set(
              stats
                .map((stat) => stat.ssrc)
                .filter((ssrc) => typeof ssrc === 'number')
            )
          ];
          const streamCountBySsrc = uniqueSsrcs.length;
          if (shouldLog) {
            console.log(
              '[group-study-management.service:createProducer] producer stats summary',
              {
                uniqueSsrcCount: streamCountBySsrc,
                ssrcs: uniqueSsrcs
              }
            );
            console.log(
              '[group-study-management.service:createProducer] producer stats encoding-related',
              stats
                .filter((stat) => typeof stat.ssrc === 'number')
                .map((stat) => ({
                  type: stat.type,
                  mimeType: stat.mimeType,
                  rid: stat.rid,
                  ssrc: stat.ssrc,
                  kind: stat.kind,
                  bitrate: stat.bitrate,
                  score: stat.score,
                  bitrateByLayer:
                    'bitrateByLayer' in stat ? stat.bitrateByLayer : undefined
                }))
            );
          }
        } catch (statsError) {
          if (shouldLog) {
            console.warn(
              '[group-study-management.service:createProducer] Failed to read producer stats',
              statsError
            );
          }
        }
      }, 10000);

      producer.addListener('transportclose', () => {
        console.log(
          '[group-study-management.service:createProducer:transportclose] sendTransport has been closed'
        );
        const roomId = peer.room?.id;
        if (roomId) {
          this.notifyProducerClosed(clientSocket, roomId, producer.id);
        }
      });

      peer.addProducer(producer);

      const producerPayload: ProducerPayload = {
        producerId: producer.id,
        socketId: clientSocket.id,
        kind,
        displayName: peer.userNickname
      };

      const roomId = peer.room?.id;

      if (roomId) {
        clientSocket
          .to(roomId)
          .emit(EventNames.ROOM_GET_PRODUCER, [producerPayload]);
      } else {
        console.warn(
          `[group-study-management.service:createProducer] Peer ${clientSocket.id} is not in any room, producer not broadcast`
        );
      }

      return { success: true, data: { producerId: producer.id } };
    } catch (error) {
      console.error(
        '[group-study-management.service:createProducer] Error in produce:',
        error
      );

      return {
        success: false,
        error: 'Error occurred while creating a producer'
      };
    }
  }

  closeProducer(
    clientSocket: Socket,
    producerId?: string,
    kind?: 'video' | 'audio'
  ) {
    const peer = this.requirePeer(clientSocket.id, 'closeProducer');
    if (!peer) {
      return;
    }

    let targetProducerId = producerId;

    if (!targetProducerId && kind) {
      console.log(
        `[group-study-management.service:closeProducer] Searching for producer by kind '${kind}' in peer ${clientSocket.id}. Producers count: ${peer.producers.size}`
      );
      for (const [id, producer] of peer.producers) {
        console.log(
          `[group-study-management.service:closeProducer] Checking producer ${id}: kind=${producer.kind}`
        );
        if (producer.kind === kind) {
          targetProducerId = id;
          console.log(
            `[group-study-management.service:closeProducer] Found producer ${id} by kind ${kind}`
          );
          break;
        }
      }
    }

    if (!targetProducerId) {
      console.warn(
        `[group-study-management.service:closeProducer] No producerId provided and could not find producer by kind ${kind} for peer ${clientSocket.id}`
      );
      return;
    }

    const producer = peer.producers.get(targetProducerId);
    if (producer) {
      producer.close();
      peer.producers.delete(targetProducerId);
      console.log(
        `[group-study-management.service:closeProducer] Producer ${targetProducerId} closed for peer ${clientSocket.id}`
      );

      const roomId = peer.room?.id;
      if (roomId) {
        clientSocket.to(roomId).emit(EventNames.PRODUCER_CLOSED, {
          producerId: targetProducerId
        });
      }
    } else {
      console.warn(
        `[group-study-management.service:closeProducer] Producer ${targetProducerId} not found for peer ${clientSocket.id}`
      );
    }
  }

  async pauseProducer(
    socketId: string,
    kind: 'video' | 'audio'
  ): Promise<AckResponse> {
    const peer = this.requirePeer(socketId, 'pauseProducer');
    if (!peer) return { success: false, error: 'Peer not found' };

    const producer = peer.getProducer(kind);
    if (!producer)
      return { success: false, error: `No ${kind} producer found` };

    await producer.pause();
    console.log(
      `[group-study-management.service:pauseProducer] Producer ${producer.id} (${kind}) paused for peer ${socketId}`
    );
    return { success: true };
  }

  async resumeProducer(
    socketId: string,
    kind: 'video' | 'audio'
  ): Promise<AckResponse> {
    const peer = this.requirePeer(socketId, 'resumeProducer');
    if (!peer) return { success: false, error: 'Peer not found' };

    const producer = peer.getProducer(kind);
    if (!producer)
      return { success: false, error: `No ${kind} producer found` };

    await producer.resume();
    console.log(
      `[group-study-management.service:resumeProducer] Producer ${producer.id} (${kind}) resumed for peer ${socketId}`
    );
    return { success: true };
  }
  //#endregion

  //#region Only Room
  getRoomList() {
    return Array.from(this.roomsMap.values()).map((room) =>
      room.toClientInfo()
    );
  }

  async createRoom(name: string) {
    // 1. Create room in DB
    const newRoomDoc = await new this.roomModel({
      name: name || 'Untitled Room'
    }).save();
    const roomId = newRoomDoc._id.toString();

    // 2. Create in-memory Room entity
    const room = new Room(roomId, newRoomDoc.name, newRoomDoc.isPermanent);
    this.roomsMap.set(roomId, room);

    console.log(
      `[group-study-management.service:createRoom] Room created: ${roomId} (${room.name})`
    );

    return roomId;
  }
  //#endregion

  //#region Peer & Room
  // [Server -> Client] 방에 입장하고자 하는 클라이언트의 요청(JOIN_ROOM)을 처리하고,
  // 그 방에 이미 있던 다른 사람들에게 '새로운 유저가 들어왔어!(ROOM_PEER_JOINED)'라고 알립니다.
  async joinRoom(
    clientSocket: Socket,
    roomId: string,
    todayTotalDuration: number = 0
  ) {
    const peer = this.requirePeer(clientSocket.id, 'joinRoom');
    if (!peer) {
      return {
        success: false,
        error: `peer ${clientSocket.id} does not exist`
      };
    }

    // 새롭게 방에 입장는 클라이언트의 오늘 집중 시간을 저장.
    peer.todayTotalDuration = todayTotalDuration;

    const room = this.roomsMap.get(roomId);
    if (!room) {
      return { success: false, error: `room ${roomId} does not exist` };
    }

    peer.addRoom(room);
    room.addPeer(peer);

    await clientSocket.join(roomId);
    console.log(
      `[group-study-management.service:joinRoom] Peer ${peer.id} joined room ${room.id} with ${todayTotalDuration} mins today`
    );
    console.log(
      `[group-study-management.service:joinRoom] The room ${room.id} has ${room.getPeers().length} members`
    );

    // [Server -> Client(s)] 이 방에 이미 들어와 있던 다른 사람들에게만 '나(clientSocket) 방금 들어왔어!'라고 통지합니다.
    // EventNames.JOIN_ROOM (요청): "저 이 방에 들어갈게요" (Client -> Server)
    // EventNames.ROOM_PEER_JOINED (알림): "얘 방금 우리 방에 들어왔어요" (Server -> Clients in Room)
    clientSocket.to(roomId).emit(EventNames.ROOM_PEER_JOINED, {
      peerId: clientSocket.id,
      todayTotalDuration: peer.todayTotalDuration // DESIGN: 내 todayTotalDuration을 participants가 최초 인식하도록 하게 하는 지점.
    });
    // NOTE: Socket.IO에서 broadcasting 문법 두가지 패턴:
    // Socket.IO에서 .to(roomId).emit(...) 패턴 자체가 특정 방(room)에 있는 자신(발신자)을 제외한 나머지 모든 사람들에게 메시지를 뿌리는 방송(Broadcast) 행위를 의미합니다.
    // 명시적으로 broadcast라는 단어가 안 쓰여 있어서 헷갈리실 수 있는데, Socket.IO의 메서드 체이닝 구조상 아래의 두 코드는 완전히 같은 동작을 합니다.
    // 1번 방식 (현재 작성하신 코드 - 가장 권장/일반적인 방식) -> clientSocket.to(roomId).emit('EVENT', data);
    // 2번 방식 (명시적 broadcast 사용 - 옛날 버전이나 특정 상황에서 쓰임) -> clientSocket.broadcast.to(roomId).emit('EVENT', data);

    const existingProducers = room
      .getAllProducers()
      .filter((p) => p.socketId !== clientSocket.id);
    const routerRtpCapabilities = this.mediasoupService.getRtcCapabilities();

    // 방에 이미 존재하던 사람들의 id와 오늘 집중 시간을 묶어서 방금 입장한 사람에게 반환합니다.
    const peers = room
      .getPeers()
      .filter((p) => p.id !== clientSocket.id)
      .map((p) => ({
        id: p.id,
        todayTotalDuration: p.todayTotalDuration
      }));

    return {
      success: true,
      data: {
        roomId,
        routerRtpCapabilities,
        existingProducers,
        peers
      }
    };
  }

  // NOTE: 현재 Room이 사라지는 것은... in-memory에서 더이상 ref가 참조하지 않을때 GC되는 것을 기반으로 하고 있음. 어떻게?...
  // 참조하는 주체 - 1)peer 2)roomsMap
  async leaveRoom(clientSocket: Socket) {
    try {
      const peer = this.requirePeer(clientSocket.id, 'leaveRoom');
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
            `[group-study-management.service:leaveRoom] Room ${room.id} deleted from DB as it is empty`
          );
        } catch (dbErr) {
          console.error(
            `[group-study-management.service:leaveRoom] Failed to delete room ${room.id} from DB`,
            dbErr
          );
        }
      }

      peer.close();

      await clientSocket.leave(room.id);

      peer.removeRoom();
      console.log(
        `[group-study-management.service:leaveRoom] Peer ${clientSocket.id} left room ${room.id}`
      );

      return { success: true, data: { left: true } };
    } catch (error) {
      console.warn(
        '[group-study-management.service:leaveRoom] Error in handlePeerLeaveRoom in the SignalingGateway',
        error
      );

      return {
        success: false,
        error: 'Unknown error occurred while a peer leaving a room'
      };
    }
  }

  handleChatMessage(
    clientSocket: Socket,
    message: string
  ): { success: boolean; error?: string } {
    const peer = this.requirePeer(clientSocket.id, 'handleChatMessage');
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
      timestamp: new Date().toISOString()
    };

    clientSocket.to(room.id).emit(EventNames.CHAT_MESSAGE, chatPayload);

    return { success: true };
  }

  //#endregion

  // [Real-time Duration Sync]
  updatePeerTodayTotalDuration(
    clientSocket: Socket,
    todayTotalDuration: number
  ) {
    const peer = this.requirePeer(
      clientSocket.id,
      'updatePeerTodayTotalDuration'
    );
    if (!peer || !peer.room) return;

    // 서버 메모리에 있는 해당 Peer의 최신 통계를 갱신.
    peer.todayTotalDuration = todayTotalDuration;

    // 같은 방에 있는 다른 사람들에게 이 Peer의 최신 통계를 Broadcast 합니다.
    clientSocket
      .to(peer.room.id)
      .emit(EventNames.PEER_TODAY_TOTAL_DURATION_UPDATED, {
        peerId: peer.id,
        todayTotalDuration
      });
  }

  //#region Kind of helpers
  private notifyPeerLeft(clientSocket: Socket, roomId: string) {
    clientSocket
      .to(roomId)
      .emit(EventNames.ROOM_PEER_LEFT, { peerId: clientSocket.id });
  }

  private notifyProducerClosed(
    clientSocket: Socket,
    roomId: string,
    producerId: string
  ) {
    clientSocket.to(roomId).emit(EventNames.PRODUCER_CLOSED, {
      producerId
    });
  }
  //#endregion
}
