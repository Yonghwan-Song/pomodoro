# Cases of disconnection and recovery

Written in 22-May-2026

## UDP drop only

socket.io's "reconnect" event handler is never invoked.

## TCP and UDP drops

The order of the reconnections of these is quite complicated complicated because I assume that up and down of them doesn't happen once, but could happen unexpectedly multiple times in a very short term.

So, how they are disconnected and reconnect can be considered as a black box. We don't need to think about it. But all the possible cases will come and meet in each other/ or... be merged and be categorized/organized into several cases in the "ice re-negotiation" standpoint/ or... ice restart standpoint.

In other words, after the phase of the black box, there will be a phase where udp reconnection is attempted. So, we just can think about our problem from here.

_First of all, the re-negotiation can be started under a socket either 1)connected or 2)disconnected._ **It's because re-negotiation itself (`transport's resetartIce()`) doesn't natively consider the socket connection status it exists on.**

Therefore, I just made it sure that the procedure for (eventually) calling `transport.restartIce()` doesn't start under _the condition 2)._

```ts
if (socket !== null && get().isSocketConnected !== false)
  get().attemptToRestartIce(transport, "send", socket); // the function responsible for the ICE (re)negotiation
```

```ts
newSocket.io.on("reconnect", () => {
  const { attemptToRestartIce, sendTransport, recvTransport } = get();
  sendTransport !== null &&
    attemptToRestartIce(sendTransport, "send", newSocket);
  recvTransport !== null &&
    attemptToRestartIce(recvTransport, "recv", newSocket);
});
```

### Edge case

In the 1), what if socket is suddenly down and up while ack response is arriving?
The reconnect handler will re-invoke the function unnecessarily. And then the ack res will arrive, invoking the ack callback where the `transport.restartIce()` is called.
But the ack callback will be invoked leading to another ice negotiation though we have just fixed the transport disconnection.

To prevent this, I guarded the `transport.restartIce()` part in the ack callback like below.

```ts
if (ack.success && ack.data?.iceParameters) {
  try {
    if (
      transport.closed ||
      transport.connectionState === "connecting" ||
      transport.connectionState === "connected"
    ) {
      console.log(
        "transport has been recovered already, inside RESTART_ICE Ack Callback"
      );
    } else {
      await transport.restartIce({
        iceParameters: ack.data.iceParameters
      });

      set((state) => {
        state.iceSignalingStatus[kind].isIceRestartEmitted = false;
        state.iceSignalingStatus[kind].isAckResponseNotReceived = false;
      });

      if (timersForIceRestartAttempt[kind]) {
        clearTimeout(timersForIceRestartAttempt[kind]);
      }
    }
  } catch (e) {
    console.error(
      "restartIce function call with the new iceParameters failed",
      e
    );
  }
} else if (!ack.success) {
  console.warn("ack error", ack.error);
}
```
