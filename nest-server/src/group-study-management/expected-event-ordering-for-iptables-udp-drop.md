# Expected Event Ordering For `iptables` UDP Drop Tests

This note describes the **most likely** event ordering when you intentionally break UDP connectivity with `iptables` while your app is using mediasoup transports.

It is not a strict guarantee. Actual ordering can vary by:

- whether the currently selected ICE tuple was UDP or TCP
- whether Socket.IO signaling over TCP/WebSocket stays alive
- whether ICE restart succeeds before mediasoup reaches its server-side consent timeout
- whether your `iptables` rule drops outbound UDP, inbound UDP, or both

## Assumptions

The explanation below assumes:

- the selected tuple was UDP before the test
- your `iptables` rule breaks the active UDP path enough that ICE consent/check traffic stops working
- Socket.IO signaling remains alive because it is typically using TCP/WebSocket
- your client app is the current version where ICE restart is attempted on client `connectionstatechange === "failed"`

If the selected tuple switches to TCP instead, you may see recovery without the expected long failure path.

## Important Mapping

In this app:

- client `sendTransport` <-> server peer `sendTransport`
- client `recvTransport` <-> server peer `recvTransport`

The client `sendTransport` is used when the client produces media to the server.

The client `recvTransport` is used when the client consumes media from the server.

If UDP is broken at the host/network level, **both** client transports are likely affected because both ICE connections depend on UDP traffic to their selected tuples.

## Expected Client-Side Order

### 1. Client send transport

Most likely sequence:

1. `connected`
2. `disconnected`
3. possibly `failed`
4. if restart works: back toward `connecting` / `connected`
5. if restart never works and your app leaves the room: `closed`

Notes:

- `disconnected` is usually the first visible degradation signal.
- Your current client code attempts ICE restart only on `failed`, not on `disconnected`.
- So there may be a noticeable gap between the first trouble sign and the moment your recovery logic starts.

### 2. Client recv transport

Most likely sequence is very similar:

1. `connected`
2. `disconnected`
3. possibly `failed`
4. if restart works: recover to `connected`
5. if app cleanup closes it: `closed`

In practice, send and recv transports may not fail at exactly the same millisecond, but if the same UDP path is broken they often degrade within a similar time window.

## Expected Server-Side Order

### 3. Server peer `sendTransport`

This is the server-side transport paired with the client's producing path.

Most likely sequence:

1. `iceState: "connected"` or `"completed"`
2. no immediate server `"disconnected"` necessarily
3. after consent traffic has been missing for about 30 seconds: `iceState: "disconnected"`
4. later, when app cleanup closes the transport: `closed`

Important:

- The server-side `iceState: "disconnected"` is based on missing consent/check traffic.
- It is **not** anchored to the moment when the client transport emitted `failed`.

### 4. Server peer `recvTransport`

Most likely sequence is the same pattern:

1. `iceState: "connected"` or `"completed"`
2. after enough missing consent traffic: `iceState: "disconnected"`
3. later explicit teardown: `closed`

Again, the exact timing may differ slightly from the peer `sendTransport`, but both are usually affected by a real UDP path break.

## The Most Important Timing Distinction

There are two different clocks involved:

1. client transport connection state clock
2. server transport ICE consent timeout clock

That means the following assumption is wrong:

- "server `iceState: disconnected` happens 30 seconds after client `connectionState: failed`"

The better mental model is:

- client state changes reflect the browser/libwebrtc side of ICE/DTLS transport health
- server `iceState: disconnected` reflects mediasoup deciding it has not received consent traffic for about 30 seconds

So the server may report `disconnected` before, after, or roughly around client `failed`, depending on how the failure unfolds.

## Where ICE Restart Fits

In your current client code:

- ICE restart begins only when client transport `connectionState` becomes `failed`

So a likely sequence is:

1. UDP is dropped
2. client transport becomes `disconnected`
3. later client transport becomes `failed`
4. client sends `RESTART_ICE` over still-alive Socket.IO signaling
5. server generates new ICE parameters
6. client applies `restartIce(...)`

Then one of two things happens:

### Recovery path

- a new valid path is found
- consent traffic resumes
- client transport returns to `connected`
- server transport may remain alive or return to healthy ICE state without ever reaching server-side `disconnected`

### Non-recovery path

- restart attempts do not restore a valid path
- server eventually hits its own consent timeout and reports `iceState: "disconnected"`
- later your app logic or disconnect cleanup closes the transport, producing `closed`

## Why `closed` Often Comes Much Later

`closed` usually means explicit teardown, not just passive packet loss.

In this project, that can happen because:

- the client calls room leave logic
- the peer entity closes transports
- signaling disconnect cleanup later removes the peer after the grace period

So during your tests, `closed` should usually be interpreted as:

- "the application or cleanup code intentionally closed the transport"

not:

- "the network failure itself directly emitted `closed`"

## Practical Log Reading Strategy

For each transport, compare these timestamps separately:

1. client `connectionstatechange: disconnected`
2. client `connectionstatechange: failed`
3. server `icestatechange: disconnected`
4. server transport `closed`
5. Socket.IO disconnect reason and timestamp, if it also disconnects

That gives you a much clearer picture than trying to force everything into one single timer.

## Example Timeline

Example only, not guaranteed:

```text
t=0s   iptables starts dropping UDP
t=3s   client send transport: connected -> disconnected
t=4s   client recv transport: connected -> disconnected
t=8s   client send transport: disconnected -> failed
t=8s   client recv transport: disconnected -> failed
t=8s   client emits RESTART_ICE for both transports over Socket.IO
t=38s  server send transport: ice=connected -> disconnected
t=39s  server recv transport: ice=completed -> disconnected
t=70s  app gives up and leaves room
t=70s  server transports: closed
```

Another possible timeline:

```text
t=0s   iptables starts dropping UDP
t=3s   client transport: connected -> disconnected
t=8s   client transport: disconnected -> failed
t=8s   ICE restart begins
t=10s  tuple changes or connectivity recovers
t=11s  client transport: connected
t=11s+ server never reaches its 30s consent timeout
```

## Final Takeaway

For UDP-drop experiments, expect the likely order to be:

- client degradation first
- client `failed` later
- ICE restart attempt if signaling survives
- server `iceState: disconnected` only after its own consent timeout if recovery does not happen
- `closed` only when cleanup/teardown actually closes the transport

Treat each of those as a separate observation with its own timing.
