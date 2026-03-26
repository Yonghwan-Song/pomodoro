import { Peer } from './peer.entity';

// DB의 Room을 가지고 어떻게 Room을 만드는지
export class Room {
  public readonly id: string;
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
    console.log(`[room.entity:addPeer] Peer ${peer.id} joined room ${this.id}`);
  }

  removePeer(peerId: string): Peer | undefined {
    const peer = this.peers.get(peerId);
    if (peer) {
      this.peers.delete(peerId);
      console.log(
        `[room.entity:removePeer] Peer ${peerId} left room ${this.id}`
      );
    }
    return peer;
  }

  getPeers(): Peer[] {
    return Array.from(this.peers.values());
  }

  getAllProducers(): {
    producerId: string;
    socketId: string;
    kind: string;
    displayName?: string;
  }[] {
    const producers: {
      producerId: string;
      socketId: string;
      kind: string;
      displayName?: string;
    }[] = [];
    for (const peer of this.peers.values()) {
      for (const producer of peer.producers.values()) {
        producers.push({
          producerId: producer.id,
          socketId: peer.id,
          kind: producer.kind,
          displayName: peer.userNickname
        });
      }
    }
    return producers;
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
