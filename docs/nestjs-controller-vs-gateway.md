# NestJS: `@Controller` vs `@WebSocketGateway`

## `@Controller` vs `@WebSocketGateway`

**`@Controller`** 는 HTTP ==요청-응답 패턴==을 처리한다. 클라이언트가 요청을 보내면 응답을 돌려주는, stateless한 단방향 흐름이다.

```
Client --HTTP Request--> @Controller --HTTP Response--> Client
```

**`@WebSocketGateway`** 는 ==양방향 **지속** 연결==을 처리한다. 연결이 유지되면서 서버와 클라이언트 양쪽에서 언제든 메시지를 보낼 수 있다.

```
Client <--WebSocket--> @WebSocketGateway (persistent, bidirectional)
```

## 왜 Gateway는 Provider인가? -> ==다른 lifecycle==

NestJS에서 `controllers`와 `providers`는 다른 lifecycle을 가진다:

- **Controller**: ==NestJS HTTP 라우팅 파이프라인(미들웨어, 가드, 인터셉터, 파이프, 필터)에 바인딩==된다. 라우팅 테이블에 등록되고, `MiddlewareConsumer`의 `.forRoutes()` 대상이 된다. `app.module.ts`에서 보듯이 미들웨어가 HTTP 경로에 적용되는 구조이다.

- **Provider (Gateway)**: ==DI 컨테이너에 등록되지만 HTTP 라우팅 파이프라인과는 무관==하다. `@WebSocketGateway` 데코레이터가 붙으면 NestJS가 내부적으로 이 클래스를 WebSocket 서버에 바인딩한다.

==Gateway를 Controller로 만들지 않은 이유는 근본적으로 **HTTP 파이프라인이 WebSocket에 맞지 않기 때문**==이다:

1. HTTP 미들웨어(`FireBase_Admin_Middleware` 같은)는 `req/res` 객체를 기대하는데, WebSocket에는 없다. 그래서 `signaling.gateway.ts`에서 `server.use()`로 별도의 인증 미들웨어를 직접 구현하고 있다. [[POINT]]

2. HTTP 라우팅(`GET /users`, `POST /pomodoros`)과 이벤트 기반 메시지(`@SubscribeMessage('joinRoom')`)는 디스패칭 방식 자체가 다르다.

3. WebSocket은 연결 상태를 관리해야 한다 (`OnGatewayConnection`, `OnGatewayDisconnect`). HTTP Controller에는 이런 개념이 없다.

## 요약

Gateway도 "소켓 이벤트를 컨트롤"하는 역할이다. 하지만 NestJS는 transport layer에 따라 추상화를 분리한 것이다:

|            | HTTP                       | WebSocket                      |
| ---------- | -------------------------- | ------------------------------ |
| 데코레이터 | `@Controller`              | `@WebSocketGateway`            |
| 등록 위치  | `controllers: []`          | `providers: []`                |
| 디스패칭   | URL path + HTTP method     | event name                     |
| 미들웨어   | NestJS 미들웨어 파이프라인 | `server.use()` 직접 등록       |
| 연결 모델  | stateless request-response | stateful persistent connection |

이름이 "Controller"가 아니라 "Gateway"인 것도 이 차이를 반영한다. Gateway는 두 네트워크 사이의 관문 역할을 하는 개념으로, 지속적 양방향 연결의 진입점이라는 의미이다.

---

## 보충: 파이프라인이 다르면 분기 지점에서 한번에 인증하면 안 되나?

합리적인 질문이다. 실제로 WebSocket 연결은 HTTP upgrade 요청으로 시작하기 때문이다.

### HTTP Upgrade란?

WebSocket은 자체 프로토콜(`ws://`)이지만, 연결을 처음 맺을 때는 **일반 HTTP 요청으로 시작**한다. 클라이언트가 서버에 "나 이제부터 WebSocket으로 통신하고 싶어"라고 HTTP 요청을 보내는 것이다:

```
GET /socket.io/?EIO=4&transport=websocket HTTP/1.1
Host: localhost:3000
Upgrade: websocket          ← "프로토콜 바꿔주세요"
Connection: Upgrade
```

서버가 수락하면 `101 Switching Protocols`로 응답하고, 그 이후부터는 같은 TCP 연결 위에서 HTTP가 아닌 WebSocket 프레임으로 통신한다.

==즉, **모든 WebSocket 연결의 첫 순간은 HTTP 요청**이다.== 그래서 "분기 지점에서 한번에 인증하면 되지 않나?"라는 질문이 합리적이다.

### 그런데 왜 안 되는가?

```
Client HTTP Request
       │
       ├─ 일반 요청 (GET /users) ──→ NestJS HTTP Pipeline ──→ @Controller
       │                              (미들웨어 적용됨)
       │
       └─ Upgrade: websocket ──→ Socket.io가 가로챔 ──→ @WebSocketGateway
                                  (NestJS 미들웨어 파이프라인을 거치지 않음)
```

**Socket.io가 이 upgrade 요청을 NestJS HTTP 파이프라인보다 먼저 가로채기 때문**이다. NestJS의 `MiddlewareConsumer.forRoutes()`는 Express/Fastify 라우터에 등록된 경로에만 적용되는데, Socket.io의 엔드포인트(`/socket.io/`)는 이 라우터를 통하지 않고 직접 HTTP 서버에 붙는다.

