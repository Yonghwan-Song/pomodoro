# WebRTC → Pomodoro 통합 전략

> 작성일: 2026-02-05
> 목표: `web-rtc-new/`에서 구현한 WebRTC 그룹 스터디 화상회의 기능을 `pomodoro/`에 적용

---

## 1. 두 프로젝트 현재 상태

### 1-1. web-rtc-new (WebRTC 그룹 스터디)

Mediasoup 기반 SFU(Selective Forwarding Unit) 구조의 화상회의 애플리케이션.

| 구성 요소           | 기술 스택                                            | 역할                       |
| ------------------- | ---------------------------------------------------- | -------------------------- |
| `signaling-server/` | NestJS 11 + Socket.IO 4.8 + Mediasoup 3.19           | 시그널링 및 미디어 라우팅  |
| `webrtc-client/`    | React 19 + Vite 7 + mediasoup-client 3.15 + PandaCSS | UI 및 WebRTC 클라이언트    |
| `common/`           | TypeScript                                           | 공유 이벤트명 및 타입 정의 |

**구현된 기능:**

- 방 생성/참여/퇴장 및 실시간 방 목록 브로드캐스트
- VP8 영상 + Opus 오디오 스트리밍 (Producer/Consumer 모델)
- WebRTC Transport 생성 (Send/Recv 분리) 및 DTLS 연결
- 실시간 채팅 (방 단위 메시지 브로드캐스트)
- 참가자 입장/퇴장 알림
- Producer 종료 시 Consumer 정리
- Firefox ICE Candidate 워크어라운드

**핵심 파일:**

| 파일                                                                            | 줄 수 | 역할                                                         |
| ------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------ |
| `signaling-server/src/signaling/signaling.gateway.ts`                           | 312   | Socket.IO 이벤트 핸들러 (20+ 이벤트)                         |
| `signaling-server/src/group-study-management/group-study-management.service.ts` | 673   | 핵심 비즈니스 로직 (Peer/Room/Transport 관리)                |
| `signaling-server/src/mediasoup/mediasoup.service.ts`                           | -     | Mediasoup Worker/Router/Transport 생성                       |
| `webrtc-client/src/components/Room.tsx`                                         | 675   | 방 UI + Transport/Producer/Consumer 로직                     |
| `webrtc-client/src/pages/GroupStudy.tsx`                                        | 200   | Device 초기화 + Context 제공                                 |
| `webrtc-client/src/hooks/useSocket.ts`                                          | 58    | Socket.IO 연결 관리 훅                                       |
| `webrtc-client/src/hooks/useUserMedia.ts`                                       | 120   | 카메라/마이크 스트림 획득 훅                                 |
| `common/src/eventNames.ts`                                                      | 86    | 공유 이벤트 상수 정의                                        |
| `common/src/payloadRelated.ts`                                                  | -     | 공유 타입 정의 (ProducerPayload, ConsumerOptionsExtended 등) |

### 1-2. pomodoro (뽀모도로 타이머)

Firebase 인증 기반의 뽀모도로 타이머 + 통계 애플리케이션. **실시간 통신 기능 없음.**

| 구성 요소      | 기술 스택                                     | 역할                           |
| -------------- | --------------------------------------------- | ------------------------------ |
| `client/`      | React 18 + Vite + Zustand + Styled Components | 타이머 UI, 통계, 설정          |
| `nest-server/` | NestJS 10 + Mongoose + Firebase Admin         | REST API 백엔드 (포트 3000)    |
| `server/`      | Express.js (레거시, 미사용)                   | 이전 버전 백엔드 — 무시해도 됨 |

**현재 통신 방식:**

- 모든 API 통신은 **Axios를 통한 HTTP REST** 호출
- 탭 간 통신: `BroadcastChannel API`
- 타이머 백그라운드 동작: `Service Worker` + `IndexedDB`
- 컴포넌트 간 이벤트: 자체 `pubsub.ts` (네트워크 통신 아님)

**상태 관리 구조:**

- **Zustand** (pomoInfoStoreUsingSlice): 타이머, 설정, 카테고리, 목표, Todoist 연동 등 글로벌 상태
- **React Context**: AuthContext (Firebase 사용자), RecordsOfTodayContext (오늘 기록)
- **IndexedDB**: 오프라인 지속성 (타이머 상태, 실패한 요청 저장)
- **Service Worker**: 페이지 닫혀도 타이머 계속 동작

