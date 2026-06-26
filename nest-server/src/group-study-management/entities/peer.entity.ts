import {
  WebRtcTransport,
  Producer,
  Consumer,
  RtpCapabilities
} from 'mediasoup/types';
import { Room } from './room.entity';
import { ChatMessageInfo } from 'src/common/webrtc/payload-related';

export class Peer {
  public readonly id: string; // Firebase uid — never changes across reconnects
  public currentSocketId: string; // current socket.id — swapped on reconnect
  public userNickname: string;
  // 동시에 한곳에만 입장할 수 있다는 그 제약 그리고 transport은 재활용될 수 없다는 것 (그러니까 room과 transport은 1:1의 관계인것)
  //-> NOTE: peer는 어떤 임의의 시점에서 관찰되었을 때, 동시에 두가지 방에 존재할 수 없음. Peer가 가지고 있는 transport의 존재는 지금 그가 존재하는 방에 종속된다. 그렇다면, 방에서 나간다는 것은,
  // transport의 존재도 같이 사라진다는 것. (그렇게 해야한다던데... ... 재활용 못한데..대충 읽기에는 그랬고.. 그냥 이렇게 하면 안전빵 같음. 지금 뭐 더 복잡하게 설계하지는 못하겠음 ㅠ)
  public room: Room | null;
  public rtpCapabilities?: RtpCapabilities; // mediasoup-client의 device initialization의 결과. This means that the peer's device in the client has this `rtpCapabilities`, which we call normally just device RtpCapabilities.
  public sendTransport?: WebRtcTransport;
  public recvTransport?: WebRtcTransport;
  public readonly producerMap: Map<string, Producer> = new Map();
  public readonly consumerMap: Map<string, Consumer> = new Map(); // consumerId, Consumer

  // [Added for Real-time Duration Sync]
  // Peer가 현재까지 집중한 오늘 총 시간(분)을 서버 메모리 상에 보관합니다.
  // 방에 새로 들어오는 사람에게 이 값을 전달해주기 위해 필요합니다.
  public todayTotalDuration: number = 0; // 본인의 데이터는 더하거나 뭐 다른 method를 사용하는게 아니라 public이니까 그냥 직접 assignment하는 방식으로 update한다.
  public chatMessages: ChatMessageInfo[] = []; // sender here is peer himself // TODO: leave room -> chatMessages도 지워야함.
  // public readonly chatMessages: Array<{ message: string; peerId: string; timestamp: number }>

  public removalTimer: NodeJS.Timeout | null;

  constructor(uid: string, socketId: string, userNickname: string) {
    this.id = uid;
    this.currentSocketId = socketId;
    this.userNickname = userNickname;
    this.room = null;
    // TODO: Should I initialize other fields too?
  }
  // QQQ: Why setPreferredLayer is not handled inside peer instance?
  //

  // TODO: 로직 옮겨버리기
  async setPreferredLayersOfConsumer(spatialLayer: number, consumerId: string) {
    const consumer = this.consumerMap.get(consumerId);
    if (consumer !== undefined) {
      await consumer.setPreferredLayers({ spatialLayer });
      console.log(
        `[peer.entity:setPreferredLayersOfConsumer] Consumer ${consumerId} preferred spatialLayer set to ${spatialLayer}`
      );
      return { success: true };
    } else {
      console.error(
        `[peer.entity:setPreferredLayersOfConsumer] Consumer ${consumerId} not found for peer ${this.id}`
      );
      return {
        success: false,
        error: `Consumer ${consumerId} not found for peer ${this.id}`
      };
    }
  }

  async setCommonPreferredLayersForAllConsumer(spatialLayer: number) {
    const entries = [...this.consumerMap.entries()];
    const results = await Promise.allSettled(
      entries.map(([, consumer]) =>
        consumer.setPreferredLayers({ spatialLayer })
      )
    );

    const failed: Array<{ consumerId: string; reason: string }> = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const consumerId = entries[index][0];
        const reason =
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason);
        failed.push({ consumerId, reason });
        console.error(
          `[peer.entity:setCommonPreferredLayersForAllConsumer] consumer ${consumerId} (peer ${this.id}):`,
          result.reason
        );
      }
    });

    const succeeded = entries.length - failed.length;
    if (failed.length === 0) {
      console.log(
        `[peer.entity:setCommonPreferredLayersForAllConsumer] Set preferred spatialLayer=${spatialLayer} on ${succeeded} consumer(s) for peer ${this.id}`
      );
    } else {
      console.error(
        `[peer.entity:setCommonPreferredLayersForAllConsumer] Partial failure for peer ${this.id}: ${failed.length} failed, ${succeeded} succeeded (spatialLayer=${spatialLayer})`
      );
    }

    return {
      success: failed.length === 0,
      succeeded,
      failed
    };
  }

  addTransport(transport: WebRtcTransport, type: 'send' | 'recv') {
    if (type === 'send') {
      this.sendTransport = transport;
    } else {
      this.recvTransport = transport;
    }
  }

  logProperties(prefix = '') {
    const tag = prefix ? `${prefix} ` : '';
    console.log(`${tag}Peer [${this.id}]:`, {
      currentSocketId: this.currentSocketId,
      room: this.room?.id ?? null,
      rtpCapabilities: this.rtpCapabilities ? 'set' : 'not set',
      sendTransport: this.sendTransport
        ? { id: this.sendTransport.id, iceState: this.sendTransport.iceState }
        : null,
      recvTransport: this.recvTransport
        ? { id: this.recvTransport.id, iceState: this.recvTransport.iceState }
        : null,
      producers: Array.from(this.producerMap.entries()).map(([id, p]) => ({
        id,
        kind: p.kind
      })),
      consumers: Array.from(this.consumerMap.entries()).map(([id, c]) => ({
        id,
        producerId: c.producerId,
        kind: c.kind
      }))
    });
  }

  addRoom(room: Room) {
    this.room = room;
  }

  removeRoom() {
    this.room = null;
  }

  addProducer(producer: Producer) {
    this.producerMap.set(producer.id, producer);
  }

  addConsumer(consumer: Consumer) {
    this.consumerMap.set(consumer.id, consumer);
  }

  removeConsumer(consumer: Consumer) {
    this.consumerMap.delete(consumer.id);
  }

  getProducer(kind: 'video' | 'audio'): Producer | undefined {
    for (const producer of this.producerMap.values()) {
      if (producer.kind === kind) {
        return producer;
      }
    }
    return undefined;
  }

  closeTransports() {
    console.log(`[peer.entity:close] Closing peer ${this.id}`);
    this.sendTransport?.close();
    this.recvTransport?.close();
  }
}
