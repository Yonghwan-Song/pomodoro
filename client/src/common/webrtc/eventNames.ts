// Purpose: 서버와 클라이언트 간의 이벤트 이름을 정의하는 파일
export const SDP_OFFER = "sdpOffer"; // 이거는 이제 안쓰지 않냐..
export const GET_ROUTER_RTP_CAPABILITIES = "getRouterRtpCapabilities";
export const SEND_ROUTER_RTP_CAPABILITIES = "routerRtpCapabilities";
export const CREATE_SEND_TRANSPORT = "createSendTransport";
export const SEND_TRANSPORT_CREATED = "sendTransportCreated";
export const CREATE_RECV_TRANSPORT = "createRecvTransport";
export const RECV_TRANSPORT_CREATED = "recvTransportCreated";
export const CONNECT_SEND_TRANSPORT = "connectSendTransport";
export const CONNECT_RECV_TRANSPORT = "connectRecvTransport";
export const SEND_TRANSPORT_CONNECTED = "sendTransportConnected";
export const PRODUCE = "produce";
export const PRODUCED = "produced"; // ISSUE: 이거는 지금 어디에서 안쓰이고있는데..
export const ROOM_GET_PRODUCER = "newProducerAvailable";
export const SET_DEVICE_RTP_CAPABILITIES = "setDeviceRtpCapabilities";
export const INTENT_TO_CONSUME = "intentToConsume";
export const RESUME_CONSUMER = "resumeConsumer";
export const PRODUCER_CLOSED = "producerClosed"; // 이거 edit해서 하면 :w했을때 강제로 종료되던데....

// Room 관련 이벤트
export const CREATE_ROOM = "createRoom";
export const ROOM_CREATED = "roomCreated";
export const JOIN_ROOM = "joinRoom";
export const ROOM_JOINED = "roomJoined";
export const LEAVE_ROOM = "leaveRoom";
export const GET_ROOMS = "getRooms";
export const ROOMS_LIST = "roomsList";
export const ROOM_PEER_JOINED = "roomPeerJoined";
export const ROOM_PEER_LEFT = "roomPeerLeft";

// Chat related
export const WRITE_CHAT = "writeChat";
export const READ_CHAT = "readChat";
export const CHAT_MESSAGE = "chatMessage";

//네, 코드베이스 전체를 살펴본 결과, **mediasoup-client에서 미리 정해진 이벤트 이름을 overwrite(덮어쓰기)하거나 충돌시키는 부분은 없습니다.**
//
// ### 상세 분석
//
// #### 1. **socket.io 관련 이벤트 이름**
// - eventNames.ts에서 정의된 이벤트 이름들은 모두 **socket.io 통신용**입니다.
// - 예시:
//   - `"getRouterRtpCapabilities"`
//   - `"createSendTransport"`
//   - `"sendTransportCreated"`
//   - `"connectSendTransport"`
//   - `"sendTransportConnected"`
//   - `"produce"`
//   - `"produced"`
// - 이 이벤트들은 **서버와 클라이언트 간의 signaling 용**으로 직접 정의한 것이며, socket.io에서 자유롭게 사용할 수 있습니다.
//
// #### 2. **mediasoup-client의 Transport 이벤트 이름**
// - **mediasoup-client의 Transport 객체**에서 사용할 수 있는 이벤트 이름은 공식적으로 아래와 같습니다:
//   - `"connect"`
//   - `"produce"`
//   - `"connectionstatechange"`
// - 코드에서 sendTransport/recvTransport에 대해
//   `sendTransportRef.current.on(EventNames.SEND_TRANSPORT_CONNECTED, ...)`
//   와 같이 **커스텀 이벤트 이름을 사용한 부분이 있습니다.**
// - **이 부분은 mediasoup-client가 내부적으로 emit하지 않으므로, 실제로 동작하지 않습니다.**
// - 하지만, 현재까지는 TypeScript 타입 에러만 발생하고, 런타임 에러는 아직 발생하지 않은 것으로 보입니다.
//   (런타임에서는 해당 이벤트가 emit되지 않으므로, 핸들러가 실행되지 않음)
//
// #### 3. **실제 overwrite/충돌 여부**
// - **socket.io 이벤트 이름과 mediasoup-client 이벤트 이름은 서로 별개**로 동작합니다.
// - 현재 코드베이스에서는 **mediasoup-client의 이벤트 이름을 overwrite하거나 충돌시키는 부분은 없습니다.**
// - 단, **mediasoup-client의 Transport 이벤트 핸들러 등록 시 반드시 공식 이벤트 이름만 사용해야 하며, 커스텀 이름을 쓰면 동작하지 않습니다.**
//
// ---
//
// ### 결론 및 권장 사항
//
// - **socket.io 이벤트 이름은 자유롭게 정의해도 됩니다.**
// - **mediasoup-client의 Transport 이벤트 이름은 반드시 공식 문서에 정의된 것만 사용해야 합니다.**
//   - `"connect"`, `"produce"`, `"connectionstatechange"`
// - 만약 커스텀 이벤트 이름을 사용하면, 핸들러가 실행되지 않거나 타입 에러가 발생할 수 있습니다.
// - **런타임 에러가 발생할 가능성**이 있으니, Transport 이벤트 핸들러 등록 시 커스텀 이름 대신 공식 이름을 사용하세요.
//
// ---
//
// **요약:**
// - socket.io 이벤트 이름은 overwrite/충돌 문제 없음
// - mediasoup-client Transport 이벤트 이름은 반드시 공식 이름만 사용해야 함
// - 현재 코드베이스에서는 overwrite/충돌 문제는 없음,
//   다만 커스텀 이벤트 이름 사용 시 동작하지 않을 수 있으니 주의하세요.
