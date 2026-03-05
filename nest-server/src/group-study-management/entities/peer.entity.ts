import {
  WebRtcTransport,
  Producer,
  Consumer,
  RtpCapabilities,
} from 'mediasoup/node/lib/types';
import { Room } from './room.entity';

export class Peer {
  public readonly id: string;
  public userNickname: string;
  public room: Room | null;
  public rtpCapabilities?: RtpCapabilities;
  public sendTransport?: WebRtcTransport;
  public recvTransport?: WebRtcTransport;
  public readonly producers: Map<string, Producer> = new Map();
  public readonly consumers: Map<string, Consumer> = new Map();

  // [Added for Real-time Duration Sync]
  // Peer가 현재까지 집중한 오늘 총 시간(분)을 서버 메모리 상에 보관합니다.
  // 방에 새로 들어오는 사람에게 이 값을 전달해주기 위해 필요합니다.
  public todayTotalDuration: number = 0;

  constructor(socketId: string, userNickname: string) {
    this.id = socketId;
    this.userNickname = userNickname;
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
        kind: p.kind,
      })),
      consumers: Array.from(this.consumers.entries()).map(([id, c]) => ({
        id,
        kind: c.kind,
      })),
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
