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
  ChatMessageInfo,
  CommonPreferredLayersForAllConsumersData,
  ConsumerLayersChangedPayload,
  DataToSyncForPeerReconnected,
  JOIN_ROOM_DATA,
  ProducerPayload
} from 'src/common/webrtc/payload-related';
import { InjectModel } from '@nestjs/mongoose';
import { Room as RoomSchemaClass, RoomDocument } from 'src/schemas/room.schema';
import { Model } from 'mongoose';

@Injectable()
export class GroupStudyManagementService
  implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GroupStudyManagementService.name);
  // NOTE: 마치 이곳을 로비 정도로 생각하면 될듯. 사람들이 대기하고있고, 여러개의 방이 있고 (물론 지금은 공개방 하나 있음 30명으로 제한 예정)
  private peerMap: Map<string, Peer> = new Map();
  private roomMap: Map<string, Room> = new Map();

  constructor(
    private readonly mediasoupService: MediasoupService,
    @InjectModel(RoomSchemaClass.name)
    private readonly roomModel: Model<RoomDocument> // TODO: RoomDocument는 대체 정체가 뭐임...
  ) { }

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
        this.roomMap.set(roomId, room);
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
  // TODO: 대충 이전에 transport 에러로 disconnected된 socket의 id만 알 수 있다면...
  // 그거로 peer entitiy의 socketId만 갈아끼우면 되긴 하거든?.. .그러면 이제 정체성이란게 다시 승계/연결되는거니까...
  addPeer(uid: string, socketId: string, userNickname: string) {
    const newPeer = new Peer(uid, socketId, userNickname);
    this.peerMap.set(uid, newPeer);
    this.logCurrentState('[group-study-management.service:addPeer]');
  }

  getPeer(uid: string): Peer | undefined {
    return this.peerMap.get(uid);
  }

  // TODO: What if peers have some weird data, such as, [] or... 0?
  prepareDataForSyncOfPeerReconnected(
    uid: string // firebase uid as a peerId
  ): DataToSyncForPeerReconnected | undefined {
    // TODO: peer가 존재하지 않거나, room이 존재하지 않는 경우 error핸들링 해야하나
    const peer = this.getPeer(uid);
    const room = peer.room;

    if (room === undefined) {
      // How about preventing this situation from within the client side?
      console.log('User was in a lobby');
      return undefined;
    }

    // ERROR: Cannot read properties of undefined (reading 'getPeers')
    // But why is this called?...... <-- Look at the if statement above.
    const peersTodayTotalFocusArray = room
      .getPeers()
      .filter((p) => p.id !== uid)
      .map((p) => ({
        peerId: p.id,
        todayTotalDuration: p.todayTotalDuration
      }));

    const chatMessagesOfAllParticipants: ChatMessageInfo[] = [];
    room
      .getPeers()
      .filter((p) => p.id !== uid)
      .forEach((p) => {
        chatMessagesOfAllParticipants.push(...p.chatMessages);
      });

    // NOTE: 재연결되면서 어떻게 내가 한 말은 상대에게 재전달 되는거지? -> 그... socket.io의 buffer에 저장되었다가 reconnect시 자동으로 재전송 최대 한번 시도함.
    // If my chat messages that were failed to be sent are still in the client side, and then I get the backup of missing chat, the order of chat messages will become incorrect as far as I can tell.
    // TODO: Therefore, I need a way to enforce the chat order whenever the the messages state is set.
    return {
      peersTodayTotalFocusArray,
      chatMessages: chatMessagesOfAllParticipants
    };
  }

  updatePeerCurrentSocket(uid: string, newSocketId: string) {
    const peer = this.peerMap.get(uid);
    if (peer) {
      peer.currentSocketId = newSocketId;
      //QQQ: disconnected된 socket은 자동 폐기되는건가?
      console.log(
        `[group-study-management.service:updatePeerCurrentSocket] Peer ${uid} socket updated to ${newSocketId}`
      );
    }
  }

  private logCurrentState(prefix: string) {
    console.log(`========== STATE SNAPSHOT ========== ${prefix}`);
    console.log(
      `${prefix} Total peers: ${this.peerMap.size}, Total rooms: ${this.roomMap.size}`
    );

    if (this.peerMap.size > 0) {
      console.log(`$--- PEERS --- {prefix}`);
      this.peerMap.forEach((peer) => {
        peer.logProperties(prefix);
      });
    }

    if (this.roomMap.size > 0) {
      console.log(`--- ROOMS --- ${prefix}`);
      this.roomMap.forEach((room, roomId) => {
        const peers = room.getPeers();
        const producers = room.makeAndGetProducerPayloadArray();
        console.log(`${prefix} Room [${roomId}] "${room.name}":`, {
          peerCount: peers.length,
          peerIds: peers.map((p) => p.id),
          producerCount: producers.length,
          producers: producers.map((p) => ({
            id: p.producerId,
            peerId: p.peerId,
            kind: p.kind
          }))
        });
      });
    }

    console.log(`===================================== ${prefix}`);
  }

  removePeerFromPeerMap(uid: string) {
    if (this.peerMap.delete(uid)) {
      console.log(
        `[group-study-management.service:removePeer] Peer ${uid} removed from peersMap`
      );
      console.log('Remaining peers in the peerMap are like below');
      for (const key of this.peerMap.keys()) {
        console.log(key);
      }
    } else {
      console.warn(
        `[group-study-management.service:removePeer] Peer ${uid} not found in peersMap`
      );
    }
  }

  private requirePeer(uid: string, context: string): Peer | null {
    const peer = this.peerMap.get(uid);

    if (peer) {
      return peer;
    }

    console.error(
      `[group-study-management.service:${context}] Peer ${uid} not found`
    );

    return null;
  }

  private requireConsumer(
    peer: Peer,
    consumerId: string,
    context: string
  ): Consumer | null {
    const consumer = peer.consumerMap.get(consumerId);

    if (consumer) {
      return consumer;
    }

    console.error(
      `[group-study-management.service:${context}] Consumer ${consumerId} not found for peer ${peer.id}`
    );

    return null;
  }

  setPeerRtpCapabilities(uid: string, rtpCapabilities: RtpCapabilities) {
    const peer = this.requirePeer(uid, 'setPeerRtpCapabilities');
    if (!peer) return;
    peer.rtpCapabilities = rtpCapabilities;
  }

  async establishTransport(uid: string, type: 'send' | 'recv') {
    const peer = this.requirePeer(uid, 'establishTransport');
    if (!peer) return;

    const transport = await this.mediasoupService.getWebRtcTransport();

    const logPrefix = `[${type}:${transport.id}]`;
    // With enableTcp: true, mediasoup emits UDP and TCP ICE candidates; [0] is not reliably UDP.
    const udpIce = transport.iceCandidates.find((c) => c.protocol === 'udp');
    const tcpIce = transport.iceCandidates.find((c) => c.protocol === 'tcp');
    const createdAt = Date.now();
    let lastObservedIceState = transport.iceState;
    let lastIceStateChangedAt = createdAt;

    const formatElapsedMs = (ms: number) => `${ms}ms`;
    const buildLifecycleSuffix = (now: number) =>
      `peer=${uid} age=${formatElapsedMs(now - createdAt)} ts=${new Date(
        now
      ).toISOString()} ${logPrefix}`;
    const getIceStateLog = (iceState: typeof transport.iceState) => {
      if (iceState === 'disconnected') return console.warn;
      if (iceState === 'connected' || iceState === 'completed') {
        return console.info;
      }
      return console.log;
    };

    transport.on('dtlsstatechange', (dtlsState) => {
      const now = Date.now();
      console.log(`dtls=${dtlsState} ${buildLifecycleSuffix(now)}`);
    });

    transport.on('icestatechange', (iceState) => {
      const now = Date.now();
      const previousIceState = lastObservedIceState;
      const transition =
        previousIceState === iceState
          ? iceState
          : `${previousIceState} -> ${iceState}`;

      getIceStateLog(iceState)(
        `ice=${transition} ` +
        `sinceLastIce=${formatElapsedMs(now - lastIceStateChangedAt)} ` +
        buildLifecycleSuffix(now)
      );

      lastObservedIceState = iceState;
      lastIceStateChangedAt = now;
    });

    // NOTE: https://mediasoup.org/documentation/v3/mediasoup/api/#TransportTuple
    // https://mediasoup.org/documentation/v3/mediasoup/api/#webRtcTransport-on-iceselectedtuplechange
    // Emitted after ICE state becomes “completed” and when the ICE selected tuple changes.
    transport.on('iceselectedtuplechange', (tuple) => {
      const now = Date.now();
      console.log(
        `tuple=${tuple.protocol} ` +
        `local=${tuple.localIp}:${tuple.localPort} ` +
        `remote=${tuple.remoteIp}:${tuple.remotePort} ` +
        buildLifecycleSuffix(now)
      );
    });

    transport.observer.on('close', () => {
      const now = Date.now();
      console.warn(
        `closed ` +
        `lastIce=${lastObservedIceState} ` +
        `sinceLastIce=${formatElapsedMs(now - lastIceStateChangedAt)} ` +
        buildLifecycleSuffix(now)
      );
    });

    peer.addTransport(transport, type);

    console.log(
      `created peer=${uid} ` +
      `initialIce=${transport.iceState} ` +
      `udpPort=${udpIce?.port ?? 'n/a'} ` +
      (tcpIce ? `tcpPort=${tcpIce.port} ` : '') +
      `iceCandidates=${transport.iceCandidates.length} ${logPrefix}`
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
      const consumingPeerId = clientSocket.data.uid as string;
      const consumingPeer = this.peerMap.get(consumingPeerId);
      const producingPeer = this.peerMap.get(producingPeerId);

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

      consumer.on('producerpause', () => {
        console.log(`producerpause for ${consumer.id}`);
        // mediasoup implicitly stops RTP when a producer pauses.
        // We do NOT explicitly call consumer.pause() here to avoid overwriting
        // the viewer-side local pause state.
        // TODO: 이것도 필요한게 맞아? observer event로 구독하면 되는거 아닌가
        clientSocket.emit('PRODUCER_PAUSED', { producingPeerId });
      });

      consumer.on('score', (score) => {
        console.log(`consumer score change of ${consumer.id}`, score);
      });

      consumer.on('producerresume', () => {
        console.log(`producerresume for ${consumer.id}`);
        // Same here, we do NOT explicitly call consumer.resume().
        clientSocket.emit('PRODUCER_RESUMED', { producingPeerId });
      });

      consumer.on('producerclose', () => {
        console.log(
          `Consumer ${consumer.id} closed due to producer close`
        );
        consumingPeer.removeConsumer(consumer)
        console.log(
          `Consumer ${consumer.id} removed from peer ${consumingPeer.id}`
        );
      });

      consumer.on('transportclose', () => {
        console.log(
          `[group-study-management.service:createConsumer:transportclose] Consumer ${consumer.id} closed due to transport close`
        );
      });

      //? client에서 emit하는 preferred layers 관련 message events를 뭔가 직접 사용하고 그러는 것은 아닌듯?
      consumer.on('layerschange', (layers: ConsumerLayers | undefined) => {
        // mediasoup의 `layerschange`는 "preferred layer를 이렇게 원한다"가 아니라
        // "지금 실제로 forwarding 중인 current layer가 이렇게 바뀌었다"는 신호다.
        // 그래서 UI 표시값은 preferredLayers보다 이 이벤트 payload를 신뢰하는 편이 맞다.
        //
        // 또한 이 이벤트는 품질이 바뀔 때만 오는 것이 아니라, consume 직후
        // 초기 current layer가 처음 결정되는 시점에도 올 수 있다. 다만 항상
        // 즉시 온다고 가정하면 안 되고, 실제 RTP 흐름이 잡힌 뒤에야 올 수도 있다.
        // NOTE: When reloading client app, socket.io disconnect for `transport close` happens. And layerschange and score events are fired, not producepause.

        // [주의: BWE(Bandwidth Estimation) 기반 Network Drop 감지]
        // Mediasoup는 내부적으로 RTCP 피드백(REMB, TWCC)을 통해 BWE(대역폭 추정)를 지속적으로 수행합니다.
        // 송출자(Producer)나 수신자(Consumer)의 네트워크 상태가 악화되어 BWE 값이 심각하게 낮아지거나 패킷 유실이 심해지면,
        // SFU 서버는 더 이상 적절한 미디어 레이어를 전송할 수 없다고 판단하여 스스로 할당할 공간 레이어(spatial layer)를 찾지 못하게 됩니다.
        // 이때 Mediasoup는 Consumer에게 할당된 레이어가 없음을 알리기 위해 `layerschange` 이벤트를 발생시키며 `layers`를 `undefined`로 전달합니다.
        // 즉, 이 undefined 값은 단순한 화질 정보 부재가 아니라, "네트워크 문제나 BWE 저하로 인해 해당 Consumer에 대한 미디어 포워딩이 사실상 중단된 상태(Network Drop)"임을 의미하는 중요한 Heartbeat와 같은 역할을 합니다.
        const ts = new Date().toISOString();
        if (layers === undefined) {
          console.warn(
            `[LAYER DROP ⚠] ${ts} consumer=${consumer.id} producerId=${consumer.producerId} consumingPeer=${consumingPeerId}`
          );
        } else {
          console.log(
            `[LAYER CHANGE] ${ts} consumer=${consumer.id} producerId=${consumer.producerId} consumingPeer=${consumingPeerId} spatial=${layers.spatialLayer} temporal=${layers.temporalLayer ?? 'max'}`
          );
        }
        const payload: ConsumerLayersChangedPayload = {
          consumerId: consumer.id,
          layers
        };

        clientSocket.emit(EventNames.CONSUMER_LAYERS_CHANGED, payload);
      });

      consumingPeer.addConsumer(consumer);
      this.logCurrentState('[group-study-management.service:createConsumer]');

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
    uid: string,
    consumerId: string,
    spatialLayer: number
  ) {
    const peer = this.requirePeer(uid, 'setConsumerPreferredLayers');
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
        error: `Failed to set preferred layers - message -> ${error instanceof Error ? error.message : String(error)
          }`
      };
    }
  }

  async setCommonPreferredLayersForAllConsumers(
    uid: string,
    spatialLayer: number
  ): Promise<AckResponse<CommonPreferredLayersForAllConsumersData>> {
    const peer = this.requirePeer(
      uid,
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
        error: `Failed to set preferred layers for all consumers - message -> ${error instanceof Error ? error.message : String(error)
          }`
      };
    }
  }

  async pauseConsumer(uid: string, consumerId: string) {
    const peer = this.requirePeer(uid, 'pauseConsumer');
    if (!peer) {
      return { success: false, error: 'Peer does not exist' };
    }
    const consumer = this.requireConsumer(peer, consumerId, 'pauseConsumer');
    if (!consumer) {
      return { success: false, error: 'Consumer not found' };
    }

    await consumer.pause();
    console.log(
      `[group-study-management.service:pauseConsumer] Consumer ${consumerId} paused for peer ${uid}`
    );

    return { success: true, data: { paused: true } };
  }

  async resumeConsumer(uid: string, consumerId: string) {
    const peer = this.requirePeer(uid, 'resumeConsumer');
    if (!peer) {
      return { success: false, error: 'Peer does not exist' };
    }
    const consumer = this.requireConsumer(peer, consumerId, 'resumeConsumer');
    if (!consumer) {
      return { success: false, error: 'Consumer not found' };
    }

    await consumer.resume();
    console.log(
      `[group-study-management.service:resumeConsumer] Consumer ${consumerId} resumed for peer ${uid}`
    );

    return { success: true, data: { resumed: true } };
  }

  // [Client -> Server] 클라이언트가 "나 이 방에 들어갈래" 라고 서버에 요청하는 이벤트입니다.
  // 전제: 1. socket이 끊어지지 않고, transport가 끊어진 경우에만 호출된다.
  //      2. socket이 끊어졌던 경우에도, 다시 끊어졌던 client의 socketId에 의해 만들어졌던 peer라는 정체성을 좀비가 되지 않게 갖고 있다가 다시 연결해준 후를 가정한다.
  // server쪽에서는 transport의 port number를 그대로 유지하려고 한데
  async restartIce(uid: string, role: 'send' | 'recv') {
    // [ICE Restart (서버 측 처리)]
    // 클라이언트가 네트워크 단절로 인해 ICE Restart를 요청했을 때 실행되는 메서드입니다.
    // 기존의 연결 자원(UDP 포트 등)은 그대로 유지하되, 새로운 ICE Credentials (ufrag, pwd)만 갱신합니다.

    // QQQ: this line assumes that the socket connection was not disconnected. In other words, only the UDP connection was disconnected.
    // DESIGN: 만약에 우리가 ... socket이 재연결 된 경우 항상 기존에 disconnected되었던 것을 언제나 승계한다고 전제할 수 있다면 지금 이 코드에서 어떤 변화도 안줘도 괜찮은거 아니야?
    const peer = this.requirePeer(uid, 'restartIce');
    if (!peer) return { success: false, error: 'Peer not found' };

    const transport = role === 'send' ? peer.sendTransport : peer.recvTransport;
    if (!transport) {
      return { success: false, error: `No ${role} transport found` };
    }

    try {
      console.log(
        `[group-study-management.service:restartIce] Restarting ICE for peer ${uid}, role: ${role}`
      );
      // transport.restartIce()를 호출하면 서버 측 mediasoup worker에서
      // 해당 transport에 대한 새로운 iceParameters를 발급합니다. (포트 등 iceCandidates는 그대로 유지됨)
      // QQQ: iceCandidates이 그냥 유지된다면, 만약 Wifi에서 LTE로 바꿔서 ip address가 바뀌는 경우에는 iceCandidates도 새롭게 생성되어야 하는거 아닌가?..
      // 그런 경우에는 그러면 이 코드는 효과가 없는거 아니야?
      const iceParameters = await transport.restartIce();

      // 발급된 새로운 인증 정보를 클라이언트에게 반환합니다.
      // 클라이언트는 이를 받아 자신의 transport에 적용(restartIce())하여 연결을 재개합니다.
      return { success: true, data: { iceParameters } };
    } catch (error) {
      console.error(
        `[group-study-management.service:restartIce] Error restarting ICE:`,
        error
      );
      return { success: false, error: 'Failed to restart ICE' };
    }
  }

  async connectTransport(
    uid: string,
    dtlsParameters: DtlsParameters,
    type: 'send' | 'recv'
  ) {
    const peer = this.requirePeer(uid, 'connectTransport');
    if (!peer) {
      return { success: false, error: 'Peer transport not found' };
    }
    if (!peer.sendTransport) {
      console.error(
        `[group-study-management.service:connectTransport] Send transport not found for client ${uid}`
      );
      return { success: false, error: 'Send transport not found' };
    }
    if (!peer.recvTransport) {
      console.error(
        `[group-study-management.service:connectTransport] Receive transport not found for client ${uid}`
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
      const uid = clientSocket.data.uid as string;
      const peer = this.requirePeer(uid, 'createProducer');

      if (!peer) {
        return { success: false, error: 'Peer transport not found' };
      }
      if (!peer.sendTransport) {
        console.error(
          `[group-study-management.service:createProducer] Send transport not found for client ${uid}`
        );
        return { success: false, error: 'Send transport not found' };
      }
      if (peer.sendTransport.id !== transportId) {
        console.error(
          `[group-study-management.service:createProducer] Send transport mismatch for client ${uid}. expected=${peer.sendTransport.id}, received=${transportId}`
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

      producer.on('score', (score) => {
        console.log(
          `Producer ${producer.id} (peer: ${peer.id}) score updated in createProducer:scorechange of group-study-management.service`,
          score
        );
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
      // setTimeout(async () => {
      //   try {
      //     const stats = await producer.getStats();
      //     const uniqueSsrcs = [
      //       ...new Set(
      //         stats
      //           .map((stat) => stat.ssrc)
      //           .filter((ssrc) => typeof ssrc === 'number')
      //       )
      //     ];
      //     const streamCountBySsrc = uniqueSsrcs.length;
      //     if (shouldLog) {
      //       console.log(
      //         '[group-study-management.service:createProducer] producer stats summary',
      //         {
      //           uniqueSsrcCount: streamCountBySsrc,
      //           ssrcs: uniqueSsrcs
      //         }
      //       );
      //       console.log(
      //         '[group-study-management.service:createProducer] producer stats encoding-related',
      //         stats
      //           .filter((stat) => typeof stat.ssrc === 'number')
      //           .map((stat) => ({
      //             type: stat.type,
      //             mimeType: stat.mimeType,
      //             rid: stat.rid,
      //             ssrc: stat.ssrc,
      //             kind: stat.kind,
      //             bitrate: stat.bitrate,
      //             score: stat.score,
      //             bitrateByLayer:
      //               'bitrateByLayer' in stat ? stat.bitrateByLayer : undefined
      //           }))
      //       );
      //     }
      //   } catch (statsError) {
      //     if (shouldLog) {
      //       console.warn(
      //         '[group-study-management.service:createProducer] Failed to read producer stats',
      //         statsError
      //       );
      //     }
      //   }
      // }, 10000);

      producer.addListener('transportclose', () => {
        //* 로그아웃 -> 해당 사용자가 방에 참가하고있었다면 transport만 우선 close -> event chain에 의해 1)transport에 있던 producer close되고, 그 producer를 consume하고 있던 2)consumer도 close된다고 알고있음.
        //* 그런데 2)는 어디에 적어뒀지? -> consumer on producerclose
        console.log(
          '[group-study-management.service:createProducer:transportclose] sendTransport has been closed'
        );
        const roomId = peer.room?.id;
        if (roomId) {
          this.notifyProducerClosed(clientSocket, roomId, producer.id);
        }
      });

      peer.addProducer(producer);
      this.logCurrentState('[group-study-management.service:createProducer]');

      const producerPayload: ProducerPayload = {
        producerId: producer.id,
        peerId: peer.id,
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
          `[group-study-management.service:createProducer] Peer ${uid} is not in any room, producer not broadcast`
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
    const uid = clientSocket.data.uid as string;
    const peer = this.requirePeer(uid, 'closeProducer');
    if (!peer) {
      return;
    }

    let targetProducerId = producerId;

    if (!targetProducerId && kind) {
      console.log(
        `[group-study-management.service:closeProducer] Searching for producer by kind '${kind}' in peer ${uid}. Producers count: ${peer.producerMap.size}`
      );
      for (const [id, producer] of peer.producerMap) {
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
        `[group-study-management.service:closeProducer] No producerId provided and could not find producer by kind ${kind} for peer ${uid}`
      );
      return;
    }

    const producer = peer.producerMap.get(targetProducerId);
    if (producer) {
      producer.close();
      peer.producerMap.delete(targetProducerId);
      console.log(
        `[group-study-management.service:closeProducer] Producer ${targetProducerId} closed for peer ${uid}`
      );

      const roomId = peer.room?.id;
      if (roomId) {
        // ASSUMPTION: (FIXED) I think sockets in each device are not in the same room after reconnection. The room actually they are staying is the same in terms of UX and Room entity calss instance.
        // However, in terms of socket.io's room feature, they are not in the same room.
        clientSocket.to(roomId).emit(EventNames.PRODUCER_CLOSED, {
          producerId: targetProducerId
        });
      }
    } else {
      console.warn(
        `[group-study-management.service:closeProducer] Producer ${targetProducerId} not found for peer ${uid}`
      );
    }
  }

  async pauseProducer(
    uid: string,
    kind: 'video' | 'audio'
  ): Promise<AckResponse> {
    const peer = this.requirePeer(uid, 'pauseProducer');
    if (!peer) return { success: false, error: 'Peer not found' };

    const producer = peer.getProducer(kind);
    if (!producer)
      return { success: false, error: `No ${kind} producer found` };

    await producer.pause();
    console.log(
      `[group-study-management.service:pauseProducer] Producer ${producer.id} (${kind}) paused for peer ${uid}`
    );
    return { success: true };
  }

  async resumeProducer(
    uid: string,
    kind: 'video' | 'audio'
  ): Promise<AckResponse> {
    const peer = this.requirePeer(uid, 'resumeProducer');
    if (!peer) return { success: false, error: 'Peer not found' };

    const producer = peer.getProducer(kind);
    if (!producer)
      return { success: false, error: `No ${kind} producer found` };

    await producer.resume();
    console.log(
      `[group-study-management.service:resumeProducer] Producer ${producer.id} (${kind}) resumed for peer ${uid}`
    );
    return { success: true };
  }
  //#endregion

  //#region Only Room
  getRoomList() {
    return Array.from(this.roomMap.values()).map((room) => room.toClientInfo());
  }

  async createRoom(name: string) {
    // 1. Create room in DB
    const newRoomDoc = await new this.roomModel({
      name: name || 'Untitled Room'
    }).save();
    const roomId = newRoomDoc._id.toString();

    // 2. Create in-memory Room entity
    const room = new Room(roomId, newRoomDoc.name, newRoomDoc.isPermanent);
    this.roomMap.set(roomId, room);

    console.log(
      `[group-study-management.service:createRoom] Room created: ${roomId} (${room.name})`
    );

    return roomId;
  }
  //#endregion

  //#region Peer & Room
  // [Server -> Client] 방에 입장하고자 하는 클라이언트의 요청(JOIN_ROOM)을 처리하고,
  // 그 방에 이미 있던 다른 사람들에게 '새로운 유저가 들어왔어!(ROOM_PEER_JOINED)'라고 알립니다.
  /**
   * NOTE: What it does -> 1) Entrance 2) Broadcast 3) Prepare JOIN_ROOM_DATA
   *
   * @param connectedSocket Room에 join하고자 하는 peer의 socket
   * @param roomId 입장하고자 하는 방의 identifier
   * @param todayTotalDuration How much time the entering peer has focused on something so far today.
   * @returns
   */
  // QQQ: Is there a process where the new participant gets the todayTotalDuration data from all the pre-existing participants?
  // I know that the opposite way is simple and already implemented though.
  // 하고있음! peer는 todayTotalDuration를 field로 갖고있음.
  async joinRoom(
    connectedSocket: Socket,
    roomId: string,
    todayTotalDuration: number = 0
  ): Promise<AckResponse<JOIN_ROOM_DATA>> {
    const peer = this.requirePeer(
      connectedSocket.data.uid as string,
      'joinRoom'
    );
    if (!peer) {
      return {
        success: false,
        error: `peer ${connectedSocket.data.uid} does not exist`
      };
    }

    peer.todayTotalDuration = todayTotalDuration;

    const room = this.roomMap.get(roomId);
    if (!room) {
      return { success: false, error: `room ${roomId} does not exist` };
    }

    // 1) Entrance
    peer.addRoom(room);
    room.addPeer(peer);
    await connectedSocket.join(roomId);
    console.log(
      `[group-study-management.service:joinRoom] Peer ${peer.id} joined room ${room.id} with ${todayTotalDuration} mins today`
    );
    console.log(
      `[group-study-management.service:joinRoom] The room ${room.id} has ${room.getPeers().length} members`
    );

    /** 2) Broadcasting by ROOM_PEER_JOINED event (JOIN_ROOM -> invokes utimately -> ROOM_PEER_JOINED)
     * [Server -> Client(s)] 이 방에 이미 들어와 있던 다른 사람들에게만 '나(clientSocket) 방금 들어왔어!'라고 통지합니다.
     * - JOIN_ROOM (요청): "저 이 방에 들어갈게요" (Client -> Server)
     * - ROOM_PEER_JOINED (알림): "얘 방금 우리 방에 들어왔어요" (Server -> Clients in Room)
     */
    /** Socket.IO에서 broadcasting 문법 두가지 패턴:
     * Socket.IO에서 .to(roomId).emit(...) 패턴 자체가 특정 방(room)에 있는 자신(발신자)을 제외한 나머지 모든 사람들에게 메시지를 뿌리는 방송(Broadcast) 행위를 의미합니다.
     * 명시적으로 broadcast라는 단어가 안 쓰여 있어서 헷갈리실 수 있는데, Socket.IO의 메서드 체이닝 구조상 아래의 두 코드는 완전히 같은 동작을 합니다.
     * 1번 방식 (현재 작성하신 코드 - 가장 권장/일반적인 방식) -> clientSocket.to(roomId).emit('EVENT', data);
     * 2번 방식 (명시적 broadcast 사용 - 옛날 버전이나 특정 상황에서 쓰임) -> clientSocket.broadcast.to(roomId).emit('EVENT', data);
     */
    connectedSocket.to(roomId).emit(EventNames.ROOM_PEER_JOINED, {
      peerId: peer.id,
      todayTotalDuration: peer.todayTotalDuration // DESIGN: 내 todayTotalDuration을 participants가 최초 인식하도록 하게 하는 지점.
    });

    // 3) Prepare JOIN_ROOM_DATA
    const existingProducers = room
      .makeAndGetProducerPayloadArray()
      .filter((p) => p.peerId !== (connectedSocket.data.uid as string));

    // 방에 이미 존재하던 사람들의 id와 오늘 집중 시간을 묶어서 방금 입장한 사람에게 반환합니다.
    // TODO: let the reconnected peer have this array.... back to his side to make a synchronization of data lost when he was disconnected.
    const peersTodayTotalFocusArray = room
      .getPeers()
      .filter((p) => p.id !== (connectedSocket.data.uid as string))
      .map((p) => ({
        peerId: p.id,
        todayTotalDuration: p.todayTotalDuration
      }));

    return {
      success: true,
      data: {
        selfPeerId: peer.id,
        roomId, // 소유자들 (즉, 참가자들)이 머무르고 있는 같은 공간의 identifier (사실 지금까지는 open방 하나밖에 구현 안해서... identify할 필요가 없긴 함.. :::...)
        existingProducers, // 보고 듣는것
        peersTodayTotalFocusArray // 보고 들을 수 있는것의 소유자들
      }
    };
  }

  // NOTE: 현재 Room이 사라지는 것은... in-memory에서 더이상 ref가 참조하지 않을때 GC되는 것을 기반으로 하고 있음. 어떻게?...
  // 참조하는 주체 - 1)peer 2)roomsMap
  // DESIGN: room에서 peer가 나가지는 것이고, lobby의 peersMap에서 peer를 제거하지는 않음.
  // WARNING: 문제가 될 수 있나? -> lobby에서조차 나가지는 경우, 즉, socket disconnection이 너무 오래 지속되거나 하는 경우,
  // 아니면 그냥... 앱을 꺼버리거나 하는 경우가 있을텐데.. 그런 경우 socket disconnection handler에서 무조건 keep해두기만 하고 peer를 버리지 않게되면,
  // in-memory overflow가 발생하는거 아니냐?... GC를 해야하는데, 지금 codebase에서는 peer를 GC 안하는거 아니야?
  // TODO: socket disconnect 발생 두가지 시나리오 파악 후 peer GC 방법 생각하기.
  async leaveRoom(clientSocket: Socket) {
    try {
      const peer = this.requirePeer(
        clientSocket.data.uid as string,
        'leaveRoom'
      );
      if (!peer) {
        return { success: false, error: 'Peer not found' };
      }

      const room = peer.room;
      if (!room) {
        return { success: false, error: 'Peer is not in any room' };
      }

      // 1.
      room.removePeer(peer.id);

      this.notifyPeerLeft(clientSocket, room.id, peer.id);
      if (room.isEmpty() && !room.isPermanent) {
        this.roomMap.delete(room.id);
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

      peer.closeTransports();
      peer.chatMessages = [];

      await clientSocket.leave(room.id);

      peer.removeRoom();
      console.log(
        `[group-study-management.service:leaveRoom] Peer ${peer.id} left room ${room.id}`
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

  // NOTE: messages are not stored by the server in neither database nor in-memory unlike we store todayTotalDuration in the peer instance.
  // Therefore, let's just make a field in each peer.
  handleChatMessage(
    clientSocket: Socket,
    message: string
  ): { success: boolean; error?: string } {
    const peer = this.requirePeer(
      clientSocket.data.uid as string,
      'handleChatMessage'
    );
    if (!peer) {
      return { success: false, error: 'Peer not found' };
    }

    const room = peer.room;
    if (!room) {
      return { success: false, error: 'Peer is not in any room' };
    }

    const chatPayload: ChatMessageInfo = {
      senderId: peer.id,
      senderNickname: peer.userNickname,
      message: message,
      timestamp: new Date().toISOString()
    };

    peer.chatMessages.push(chatPayload);
    clientSocket.to(room.id).emit(EventNames.CHAT_MESSAGE, chatPayload);

    return { success: true };
  }
  //#endregion

  garbageCollectPeer(peer: Peer, room: Room | null) {
    if (room) {
      room.removePeer(peer.id);
    }
    this.removePeerFromPeerMap(peer.id);
  }

  // [Real-time Duration Sync]
  updatePeerTodayTotalDuration(
    clientSocket: Socket,
    todayTotalDuration: number
  ) {
    const peer = this.requirePeer(
      clientSocket.data.uid as string,
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
  // private notifyPeerLeft(clientSocket: Socket, roomId: string, peerId: string) {
  notifyPeerLeft(clientSocket: Socket, roomId: string, peerId: string) {
    clientSocket.to(roomId).emit(EventNames.ROOM_PEER_LEFT, { peerId });
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
