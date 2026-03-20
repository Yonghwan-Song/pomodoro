# Mediasoup Produce Flow In `connectionStore.ts`

This document explains the non-obvious control flow around:

- `sendTransport.produce(...)`
- `transport.on("produce", handler)`
- dynamic simulcast encoding generation from `MediaStreamTrack.getSettings()`
- why `callback({ id })` is required for the `produce()` call to finish

This pattern is easy to misunderstand because the code looks linear from the outside, but internally it is event-driven.

## 1. High-Level Flow

The client-side flow is:

1. Get a camera stream with `getUserMedia()`.
2. Read the actual applied video track settings via `videoTrack.getSettings()`.
3. Build simulcast `encodings` dynamically from those settings.
4. Call `sendTransport.produce({ track, encodings, ... })`.
5. mediasoup-client internally emits the transport `"produce"` event.
6. The registered `"produce"` handler sends the final `rtpParameters` to the server.
7. The server creates a Producer and returns `producerId`.
8. The handler calls `callback({ id: producerId })`.
9. mediasoup-client resumes its internal produce flow and resolves `await sendTransport.produce(...)` with a `Producer` instance.

## 2. Why `transport.on("produce")` Exists

The `"produce"` event handler is not just a normal notification callback.

It is part of mediasoup-client's contract for creating a server-side Producer.

mediasoup-client knows how to prepare the local sending side, but it does **not** directly create the Producer in the Nest server.  
That must happen through the app's signaling channel, which here is `socket.emit(...)`.

So the handler acts like a bridge:

- mediasoup-client prepares the sending parameters
- the app sends them to the server
- the server creates the Producer
- the app returns the resulting `producerId` back to mediasoup-client via `callback({ id })`

## 3. Where The Handler Parameters Come From

This part is subtle.

When we register:

```ts
transport.on("produce", (parameters, callback, errback) => {
  ...
});
```

the **shape and meaning** of `parameters`, `callback`, and `errback` are defined by mediasoup-client.

However, the **actual values** passed into `parameters` are produced later, when this code runs:

```ts
await sendTransport.produce({
  track: videoTrack,
  encodings,
  codecOptions
});
```

So:

- the handler signature is defined by the library
- the handler argument values are produced from the later `transport.produce(...)` call and the browser/WebRTC/libwebrtc internals

This means `parameters` is not just a raw copy of the `produce()` input.  
It is a more finalized set of values prepared for actual RTP sending.

## 4. `sendTransport.produce(...)` Is Not Just A Plain Function Call <---- IMPT

From the outside, this looks like a normal async call:

```ts
const newProducer = await sendTransport.produce(...);
```

But internally, it behaves more like:

1. prepare local sending state
2. derive the final RTP-related parameters
3. emit transport `"produce"`
4. wait for app signaling to complete
5. receive server-side `producerId`
6. continue internal flow
7. finally resolve with a `Producer`

So the `await` does **not** complete until the `"produce"` handler calls either:

- `callback({ id })`, or
- `errback(error)`

## 5. Why `callback({ id: ackResponse.data.producerId })` Matters

This line is critical:

```ts
callback({ id: ackResponse.data.producerId });
```

It does not directly construct the JavaScript variable `newProducer`.

What it does is:

- tell mediasoup-client that the server successfully created the Producer
- provide the server-side Producer id
- allow mediasoup-client to complete its internal produce sequence

As a result:

- the Promise returned by `sendTransport.produce(...)` resolves
- the resolved `Producer` instance gets associated with that id
- `newProducer.id` becomes the same producer id returned by the server

If `callback(...)` is never called:

- `await sendTransport.produce(...)` cannot complete normally

If `errback(...)` is called:

- the Promise rejects

## 6. Dynamic Simulcast Encoding Policy

Before calling `sendTransport.produce(...)`, the code reads:

```ts
const videoTrackSettings = videoTrack.getSettings();
```

This gives the actual applied track settings from the browser, such as:

- `width`
- `height`
- `frameRate`

Those values are then passed into:

```ts
createSimulcastEncodingsFromTrack(videoTrackSettings);
```

The idea is:

- the real high-layer resolution/FPS is decided by the browser/camera track settings
- the app then derives a simulcast policy from that actual result

So the app does **not** try to hardcode a single fixed simulcast profile for all devices.

Instead:

- high layer bitrate cap depends on actual height/FPS
- mid/low layers are derived from the high layer using
  - `scaleResolutionDownBy`
  - bitrate ratios
  - framerate caps

