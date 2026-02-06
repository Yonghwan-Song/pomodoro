# Troubleshooting: ICE Failure on Room Re-entry

## Symptom

- First time entering a room works fine
- After navigating away **without clicking the "Leave Room" button** (e.g., directly going to Home page), then coming back to GroupStudy and trying to enter a room again → **ICE failure**
- Browser console shows: `WebRTC: ICE failed, add a STUN server and see about:webrtc for more details`

## Investigation

### ICE Connection Log Analysis

Looking at `about:webrtc` in Firefox, the ICE log showed:

```
CAND-PAIR(VnSu): setting pair to state SUCCEEDED    ← ICE connection succeeded initially!
all checks completed success=1 fail=0

... some time later ...

STUN-CLIENT(consent): Timed out                      ← Consent refresh started failing
Consent refresh failed
all checks completed success=0 fail=1
```

**Key observation**: ICE connection succeeded initially, but then **consent refresh** failed.

### What is Consent Refresh?

WebRTC uses a "consent" mechanism to verify the peer is still there:
1. Client periodically sends STUN binding requests (consent refresh)
2. Server responds with STUN binding response
3. If server doesn't respond → connection is considered failed

### Root Cause

When the user navigates away without clicking "Leave Room":
1. **Server side**: Socket disconnects → `handleDisconnect()` → `peer.close()` → server transport is closed
2. **Client side**: Component unmounts, but transport was NOT being closed in the cleanup effect

The client transport was still alive, continuously sending consent refresh requests to a server transport that no longer exists. The server couldn't respond → consent timeout → ICE failure.

On re-entry, this stale state interfered with the new connection.

### Why Weren't the Transports Garbage Collected?

You might wonder: "The `deviceRef` in GroupStudy and `sendTransportRef`/`recvTransportRef` in Room become inaccessible when components unmount. Shouldn't the Transport objects be garbage collected?"

**No, they won't be immediately garbage collected because:**

1. **WebRTC PeerConnection is browser-managed**: Each mediasoup Transport wraps a browser's `RTCPeerConnection`. This is a native browser object **that continues running independently of JavaScript references** until explicitly closed.

2. **Active timers and event loops**: The Transport has internal timers for ICE keep-alive, consent refresh, DTLS heartbeats, etc. These active timers prevent garbage collection.

3. **Internal mediasoup-client references**: The mediasoup-client library maintains internal data structures that may hold references to Transport objects.

4. **Browser WebRTC stack**: The underlying WebRTC stack (ICE agent, DTLS, SRTP) continues operating and holding resources.

**This is why `transport.close()` must be called explicitly** - it's not enough to just let the React refs go out of scope. The `close()` method:
- Closes the underlying `RTCPeerConnection`
- Stops all timers and event loops
- Releases browser WebRTC resources
- Allows proper garbage collection

## Solution

Close client-side transports when leaving a room - both via button click AND via cleanup effect.

### 1. In the `leaveRoom()` function (button click)

```typescript
const leaveRoom = async () => {
  sendTransportRef.current?.close();
  recvTransportRef.current?.close();

  // ... emit LEAVE_ROOM and wait for ACK
};
```

### 2. In the cleanup effect (page navigation without "Leave Room", refresh, tab close, etc.)

```typescript
useEffect(() => {
  hasLeftRoomRef.current = false;

  return () => {
    // Close transports first (stops ICE/consent immediately)
    sendTransportRef.current?.close();
    recvTransportRef.current?.close();

    // Notify server (fire-and-forget, server also cleans up on handleDisconnect)
    if (socketRef.current && isRoomJoinedRef.current && !hasLeftRoomRef.current) {
      socketRef.current.emit(EventNames.LEAVE_ROOM);
    }
  };
}, []);
```

**Note**: The cleanup effect handles cases where the user leaves without clicking "Leave Room" - such as using browser navigation, closing the tab, or refreshing the page.

## Key Lesson

From the [mediasoup-client documentation](https://mediasoup.org/documentation/v3/mediasoup-client/api/#transport-close):

> **transport.close()**
>
> Closes the transport, including all its producers and consumers.
>
> **This method should be called when the server side transport has been closed (and vice-versa).**

Both client and server must close their transports to properly terminate the WebRTC connection.

## Related Files

- `webrtc-client/src/components/Room.tsx` - Client-side transport management
- `signaling-server/src/group-study-management/group-study-management.service.ts` - Server-side `peer.close()`
- `signaling-server/src/group-study-management/entities/peer.entity.ts` - `Peer.close()` implementation