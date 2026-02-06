# Mediasoup Architecture: Official Definitions & Mental Model

이 문서는 Mediasoup의 핵심 컴포넌트(`Router`, `Transport`, `Producer`/`Consumer`)에 대한 **공식 API 정의**와, 이를 직관적으로 이해하기 위한 **OSI 7 계층 비유(Mental Model)**를 함께 정리한 문서입니다.

> **참고**: 공식 정의의 출처는 [Mediasoup v3 API Documentation](https://mediasoup.org/documentation/v3/mediasoup/api)입니다.

---

## 1. Router

### 📘 Official Definition
> "A router enables injection, selection and forwarding of media streams through Transport instances created on it. Developers may think of a mediasoup router as if it were a “multi-party conference room”, although mediasoup is much more low level than that."

### 🧠 Mental Model (OSI Layer 3 - Network)
*   **비유:** **교차로 / 신호등 (Routing Hub)**
*   **해석:**
    *   `Router`라는 이름처럼, 네트워크 계층(L3)의 라우터와 유사합니다.
    *   여러 `Transport`들 사이에서 RTP 패킷을 **"어디로 보낼지(Routing)"** 결정하는 중계소 역할을 합니다.
    *   마치 복잡한 도로망의 중심 교차로에서 들어오는 차(패킷)를 보고 "너는 저쪽 도로(Consumer)로 가라"고 신호를 주는 것과 같습니다.

---

## 2. Transport

### 📘 Official Definition
> "A transport connects an endpoint with a mediasoup router and enables transmission of media in both directions by means of Producer, Consumer, DataProducer and DataConsumer instances created on it."

### 🧠 Mental Model (OSI Layer 4/5 - Transport/Session)
*   **비유:** **고속도로 / 터널 (Connection Tunnel)**
*   **해석:**
    *   **L4 (Transport):** UDP/TCP 위에서 **ICE**를 통해 P2P 연결을 수립합니다.
    *   **L5 (Session):** **DTLS**를 통해 암호화된 보안 세션을 맺고 유지합니다.
    *   데이터가 지나가는 **물리적/논리적 통로**입니다.
    *   **상행선 (`SendTransport`)**: 내 데이터를 서버로 보내는 도로.
    *   **하행선 (`RecvTransport`)**: 서버의 데이터를 받아오는 도로.
    *   **핵심:** 도로(Transport)가 먼저 뚫려야(Connect) 물류(Media)가 이동할 수 있습니다.

---

## 3. Producer

### 📘 Official Definition
> "A producer represents an audio or video source being injected into a mediasoup router. It's created on top of a transport that defines how the media packets are carried."

### 🧠 Mental Model (OSI Layer 6/7 - Presentation/App)
*   **비유:** **상행선 트럭의 화물 (Source Media)**
*   **해석:**
    *   **L6 (Presentation):** 코덱(VP8, H.264 등)을 통해 데이터의 표현 방식을 정의합니다.
    *   **L7 (Application):** 실제 애플리케이션이 생성한 미디어 소스(카메라, 마이크)입니다.
    *   `SendTransport`(상행선)를 타고 Router(교차로)로 진입하는 **택배 물건**입니다.

---

## 4. Consumer

### 📘 Official Definition
> "A consumer represents an audio or video source being forwarded from a mediasoup router to an endpoint. It's created on top of a transport that defines how the media packets are carried."

### 🧠 Mental Model (OSI Layer 6/7 - Presentation/App)
*   **비유:** **하행선 트럭의 화물 (Received Media)**
*   **해석:**
    *   Router(교차로)에서 분류되어 `RecvTransport`(하행선)를 타고 내 단말기로 배달되는 **택배 물건**입니다.
    *   Producer와 마찬가지로 코덱과 미디어 속성을 가집니다.

---

## 5. Summary: The Big Picture

| Component | Official Role | Mental Model (Analogy) |
| :--- | :--- | :--- |
| **Router** | Media Stream Forwarder | **교차로** (패킷의 경로 결정) |
| **Transport** | Endpoint Connector | **고속도로** (데이터 이동 통로, ICE/DTLS) |
| **Producer** | Injected Source | **보내는 택배** (내 카메라/마이크) |
| **Consumer** | Forwarded Source | **받는 택배** (상대방의 영상/음성) |

### 🚀 Flow
1.  **Transport(도로) 개통**: 상행선(`SendTransport`)과 하행선(`RecvTransport`)을 뚫는다.
2.  **Produce(출발)**: 내 카메라 영상(`Producer`)을 상행선에 태워 보낸다.
3.  **Route(중계)**: `Router`가 영상을 받아 적절한 하행선으로 안내한다.
4.  **Consume(도착)**: 상대방의 영상(`Consumer`)이 하행선을 타고 나에게 도착한다.
