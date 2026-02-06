# Clean Architecture: Entity, Service, and Gateway

> **작성일**: 2026-01-23
> **주제**: NestJS에서 Entity의 순수성 유지와 Service 계층의 역할, 그리고 "총량의 법칙"에 대한 고찰.

---

## 1. 배경 (Context)

Signaling Server를 리팩토링하는 과정에서 `Peer` Entity 내부에 `MediasoupService`를 주입하여 `transport` 생성 로직을 캡슐화하려는 시도가 있었다. 하지만 이는 NestJS의 의존성 주입(DI) 메커니즘과 Clean Architecture 관점에서 권장되지 않는 방식이었다.

## 2. 핵심 원칙 (Key Principles)

### 2.1 Entity의 순수성 (Purity of Entity)
*   **문제점**: `Peer`와 같은 Entity는 `new Peer()`와 같이 개발자가 직접 인스턴스화하는 경우가 많다. 이 경우 NestJS의 IoC Container가 관여하지 않으므로 `@Inject()`를 통한 의존성 주입이 불가능하다.
*   **해결책**:
    *   Entity는 **데이터(State)와 그 데이터를 다루는 간단한 메서드**만 가진다.
    *   외부 의존성이 필요한 무거운 로직(DB 접근, 외부 API 호출, Mediasoup Transport 생성 등)은 **Service** 계층에서 처리하고, 그 **결과값만 Entity에 주입**한다.
    *   **Bad**: `peer.createTransport()` (내부에서 Service 호출)
    *   **Good**: `service.createTransportFor(peer)`

### 2.2 계층별 역할 비유 (Kitchen Analogy)
시스템을 레스토랑에 비유했을 때 각 계층의 역할은 다음과 같다.

| 계층 (Layer) | 비유 (Analogy) | 역할 | 특징 |
| :--- | :--- | :--- | :--- |
| **Gateway / Controller** | **웨이터 (Waiter)** | 주문 접수 & 서빙 | 손님에게 친절해야 하며(Interface), 복잡한 조리 과정을 몰라야 한다. |
| **Service** | **주방 (Kitchen)** | 요리 (Business Logic) | 재료를 다듬고 불을 쓰는 곳. **복잡하고 코드가 많아지는 것이 당연한 곳.** |
| **Entity** | **재료 (Ingredients)** | 요리의 대상 | 스스로 요리되지 않는다. 요리사(Service)에 의해 가공된다. |

## 3. "총량의 법칙"과 대처법 (Handling Complexity)

Gateway와 Entity를 깔끔하게 유지하면, 필연적으로 **Service 계층의 코드가 늘어나고 복잡해진다.** 이를 "코드가 더러워졌다"고 느끼기 쉽지만, 이는 **책임이 올바른 위치(Service)로 이동한 건강한 신호**이다.

만약 `GroupStudyManagementService`가 너무 비대해진다면(God Class), 다음과 같은 단계로 리팩토링한다.

### 단계 1: Private Method 활용
하나의 거대한 메서드를 의미 있는 단위의 `private` 메서드들로 쪼갠다.

```typescript
// Before
async joinRoom() { ... 50줄 ... }

// After
async joinRoom() {
  this.validateUser();
  this.processJoin();
  this.notifyOthers();
}
```

### 단계 2: 하위 서비스(Sub-Service)로 분리
코드 양이 감당할 수 없을 정도로 많아지면, 도메인별로 서비스를 분리하여 주입받아 사용한다. (Orchestration Pattern)

*   `PeerRegistryService`: Peer 목록 관리 전담
*   `RoomRegistryService`: Room 목록 관리 전담
*   `MediasoupService`: 미디어 서버 통신 전담
*   **`GroupStudyManagementService`**: 위 서비스들을 조율(Orchestrate)하여 비즈니스 로직 완성

## 4. 결론 (Takeaway)

1.  **Entity는 가볍게**: 데이터와 상태만 관리하라. 로직 욕심을 버려라.
2.  **Service는 무겁게**: 비즈니스 로직이 모이는 것은 자연스러운 현상이다. 두려워하지 마라.
3.  **Gateway는 얇게**: 요청을 토스하고 응답을 반환하는 역할에만 집중하라.

> **"주방(Service)이 깨끗하려면 웨이터(Gateway)가 파를 썰어야 한다. 그게 더 이상하다."**
