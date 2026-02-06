export const SDP_OFFER = 'sdpOffer';
export const GET_ROUTER_RTP_CAPABILITIES = 'getRouterRtpCapabilities';
export const SEND_ROUTER_RTP_CAPABILITIES = 'routerRtpCapabilities';
export const CREATE_SEND_TRANSPORT = 'createSendTransport';
export const SEND_TRANSPORT_CREATED = 'sendTransportCreated';
export const CREATE_RECV_TRANSPORT = 'createRecvTransport';
export const RECV_TRANSPORT_CREATED = 'recvTransportCreated';
export const CONNECT_SEND_TRANSPORT = 'connectSendTransport';
export const CONNECT_RECV_TRANSPORT = 'connectRecvTransport';
export const SEND_TRANSPORT_CONNECTED = 'sendTransportConnected';
export const PRODUCE = 'produce';
export const PRODUCED = 'produced';
export const ROOM_GET_PRODUCER = 'newProducerAvailable';
export const SET_DEVICE_RTP_CAPABILITIES = 'setDeviceRtpCapabilities';
export const INTENT_TO_CONSUME = 'intentToConsume';
export const RESUME_CONSUMER = 'resumeConsumer';
export const PRODUCER_CLOSED = 'producerClosed';

// Room 관련 이벤트
export const CREATE_ROOM = 'createRoom';
export const ROOM_CREATED = 'roomCreated';
export const JOIN_ROOM = 'joinRoom';
export const ROOM_JOINED = 'roomJoined';
export const LEAVE_ROOM = 'leaveRoom';
export const GET_ROOMS = 'getRooms';
export const ROOMS_LIST = 'roomsList';
export const ROOM_PEER_JOINED = 'roomPeerJoined';
export const ROOM_PEER_LEFT = 'roomPeerLeft';

// Chat related
export const WRITE_CHAT = 'writeChat';
export const READ_CHAT = 'readChat';
export const CHAT_MESSAGE = 'chatMessage';
