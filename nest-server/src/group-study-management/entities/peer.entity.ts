import {
  WebRtcTransport,
  Producer,
  Consumer,
  RtpCapabilities,
} from 'mediasoup/node/lib/types';
import { Room } from './room.entity';

export class Peer {
  public readonly id: string;
  public room: Room | null;
  public rtpCapabilities?: RtpCapabilities;
  public sendTransport?: WebRtcTransport;
  public recvTransport?: WebRtcTransport;
  public readonly producers: Map<string, Producer> = new Map();
  public readonly consumers: Map<string, Consumer> = new Map();

  constructor(socketId: string) {
    this.id = socketId;
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
