import { Peer } from './peer.entity';

export class Room {
  public readonly id: string;
  public readonly name: string;
  public readonly peers: Map<string, Peer> = new Map();
  public readonly createdAt: Date;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
    this.createdAt = new Date();
  }

  addPeer(peer: Peer): void {
    this.peers.set(peer.id, peer);
    console.log(
      `[room.entity:addPeer] Peer ${peer.id} joined room ${this.id}`,
    );
  }

  removePeer(peerId: string): Peer | undefined {
    const peer = this.peers.get(peerId);
    if (peer) {
      this.peers.delete(peerId);
      console.log(
        `[room.entity:removePeer] Peer ${peerId} left room ${this.id}`,
      );
    }
    return peer;
  }

  getPeers(): Peer[] {
    return Array.from(this.peers.values());
  }

  getAllProducers(): { producerId: string; socketId: string; kind: string }[] {
    const producers: { producerId: string; socketId: string; kind: string }[] =
      [];
    for (const peer of this.peers.values()) {
      for (const producer of peer.producers.values()) {
        producers.push({
          producerId: producer.id,
          socketId: peer.id,
          kind: producer.kind,
        });
      }
    }
    return producers;
  }

  isEmpty(): boolean {
    return this.peers.size === 0;
  }

  toClientInfo(): { id: string; name: string; peerCount: number } {
    return {
      id: this.id,
      name: this.name,
      peerCount: this.peers.size,
    };
  }
}