**인증 방식:**

- 프론트: Firebase Authentication (클라이언트 SDK)
- 백엔드: Firebase Admin SDK로 토큰 검증 (NestJS 미들웨어)

**배포 환경:**

- 프론트: Vercel (`pomodoro-yhs.vercel.app`)
- 백엔드: Render.com (`pomodoro-nest-apis.onrender.com`)
- DB: MongoDB Atlas

---

## 2. 두 프로젝트의 주요 차이점

| 항목        | web-rtc-new                    | pomodoro                            |
| ----------- | ------------------------------ | ----------------------------------- |
| 실시간 통신 | Socket.IO + WebRTC (Mediasoup) | 없음 (HTTP only)                    |
| 인증        | 없음                           | Firebase Auth                       |
| React 버전  | 19                             | 18                                  |
| 스타일링    | PandaCSS                       | Styled Components + PandaCSS (공존) |
| 상태 관리   | React Context (outlet)         | Zustand + Context                   |
| NestJS 버전 | 11                             | 10                                  |
| 라우팅      | React Router 7                 | React Router DOM (v6 계열)          |

---

## 3. 통합 전략: 3 Phase

### Phase 1: 백엔드 — nest-server에 Signaling 인프라 추가

pomodoro의 `nest-server/`에 WebRTC 시그널링 기능을 추가한다.
기존 REST API는 그대로 유지하면서, Socket.IO 게이트웨이를 병행 운영.

#### 1-1. 패키지 설치

```bash
cd pomodoro/nest-server
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io mediasoup
```

> **주의**: mediasoup은 C++ 네이티브 모듈이므로 `node-gyp`, `python3`, `make`, `g++`가 빌드 환경에 필요.
> Render.com 배포 시 빌드 환경 확인 필수.

#### 1-2. common 이벤트 정의 복사

`web-rtc-new/common/src/` 내용을 `pomodoro/nest-server/src/common/webrtc/`로 복사:

```
pomodoro/nest-server/src/common/webrtc/
├── eventNames.ts          ← web-rtc-new/common/src/eventNames.ts
└── payloadRelated.ts      ← web-rtc-new/common/src/payloadRelated.ts
```

> 나중에 클라이언트에서도 동일한 이벤트 정의를 사용해야 하므로,
> 별도의 공유 패키지로 분리하거나 클라이언트에도 동일 파일을 복사.

#### 1-3. 모듈 이식 (3개)

**a) MediasoupModule**

`web-rtc-new/signaling-server/src/mediasoup/` → `pomodoro/nest-server/src/mediasoup/`

- `mediasoup.module.ts`: LOCAL_IP Provider 포함
- `mediasoup.service.ts`: Worker 생성, Router 생성, Transport 생성 로직
- `constants.ts`의 LOCAL_IP도 함께 이식

```
pomodoro/nest-server/src/mediasoup/
├── mediasoup.module.ts
└── mediasoup.service.ts
```

**b) GroupStudyManagementModule**

`web-rtc-new/signaling-server/src/group-study-management/` → `pomodoro/nest-server/src/group-study-management/`

- `group-study-management.service.ts` (673줄): 핵심 비즈니스 로직
- `group-study-management.module.ts`
- `entities/peer.entity.ts`: Peer 클래스 (socketId, room, transports, producers, consumers)
- `entities/room.entity.ts`: Room 클래스 (peers Map, metadata)

```
pomodoro/nest-server/src/group-study-management/
├── group-study-management.module.ts
├── group-study-management.service.ts
└── entities/
    ├── peer.entity.ts
    └── room.entity.ts
```

**c) SignalingModule**

`web-rtc-new/signaling-server/src/signaling/` → `pomodoro/nest-server/src/signaling/`

- `signaling.gateway.ts` (312줄): Socket.IO 이벤트 핸들러
- `signaling.module.ts`

```
pomodoro/nest-server/src/signaling/
├── signaling.gateway.ts
└── signaling.module.ts
```

#### 1-4. _Firebase 인증을 Socket.IO에 적용_

**현재 상태**: web-rtc-new에는 인증이 없고, pomodoro는 HTTP 미들웨어로만 인증.

**해야 할 일**: Socket.IO handshake 단계에서 Firebase 토큰 검증 추가.

