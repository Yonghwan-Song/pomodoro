import { ProducerPayload } from 'src/common/webrtc/payload-related';
import { Peer } from './peer.entity';

// DB의 Room을 가지고 어떻게 Room을 만드는지
export class Room {
  public readonly id: string; // QQQ: Where do I set it?... is it in-memory (for now) ? since currently there is one open room?
  public readonly name: string;
  public readonly isPermanent: boolean;
  public readonly peers: Map<string, Peer> = new Map(); // NOTE: 휘발성 :::...
  public readonly createdAt: Date;

  constructor(id: string, name: string, isPermanent: boolean) {
    this.id = id;
    this.name = name;
    this.isPermanent = isPermanent;
    this.createdAt = new Date();
  }

  addPeer(peer: Peer): void {
    this.peers.set(peer.id, peer);
  }

  removePeer(peerId: string): Peer | undefined {
    const peer = this.peers.get(peerId);
    if (peer) {
      this.peers.delete(peerId);
      console.log(
        `[room.entity:removePeer] Peer ${peerId} was removed from the peer list in the room ${this.id}`
      );
    }
    return peer;
  }

  getPeers(): Peer[] {
    return Array.from(this.peers.values());
  }

  // 매번 getAllProducers를 새로운 peer가 방에 입장할 때마다 계산해서 전달하는 것보다,
  makeAndGetProducerPayloadArray(): ProducerPayload[] {
    const producerInfoArray: ProducerPayload[] = [];
    for (const peer of this.peers.values()) {
      for (const producer of peer.producerMap.values()) {
        producerInfoArray.push({
          producerId: producer.id,
          peerId: peer.id,
          kind: producer.kind, //? Look at this. producer here 는 타입이 다르잖아. -> /home/yhs/Repos/pomodoro-from-arch/nest-server/node_modules/mediasoup/node/lib/ProducerTypes.d.ts
          displayName: peer.userNickname
        });
      }
    }
    return producerInfoArray;
  }

  // TODO: permanent Room 그러니까 내가 그냥 공개적으로 만들려고 하는 그 방들은 명시적으로 delete하지 않는이상 지워지지 않아야한다.
  // 그러니까... Room에 isTemporary를 그냥 간단하게 넣고... isTemporary === true ->지우고 아니면 ... 흠.
  isEmpty(): boolean {
    return this.peers.size === 0;
  }

  toClientInfo(): { id: string; name: string; peerCount: number } {
    return {
      id: this.id,
      name: this.name,
      peerCount: this.peers.size
    };
  }
}
