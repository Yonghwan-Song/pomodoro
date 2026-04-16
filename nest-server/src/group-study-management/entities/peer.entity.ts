import {
  WebRtcTransport,
  Producer,
  Consumer,
  RtpCapabilities
} from 'mediasoup/types';
import { Room } from './room.entity';

export class Peer {
  public readonly id: string;
  public userNickname: string;
  public room: Room | null;
  public rtpCapabilities?: RtpCapabilities;
  public sendTransport?: WebRtcTransport;
  public recvTransport?: WebRtcTransport;
  public readonly producers: Map<string, Producer> = new Map();
  public readonly consumers: Map<string, Consumer> = new Map(); // TODO: 이거 가지고 공통 preferred layer 함수 호출하면 될듯. 그런데 아예 다른 함수가 있나?

  // [Added for Real-time Duration Sync]
  // Peer가 현재까지 집중한 오늘 총 시간(분)을 서버 메모리 상에 보관합니다.
  // 방에 새로 들어오는 사람에게 이 값을 전달해주기 위해 필요합니다.
  public todayTotalDuration: number = 0;

  constructor(socketId: string, userNickname: string) {
    this.id = socketId;
    this.userNickname = userNickname;
  }
  // QQQ: Why setPreferredLayer is not handled inside peer instance?
  //

  // TODO: 로직 옮겨버리기
  async setPreferredLayersOfConsumer(spatialLayer: number, consumerId: string) {
    const consumer = this.consumers.get(consumerId);
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
    const entries = [...this.consumers.entries()];
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
      room: this.room?.id ?? null,
      rtpCapabilities: this.rtpCapabilities ? 'set' : 'not set',
      sendTransport: this.sendTransport
        ? { id: this.sendTransport.id, iceState: this.sendTransport.iceState }
        : null,
      recvTransport: this.recvTransport
        ? { id: this.recvTransport.id, iceState: this.recvTransport.iceState }
        : null,
      producers: Array.from(this.producers.entries()).map(([id, p]) => ({
        id,
        kind: p.kind
      })),
      consumers: Array.from(this.consumers.entries()).map(([id, c]) => ({
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
    this.producers.set(producer.id, producer);
  }

  addConsumer(consumer: Consumer) {
    this.consumers.set(consumer.id, consumer);
  }

  removeConsumer(consumer: Consumer) {
    this.consumers.delete(consumer.id);
  }

  getProducer(kind: 'video' | 'audio'): Producer | undefined {
    for (const producer of this.producers.values()) {
      if (producer.kind === kind) {
        return producer;
      }
    }
    return undefined;
  }

  close() {
    console.log(`[peer.entity:close] Closing peer ${this.id}`);
    this.sendTransport?.close();
    this.recvTransport?.close();
  }
}