```typescript
// signaling.gateway.ts 수정 예시
@WebSocketGateway({
  cors: { origin: [...] },
})
export class SignalingGateway implements OnGatewayConnection {
  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token;
    try {
      const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
      // 인증 성공 → Peer 생성 시 userId 연결
    } catch (error) {
      client.disconnect(); // 인증 실패 → 연결 거부
    }
  }
}
```

#### 1-5. AppModule에 새 모듈 등록

`pomodoro/nest-server/src/app.module.ts`에 새 모듈들을 imports에 추가:

```typescript
@Module({
  imports: [
    // 기존 모듈들 유지
    UsersModule,
    PomodorosModule,
    TodayRecordsModule,
    CategoriesModule,
    CycleSettingModule,
    TodoistModule,
    // 새로 추가
    MediasoupModule,
    GroupStudyManagementModule,
    SignalingModule,
  ],
})
export class AppModule { ... }
```

#### 1-6. CORS 및 포트 설정

`main.ts`에서 기존 REST API와 Socket.IO가 같은 포트(3000)에서 공존하도록 설정.
CORS origin에 pomodoro 클라이언트 주소 추가.

#### Phase 1 완료 기준

- nest-server가 정상 빌드/실행됨
- 기존 REST API가 깨지지 않음
- Socket.IO 연결이 가능하고 인증이 동작함
- Mediasoup Worker/Router가 초기화됨

---

### Phase 2: 프론트엔드 — WebRTC 클라이언트 통합

pomodoro의 `client/`에 WebRTC 관련 코드를 추가한다.

#### 2-1. 패키지 설치

```bash
cd pomodoro/client
npm install socket.io-client mediasoup-client
npm install -D @pandacss/dev
npx panda init   # panda.config.ts + postcss.config.cjs 생성
npx panda codegen # styled-system/ 디렉토리 생성
```

#### 2-2. 공유 이벤트 정의 복사

클라이언트에서도 같은 이벤트명과 타입을 사용해야 하므로:

```
pomodoro/client/src/common/webrtc/
├── eventNames.ts
└── payloadRelated.ts
```

> Phase 1에서 서버에 복사한 것과 동일한 파일.

#### 2-3. 훅(Hooks) 이식

**a) useSocket 훅**

`web-rtc-new/webrtc-client/src/hooks/useSocket.ts` → `pomodoro/client/src/Custom-Hooks/useSocket.ts`

수정 필요 사항:

- 서버 URL을 pomodoro의 nest-server 주소로 변경
- **Firebase Auth 토큰을 handshake에 포함**:

```typescript
const socket = io(SERVER_URL, {
  auth: {
    token: await firebaseUser.getIdToken(),
  },
});
```

**b) useUserMedia 훅**

`web-rtc-new/webrtc-client/src/hooks/useUserMedia.ts` → `pomodoro/client/src/Custom-Hooks/useUserMedia.ts`

이 훅은 거의 그대로 사용 가능 (카메라/마이크 접근 로직).

#### 2-4. 컴포넌트 이식

**필수 컴포넌트:**

```
pomodoro/client/src/Pages/GroupStudy/
├── GroupStudy.tsx          ← web-rtc-new의 pages/GroupStudy.tsx (Device 초기화)
├── RoomList.tsx            ← web-rtc-new의 components/RoomList.tsx (방 목록)
├── Room.tsx                ← web-rtc-new의 components/Room.tsx (핵심: 675줄)
├── components/
│   ├── VideoGrid.tsx       ← web-rtc-new의 components/room/VideoGrid.tsx
│   ├── VideoPlayer.tsx     ← web-rtc-new의 components/media/VideoPlayer.tsx
│   ├── RoomControls.tsx    ← web-rtc-new의 components/room/RoomControls.tsx
│   ├── MediaControl.tsx    ← web-rtc-new의 components/media/MediaControl.tsx
│   └── chat/               (선택사항)
│       ├── ChatBox.tsx
│       └── ChatMessage.tsx
```

**스타일링: PandaCSS 그대로 사용**

PandaCSS(빌드타임 CSS 생성)와 Styled Components(런타임 CSS-in-JS)는
동작 레이어가 다르므로 충돌 없이 공존 가능.
이식 시 스타일 변환 작업 불필요 — web-rtc-new의 PandaCSS 코드를 그대로 사용.

