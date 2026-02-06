# Peer Entity Design Decisions

## 1. Storage of Socket Object

### Question
Should we store the full `Socket` object in the `Peer` entity to send messages later?

### Decision: **NO**

### Reasoning
1.  **Memory Management**: The `Socket` object is heavy (buffers, events, internal state). Storing it in `Peer` (which is often referenced by Rooms) creates strong reference cycles, making Garbage Collection difficult and risking memory leaks.
2.  **Redundancy**: Socket.IO's `Server` instance already manages all connected sockets via internal maps (e.g., `io.sockets.sockets`). We do not need to duplicate this storage.
3.  **Sufficient Access**:
    - **Inside Handlers**: You already have the `client: Socket` object passed as an argument.
    - **Outside Handlers**: You only need the `socketId`. You can send messages to any specific client using the global server instance:
      ```typescript
      // Clean and safe
      this.server.to(peer.id).emit('event', data);
      ```

---

## 2. Naming: `socketId` vs `id`

### Question
Since a Peer currently maps 1:1 to a WebSocket connection, is it better to name the property `socketId` (explicit) or `id` (abstract)?

### Decision: **`id`**

### Reasoning
1.  **Abstraction (Entity vs. Transport)**:
    - `Peer` is a **Business Entity**.
    - `Socket` is a **Transport Mechanism**.
    - Naming it `id` decouples the identity of the user from the method of connection. `peer.id` says "This is the Peer's ID", whereas `peer.socketId` says "This is the socket implementation detail".

2.  **Consistency with Mediasoup**:
    - Mediasoup uses `.id` for all its entities (`producer.id`, `consumer.id`, `transport.id`). Using `peer.id` makes the codebase uniform.

3.  **Future-Proofing (Reconnection)**:
    - If a user briefly disconnects (e.g., WiFi flicker), their `socketId` will change upon reconnection.
    - If we use `id`, we can keep the `Peer` object alive and simply update the underlying socket reference (or just map the new socket to the old `id`).
    - If we rely on `socketId` as the primary key, the identity is lost the moment the connection drops.
