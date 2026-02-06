# Room and Peer Design

## Room is removed

### How - By GC

1. `peer.room = null`
2. roomId is deleted from `peerToRoomMap`

### When - Peer leaves room

### Possible Issues

1. A peer enters a room as soon as the last peer in the room leaves the room.