> **주의**: PandaCSS의 `preflight`(CSS 리셋)와 기존 `index.css`의 커스텀 리셋이
> 중복될 수 있으므로, `panda.config.ts`에서 `preflight: false`로 설정.

```typescript
// panda.config.ts
import { defineConfig } from "@pandacss/dev";

export default defineConfig({
  preflight: false, // 기존 index.css 리셋과 중복 방지
  include: ["./src/**/*.{js,jsx,ts,tsx}"],
  outdir: "styled-system",
});
```

```javascript
// postcss.config.cjs
module.exports = {
  plugins: {
    "@pandacss/dev/postcss": {},
  },
};
```

#### 2-5. 상태 관리 통합

web-rtc-new는 React Context(outlet)으로 socket/device/stream을 전달하지만,
pomodoro는 Zustand + Context 구조를 사용.

**선택지:**

- **A. Zustand에 WebRTC 슬라이스 추가** (권장): 기존 패턴과 일관성 유지
- **B. 별도 Context 유지**: GroupStudy 하위에서만 사용하므로 격리 가능

권장: GroupStudy 페이지 범위 내에서는 web-rtc-new의 Context 패턴을 그대로 사용하고,
전역 상태(예: 현재 참여 중인 방 정보)만 Zustand에 추가.

#### 2-6. 라우팅 추가

pomodoro 클라이언트의 라우터에 그룹 스터디 경로 추가:

```
/timer          → 기존 타이머 페이지
/statistics     → 기존 통계 페이지
/settings       → 기존 설정 페이지
/group-study    → 새로 추가: GroupStudy (Device 초기화)
  /group-study/         → RoomList (방 목록)
  /group-study/room/:id → Room (화상 회의)
```

네비게이션 바에 "그룹 스터디" 메뉴 항목 추가.

#### Phase 2 완료 기준

- 클라이언트가 정상 빌드됨
- `/group-study` 경로로 이동 시 방 목록이 표시됨
- 방 생성/참여가 가능하고 비디오 스트리밍이 동작함
- Firebase 인증된 사용자만 접근 가능함

---

### Phase 3: 기능 연결 — 뽀모도로 × 화상 스터디

두 기능을 단순 병렬이 아닌 유기적으로 연결.

#### 3-1. 방 내 타이머 공유

- 방에서 뽀모도로 타이머를 시작하면 전체 참가자에게 브로드캐스트
- 새로운 Socket.IO 이벤트 추가:
  - `TIMER_START` / `TIMER_PAUSE` / `TIMER_END`
  - `TIMER_SYNC` (새 참가자가 현재 타이머 상태를 받을 때)

#### 3-2. 참가자별 상태 표시

- 각 참가자의 비디오 위에 현재 뽀모도로 상태 오버레이:
  - "집중 중 (15:32 남음)" / "휴식 중" / "대기 중"
- Producer metadata에 타이머 상태 포함

#### 3-3. 공동 통계

- 그룹 스터디 세션 기록을 별도 DB 컬렉션에 저장
- 세션 내 참가자별 집중 시간 통계

---

## 4. 상세 작업 순서 (체크리스트)

### Phase 1: 백엔드

- [ ] nest-server에 `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`, `mediasoup` 설치
- [ ] `common/webrtc/` 디렉토리 생성 및 이벤트명/타입 파일 복사
- [ ] `mediasoup/` 모듈 이식 (mediasoup.module.ts, mediasoup.service.ts)
- [ ] `group-study-management/` 모듈 이식 (service + entities)
- [ ] `signaling/` 모듈 이식 (gateway + module)
- [ ] tsconfig.json에 `@common/*` path alias 추가 (필요 시)
- [ ] Firebase 인증을 Socket.IO handshake에 적용
- [ ] AppModule에 새 모듈 등록
- [ ] CORS 설정 업데이트
- [ ] 서버 빌드 및 실행 테스트
- [ ] 기존 REST API 정상 동작 확인
- [ ] Socket.IO 연결 + 인증 테스트

### Phase 2: 프론트엔드

