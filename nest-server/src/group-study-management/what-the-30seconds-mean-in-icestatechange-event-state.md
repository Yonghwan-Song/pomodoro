# What The 30 Seconds Means In `icestatechange`

- question I asked

```md
Does the 30 seconds in the following documentation mean the number of seconds after the "failed" state of the connectionState event in the mediasoup-client transport was fired? ...or... just any 30 seconds after the last connectivity check (STUN Binding Request) sent by its counterpart regardless of whether it was automatically sent by ICE AGENT during the first "diconnected" state or was the one manually sent by the ICE Restart codes we have written?

docs:
This event will be emitted with iceState: 'disconnected' when ICE consent check fails (meaning that during the last 30 seconds the remote endpoind didn't send any ICE consent request, so probably network is down or the endpoint disconnected abruptly), and also when the remote endpoint was connected using TCP protocol and the TCP connection was closed. The application should close the transport when this happens since it's not recoverable.
```

---

The `30 seconds` in the mediasoup documentation for server-side `WebRtcTransport` `icestatechange` does **not** mean:

- 30 seconds after the client-side `mediasoup-client` transport emitted `connectionState: "failed"`

It means:

- during roughly the last 30 seconds, the server-side transport did not receive ICE consent requests from the remote endpoint

So the reference point is **recent inbound ICE consent traffic**, not the moment some other event fired in the client.

## The Correct Mental Model

After ICE connectivity is established, the remote endpoint keeps sending periodic ICE consent checks.

Mediasoup watches whether those consent requests continue to arrive.

If they stop arriving for about 30 seconds, mediasoup may emit:

- `iceState: "disconnected"`

So the timeout is effectively a rolling "have I heard recent consent traffic from the remote endpoint?" check.

### Background Knowledge

클라이언트에서 disconnected state으로 변경되면 그 이후로 ICE AGNET가 자동으로 몇번...?... Connectivity check 해보고 안되면 failed로 state바꿈.
이때가 이제 programmatically 개입해서 ICE Restart logic을 실행해야하는 시점임. 시바 그러고보니... 어차피 똑같은 connectivity check인데 내가 또 시도할 필요가 있었던가?...
이것을 구현하기로 마음먹기 전에는 이런 사실을 잘 모르고.. 하기로 한것이긴 한데... 아무튼 그래도 몇번 더 기회를 줄 수는 있긴함... 아니면....
**그.. 랩탑 뚜껑 닫고 다시 열던가 아니면 절전모드로 전환된 후 돌아올 경우에는 뭔가 효용이 있지 않을까?**

## What It Is Not Anchored To

It is not anchored to:

- the time when client `transport.on("connectionstatechange")` emitted `"failed"`
- the time when the app started ICE restart logic
- the time when the first `"disconnected"` event was seen on the client

Those events may happen before or after the server-side `iceState: "disconnected"`, but they do not define the 30-second window described in the docs.

## About ICE Restart

Manual ICE restart does not change the meaning of the docs sentence.

ICE restart may cause new ICE checks and may eventually restore connectivity, but the 30-second rule is still about whether mediasoup is receiving valid consent/check traffic from the remote side.

So this is the right way to think about it:

- if consent/check traffic resumes successfully, the transport may stay alive or recover
- if mediasoup still does not receive that traffic for long enough, it may emit `iceState: "disconnected"`

## Important Distinction: Client vs Server Events

These are different layers and should not be treated as one timer:

- client side: `mediasoup-client transport.on("connectionstatechange", state)`
- server side: `WebRtcTransport.on("icestatechange", iceState)`

They are related, but they are not the same state machine.

Because of that, you should not assume:

- "server `iceState: disconnected` happens 30 seconds after client `connectionState: failed`"

That assumption is incorrect.

## Practical Reading For `iptables` Tests

When testing with `iptables`, log these as separate timestamps:

1. when the client transport first reports `disconnected` or `failed`
2. when the server transport reports `iceState: "disconnected"`
3. when the transport is later `closed`

Those are separate observations and may be separated by meaningful time gaps.

## Short Answer

The docs mean:

- "during the last 30 seconds, the remote endpoint did not send ICE consent requests"

The docs do **not** mean:

- "30 seconds after the client transport emitted `failed`"