==NestJS가 제공하는 미들웨어 추상화가 분기 지점보다 **아래(downstream)**에 있기 때문에, 분기는 NestJS 레벨이 아니라 그 아래 HTTP 서버 레벨에서 일어난다.==

### 이론적으로는 가능하다

NestJS 아래의 raw Express 서버에 미들웨어를 걸면 된다:

```typescript
// main.ts
const app = await NestFactory.create(AppModule);
const expressApp = app.getHttpAdapter().getInstance();

// 이 레벨은 Socket.io upgrade 요청도, 일반 HTTP 요청도 모두 거침
expressApp.use((req, res, next) => {
  // 여기서 인증 처리
});
```

하지만 실제로 이렇게 하지 않는 이유는, HTTP 인증과 WebSocket 인증이 **다른 정보를 다른 방식으로** 주고받기 때문이다:

- HTTP: `Authorization` 헤더 → `req` 객체에서 추출
- Socket.io: `socket.handshake.auth.token` → `socket` 객체에서 추출, 인증 결과를 `socket.data`에 저장해서 연결 내내 유지

인증 "로직"(Firebase token 검증)은 같지만, 입출력 인터페이스가 다르기 때문에 각 파이프라인에서 따로 처리하는 게 자연스럽다.

---

## 보충: NestJS Guards는 WebSocket에서도 쓸 수 있다

### Guard란 무엇인가? (Middleware와의 결정적 차이)

**Guard(가드)**는 이름 그대로 앱의 **"문지기(Bouncer)"**이다. 가장 쉽게 설명하면 **"이 요청을 처리할지 말지 결정하는 `boolean` (True/False) 판별기"**이다.

미들웨어와 가장 큰 차이점은 **"목적지를 아느냐 모르느냐"**이다:

- **미들웨어 (Middleware)**: "나는 그냥 지나가는 요청을 닦아줄 뿐." 요청이 **어떤 핸들러(함수)에서 처리될지 전혀 모른다.**
- **가드 (Guard)**: **실행 컨텍스트(Execution Context)**에 접근할 수 있다. 즉, **"지금 실행되려는 함수가 무엇이고, 어떤 데코레이터(`@Roles('admin')` 등)가 붙어있는지"** 알고 똑똑하게 판단한다.

### WebSocket에서의 동작

NestJS 파이프라인 구성요소 중 **미들웨어만 HTTP 전용**이고, 나머지는 transport에 관계없이 동작한다:

| 구성요소         | HTTP | WebSocket | 비고                              |
| ---------------- | ---- | --------- | --------------------------------- |
| Middleware        | O    | **X**     | Express/Fastify 라우터에 의존     |
| Guard             | O    | O         |                                   |
| Interceptor       | O    | O         |                                   |
| Pipe              | O    | O         |                                   |
| Exception Filter  | O    | O         | 단, 응답 형태가 다름              |

Guard가 양쪽에서 동작할 수 있는 이유는 NestJS가 `ExecutionContext`라는 추상화를 제공하기 때문이다. Guard 안에서 context 타입에 따라 분기할 수 있다:

```typescript
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (context.getType() === 'http') {
      const req = context.switchToHttp().getRequest();
      // req.headers.authorization 에서 토큰 추출
    } else if (context.getType() === 'ws') {
      const client = context.switchToWs().getClient<Socket>();
      // client.handshake.auth.token 에서 토큰 추출
    }
    return true;
  }
}
```

### 그러면 `server.use()` 대신 Guard를 쓰면 되지 않나?

==둘의 실행 시점과 역할이 다르다.== 이를 "클럽 입장"에 비유할 수 있다:

1.  **`server.use()` (현재 코드)**: **클럽 입구 컷 (입장권 확인)**.
    -   ==연결 시점(handshake)==에서 한 번만 실행.
    -   실패하면 **연결 자체가 거부**됨 (소켓 연결 안 됨).

2.  **Guard**: **VIP 룸 앞의 기도 (권한 확인)**.
    -   각 ==`@SubscribeMessage()` 이벤트마다== 실행.
    -   연결은 이미 맺어진 상태에서, 특정 행동(메시지 전송)을 할 권한이 있는지 확인.

현재 `signaling.gateway.ts`에서 `server.use()`를 쓴 것은 "인증 안 된 클라이언트는 아예 연결조차 못하게" 하려는 의도이므로 적절한 선택이다. Guard로 바꾸면 연결은 되지만 메시지를 보낼 때마다 거부되는 형태가 된다.

### 참고: HTTP Upgrade와의 관계

위에서 설명한 HTTP Upgrade 흐름과 연결하면:

```
1. Client → HTTP Upgrade 요청 → Socket.io가 가로챔
2. server.use() 실행 (여기서 인증 실패하면 연결 거부) ← 현재 코드의 방식
3. 101 Switching Protocols → WebSocket 연결 수립
4. @SubscribeMessage() 이벤트 발생 시 → Guard 실행 (쓴다면)
```

==`server.use()`는 2단계(upgrade 중), Guard는 4단계(연결 후)==에서 동작한다. 목적에 따라 선택하면 된다.