- [ ] client에 `socket.io-client`, `mediasoup-client` 설치
- [ ] `common/webrtc/` 이벤트명/타입 파일 복사
- [ ] `useSocket` 훅 이식 + Firebase 토큰 연동
- [ ] `useUserMedia` 훅 이식
- [ ] `GroupStudy` 페이지 이식 (Device 초기화)
- [ ] `RoomList` 컴포넌트 이식
- [ ] `Room` 컴포넌트 이식 (핵심 675줄)
- [ ] `VideoGrid`, `VideoPlayer` 컴포넌트 이식
- [ ] `RoomControls`, `MediaControl` 컴포넌트 이식
- [ ] PandaCSS 설정 추가 (`@pandacss/dev` 설치, `panda.config.ts`, `postcss.config.cjs`, `preflight: false`)
- [ ] `styled-system/` 디렉토리 생성 (`npx panda codegen`)
- [ ] 라우팅 추가 (`/group-study` 경로)
- [ ] 네비게이션 바에 메뉴 추가
- [ ] 빌드 및 E2E 테스트

### Phase 3: 기능 연결

- [ ] 타이머 브로드캐스트 이벤트 설계 및 구현
- [ ] 참가자별 타이머 상태 오버레이 UI
- [ ] 그룹 세션 기록 DB 스키마 설계
- [ ] 공동 통계 페이지

---

## 5. 리스크 및 고려사항

### 빌드 & 배포

| 리스크                  | 설명                                              | 대응                                            |
| ----------------------- | ------------------------------------------------- | ----------------------------------------------- |
| Mediasoup 네이티브 빌드 | C++ 빌드 도구 필요 (node-gyp, python3, make, g++) | Render.com 빌드팩 확인, Docker 사용 고려        |
| 번들 사이즈 증가        | mediasoup-client 추가로 클라이언트 번들 커짐      | 코드 스플리팅으로 `/group-study` 경로 lazy load |

### 네트워크 & 인프라

| 리스크              | 설명                                                     | 대응                                                         |
| ------------------- | -------------------------------------------------------- | ------------------------------------------------------------ |
| TURN 서버 필요      | 현재 web-rtc-new는 로컬 IP만 사용. NAT 환경에서 P2P 불가 | Coturn 등 TURN 서버 구축 또는 Twilio/Xirsys 같은 서비스 사용 |
| 방화벽              | UDP 포트 차단 환경에서 미디어 전송 불가                  | TCP fallback 설정 (이미 web-rtc-new에 구현됨)                |
| Render.com UDP 지원 | Render가 UDP 포트를 열어줄 수 있는지 확인 필요           | 안 되면 VPS(AWS EC2 등)로 마이그레이션                       |

### 호환성

| 리스크          | 설명                           | 대응                                     |
| --------------- | ------------------------------ | ---------------------------------------- |
| React 18 vs 19  | web-rtc-new는 React 19 사용    | 대부분 하위 호환. 이슈 발생 시 코드 조정 |
| NestJS 10 vs 11 | 버전 차이로 API 변경 가능      | 이식 시 NestJS 10 문법에 맞게 조정       |
| Socket.IO 버전  | 서버/클라이언트 버전 일치 확인 | 같은 메이저 버전(v4) 사용                |

### 기능

| 리스크              | 설명                                   | 대응                                    |
| ------------------- | -------------------------------------- | --------------------------------------- |
| Service Worker 충돌 | 기존 SW(타이머)와 새 기능 간 간섭 가능 | SW 범위를 분리하거나 하나의 SW에서 관리 |
| 오프라인 시나리오   | WebRTC는 온라인에서만 동작             | 그룹 스터디 기능은 온라인 전용으로 명시 |

---

## 6. 참고: web-rtc-new의 시그널링 프로토콜 흐름

통합 시 이 흐름을 이해하고 있어야 디버깅이 가능하다.

### 연결 초기화

```
Client → Server: Socket.IO 연결
Server → Client: handleConnection() → peersMap에 Peer 추가
Client → Server: GET_ROUTER_RTP_CAPABILITIES
Server → Client: SEND_ROUTER_RTP_CAPABILITIES (Router의 RTP 능력)
Client: Device.load({ routerRtpCapabilities })
Client → Server: SET_DEVICE_RTP_CAPABILITIES (Device RTP 능력)
```

### 방 참여

```
Client → Server: JOIN_ROOM { roomId }
Server: Peer를 Room에 추가
Server → Client: 기존 producers 목록 + peers 목록 반환
Server → 방 내 다른 Client: ROOM_PEER_JOINED 브로드캐스트
```

