# Mediasoup & WebRTC Core Concepts

이 문서는 Mediasoup v3를 사용하면서 논의된 핵심 WebRTC 개념, Transport 아키텍처, 그리고 Producer/Consumer의 내부 동작 원리를 정리한 것입니다.

## 1. Transport 객체의 본질

Mediasoup-client의 `Transport` 객체는 겉보기에 단순한 인터페이스처럼 보이지만, 실제로는 브라우저의 **`RTCPeerConnection` (Web API)**을 깊게 추상화한 것입니다.

### 소스 코드 관점의 실체
Mediasoup-client 소스 코드(예: `Chrome111.js`)를 들여다보면, `Handler` 클래스 내부에서 실제로 다음과 같이 `RTCPeerConnection`을 생성합니다:

```javascript
/* mediasoup-client 내부 구현 */
this._pc = new RTCPeerConnection({
    iceServers: iceServers ?? [],
    iceTransportPolicy: iceTransportPolicy ?? 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    ...additionalSettings,
});
```

*   **구조**: `Transport` -> `_handler` (브라우저별 구현체) -> `RTCPeerConnection`
*   **증거**: `getStats()`가 `RTCStatsReport`를 반환하고, `updateIceServers()`가 `RTCIceServer[]`를 받는다는 점에서 표준 WebRTC API를 감싸고 있음을 알 수 있습니다.

---

## 2. Stateful vs Connectionless

WebRTC는 기본적으로 **UDP (Connectionless)** 위에서 동작하지만, Transport 객체 자체는 **Stateful(상태 기반)**입니다. 이는 다음과 같은 이유 때문입니다.

### 3가지 상태 계층
1.  **보안 상태 (DTLS State)**: 가장 중요합니다. UDP 패킷은 암호화되지 않으면 의미가 없으므로, Handshake를 통해 교환한 **비밀 키(Secret Key)**와 **암호화 컨텍스트**를 메모리에 유지합니다. 이 상태가 깨지면 통신이 불가능합니다.
2.  **연결 상태 (ICE State)**: 최적의 네트워크 경로(Candidate Pair)를 찾고, 주기적인 핑(Binding Request)을 통해 그 경로가 살아있는지(Connected/Disconnected/Failed)를 추적합니다.
3.  **미디어 상태 (RTP State)**: 순서가 뒤죽박죽인 UDP 패킷을 올바르게 조립하기 위해 시퀀스 넘버(Sequence Number)와 지터 버퍼(Jitter Buffer) 상태를 유지합니다.

**결론**: Transport는 단순한 파이프가 아니라, 불안정한 UDP 위에 **"보안 터널(DTLS)"과 "신뢰성 보정(ICE/RTP)"이라는 복잡한 문맥(Context)을 유지하는 객체**입니다.

---

## 3. "연결이 끊어졌다"의 의미

Transport의 연결 끊김은 두 가지 관점으로 해석됩니다.

### 코딩 관점 (Application Layer)
*   **객체 소멸**: `transport.close()` 호출 시, C++ 및 JS 레벨의 리소스가 해제됩니다.
*   **이벤트**: `connectionstatechange`가 `failed` 또는 `closed`로 변경됩니다.
*   **결과**: 더 이상 메서드(`produce`, `consume`)를 호출할 수 없으며, 메모리에서 가비지 컬렉션 대상이 됩니다.

### 네트워크 관점 (Network Layer)
*   **식별자의 무효화**: 5-Tuple (Source IP/Port, Dest IP/Port, Protocol) 매핑이 서버에서 삭제됩니다.
*   **Heartbeat 중단**: Keep-alive 패킷이 멈춥니다.
*   **Decryption 불가**: DTLS Context(키)가 삭제되어, 패킷이 도달하더라도 해독할 수 없어 폐기됩니다.

> **Note**: "화면 공유 중지"와 같은 기능은 보통 Transport를 끊는 것이 아니라, 그 위의 **Producer만 닫는 것**입니다. Transport를 끊으면 다시 연결하는 데 비용(시간)이 많이 들기 때문입니다.

---

## 4. Producer와 Consumer의 정체

이들은 Mediasoup이 만든 용어이지만, 그 실체는 WebRTC 표준 부품입니다.

### Producer 📤 (생산자)
*   **실체**: **`RTCRtpSender`** (Web API)
*   **역할**: `MediaStreamTrack`(카메라/마이크)을 인코딩하여 Transport 도로 위로 내보내는 트럭.
*   **동작**: 내부적으로 `pc.addTransceiver()` 혹은 `pc.addTrack()`을 사용합니다.

### Consumer 📥 (소비자)
*   **실체**: **`RTCRtpReceiver`** (Web API)
*   **역할**: Transport를 타고 들어온 암호화된 RTP 패킷을 디코딩하여 `MediaStreamTrack`으로 변환하는 수신 장치.

### 왜 `connect` 이벤트가 없는가?
Producer와 Consumer에는 `connect` 이벤트가 없습니다.
*   **이유**: 연결(Connection)은 도로인 **Transport**가 이미 맺어놓았기 때문입니다.
*   **WebRTC BUNDLE**: 현대 WebRTC는 하나의 Transport(Port)로 모든 미디어(Audio/Video/Data)를 다 보냅니다.
*   Producer/Consumer는 이미 뚫려있는 터널에 **탑승(Multiplexing)**하는 존재이므로, 생성되는 즉시 전송이 시작됩니다.

---

## 5. Mediasoup 라이브러리 구조 (Inference)

Mediasoup은 브라우저 파편화를 해결하기 위해 **Handler** 패턴을 사용합니다.
*   `Transport` 클래스는 직접 로직을 수행하지 않고 `_handler`에게 위임합니다.
*   `_handler`는 실행 환경(Chrome, Firefox, Safari)에 따라 적절한 구현체(예: `Chrome111`, `Firefox120`)가 선택됩니다.
*   이로 인해 개발자는 브라우저 호환성을 신경 쓰지 않고 `transport.produce()` 같은 통일된 API를 사용할 수 있습니다.