## 7. Actual Values vs Policy Values

This distinction matters a lot.

### Actual values

These come from the browser/runtime:

- actual `width`
- actual `height`
- actual `frameRate`

Example source:

```ts
videoTrack.getSettings()
```

### Policy values

These are caps chosen by the app:

- `scaleResolutionDownBy`
- `maxBitrate`
- `maxFramerate`

They do not force exact runtime behavior.  
They set limits for how each simulcast layer may behave.

So:

- actual track settings are observed
- encoding caps are derived
- the browser/libwebrtc still controls the final real sending behavior within those limits

## 8. Why This Pattern Feels Unusual

It can feel surprising because the logic is split across:

- normal function calls
- an event handler
- socket signaling
- a Promise that waits on the handler's callback

So the code is not purely top-to-bottom synchronous-looking logic.

The key mental model is:

- `transport.produce(...)` starts the process
- `"produce"` handler performs signaling work
- `callback({ id })` finishes the contract

## 9. Practical Reading Guide

When re-reading the code, use this mapping:

- `videoTrack.getSettings()`
  - actual camera/browser-applied media settings

- `createSimulcastEncodingsFromTrack(...)`
  - app policy derived from those settings

- `sendTransport.produce(...)`
  - start mediasoup-client's local produce flow

- `transport.on("produce", ...)`
  - signaling bridge to server-side Producer creation

- `callback({ id })`
  - hand server-side Producer id back into mediasoup-client so the Promise can resolve

## 10. One-Line Summary

`sendTransport.produce(...)` is not complete until the transport `"produce"` handler sends the finalized RTP parameters to the server, receives a `producerId`, and returns that id back to mediasoup-client via `callback({ id })`.

## Produce관련된 흐름 보충... 
### Q
> 그러면 이게 졸라 신기한게, transport의 produce event의 handler가 내부적으로 ?> > parameter들은 정의가 되어있다는거잖아, 정확히 말하면 그 type들이.
> 그리고 그 type들에 해당하는 값들은 사실 transport.produce()함수의 argument에 의해 제공/결정되는 것이고.


• 네. 그 포인트를 잘 본 겁니다. 구조가 꽤 흥미롭죠.

  정확히는 이런 흐름입니다.

  - transport.on("produce", handler)를 등록할 때
      - handler의 시그니처는 mediasoup-client가 이미 정해둡니다.
      - 즉 parameters, callback, errback의 타입과 역할은 라이브러리 *계약*입니다.
  - 나중에 sendTransport.produce({...})를 호출하면
      - 네가 넘긴 track, encodings, codecOptions 같은 입력을 *바탕으로*
      - mediasoup-client 내부가 실제 parameters 값을 *구성*합니다.
      - **그리고 그 값을 넣어서 "produce" 이벤트 핸들러를 호출합니다.** [POINT]

  즉 네 말대로:

  - 핸들러의 parameter shape/type은 라이브러리가 정의해둔 것
  - 그 parameter의 실제 값은 transport.produce() 인자와 내부 처리 결과로 결정되는 것

  이라고 보면 맞습니다.

  조금 더 엄밀히 말하면, 핸들러의 parameters는 단순히 네가 produce()에 넣은 값을 그대로 복사한 건 아닙니다.
  그보다:

  - 네 입력값
  - track 정보
  - codec negotiation
  - 브라우저 WebRTC 내부 처리
  - mediasoup-client 내부 구성

  이 합쳐져서 만들어진 “produce를 위해 필요한 최종 파라미터 묶음” 입니다.

  그래서 이 패턴은 약간 이런 느낌입니다.

  sendTransport.on("produce", (parameters, callback, errback) => {
    // library가 이 handler contract를 정의함
    // parameters의 실제 값은 이전의 sendTransport.produce(...) 호출에서 유도됨
  });

  await sendTransport.produce({
    track,
    encodings,
    codecOptions
  });

  즉 produce() 호출이 내부적으로:

  1. 필요한 파라미터를 만들고
  2. "produce" 이벤트를 발생시키고
  3. 네 핸들러가 서버와 통신하게 만들고
  4. 그 결과를 callback/errback으로 다시 내부 흐름에 되돌려받는

  구조입니다.

  한 줄로 요약하면:

  - 맞다. 핸들러의 parameter type은 mediasoup-client가 정한 계약이고, 그 실제 값은 transport.produce() 호출 인자와 내부 처리 결과로 만들어진다.