### 미디어 송출 (Produce)

```
Client → Server: CREATE_SEND_TRANSPORT
Server: WebRtcTransport 생성
Server → Client: SEND_TRANSPORT_CREATED (transport 옵션)
Client: device.createSendTransport(options)

Transport "connect" 이벤트 발생:
  Client → Server: CONNECT_SEND_TRANSPORT { dtlsParameters }
  Server → Client: SEND_TRANSPORT_CONNECTED

Transport "produce" 이벤트 발생:
  Client → Server: PRODUCE { kind, rtpParameters }
  Server: transport.produce() → Producer 생성
  Server → Client: PRODUCED { producerId }
  Server → 방 내 다른 Client: ROOM_GET_PRODUCER 브로드캐스트
```

### 미디어 수신 (Consume)

```
Client: ROOM_GET_PRODUCER 수신 → 새 Producer 감지
Client → Server: CREATE_RECV_TRANSPORT (아직 없으면)
Server → Client: RECV_TRANSPORT_CREATED

Client → Server: INTENT_TO_CONSUME { producerId }
Server: transport.consume() → Consumer 생성
Server → Client: Consumer 옵션 + peerId 반환

Client: transport.consume(options) → consumer.track 획득
Client → Server: RESUME_CONSUMER { consumerId }
Client: MediaStream에 track 추가 → 비디오 렌더링
```

### 정리 (Cleanup)

```
Client 퇴장/연결 끊김:
  Server: Peer의 transports/producers/consumers 정리
  Server: Room에서 Peer 제거
  Server → 방 내 다른 Client: ROOM_PEER_LEFT + PRODUCER_CLOSED 브로드캐스트
  다른 Client: 해당 Consumer 정리 + UI 업데이트
```

---

## 7. 디렉토리 구조 예상 (통합 후)

```
pomodoro/
├── client/
│   └── src/
│       ├── Pages/
│       │   ├── Main/               # 기존 타이머
│       │   ├── Statistics/         # 기존 통계
│       │   ├── Settings/           # 기존 설정
│       │   ├── Signin/             # 기존 로그인
│       │   └── GroupStudy/         # ★ 새로 추가
│       │       ├── GroupStudy.tsx       # Device 초기화 + Context
│       │       ├── RoomList.tsx         # 방 목록
│       │       ├── Room.tsx             # 화상 회의 (핵심)
│       │       └── components/
│       │           ├── VideoGrid.tsx
│       │           ├── VideoPlayer.tsx
│       │           ├── RoomControls.tsx
│       │           ├── MediaControl.tsx
│       │           └── chat/
│       │               ├── ChatBox.tsx
│       │               └── ChatMessage.tsx
│       ├── Custom-Hooks/
│       │   ├── useFetch.tsx        # 기존
│       │   ├── useSocket.ts        # ★ 새로 추가
│       │   └── useUserMedia.ts     # ★ 새로 추가
│       ├── common/
│       │   └── webrtc/
│       │       ├── eventNames.ts   # ★ 새로 추가
│       │       └── payloadRelated.ts
│       └── ... (기존 파일들 유지)
│
├── nest-server/
│   └── src/
│       ├── users/                  # 기존
│       ├── pomodoros/              # 기존
│       ├── today-records/         # 기존
│       ├── categories/            # 기존
│       ├── cycle-setting/         # 기존
│       ├── todoist/               # 기존
│       ├── mediasoup/             # ★ 새로 추가
│       │   ├── mediasoup.module.ts
│       │   └── mediasoup.service.ts
│       ├── signaling/             # ★ 새로 추가
│       │   ├── signaling.gateway.ts
│       │   └── signaling.module.ts
│       ├── group-study-management/ # ★ 새로 추가
│       │   ├── group-study-management.module.ts
│       │   ├── group-study-management.service.ts
│       │   └── entities/
│       │       ├── peer.entity.ts
│       │       └── room.entity.ts
│       ├── common/
│       │   ├── middlewares/
│       │   │   └── firebase.middleware.ts  # 기존
│       │   └── webrtc/            # ★ 새로 추가
│       │       ├── eventNames.ts
│       │       └── payloadRelated.ts
│       └── ... (기존 파일들 유지)
│
└── server/                        # 레거시, 건드리지 않음
```
