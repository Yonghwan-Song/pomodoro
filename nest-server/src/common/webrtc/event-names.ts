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
export const SET_CONSUMER_PREFERRED_LAYERS = 'setConsumerPreferredLayers';
export const SET_COMMON_PREFERRED_LAYERS_FOR_ALL_CONSUMERS =
  'setCommonPreferredLayersForAllConsumers';
export const CONSUMER_LAYERS_CHANGED = 'consumerLayersChanged';
export const PRODUCER_CLOSED = 'producerClosed';
export const PAUSE_PRODUCER = 'pauseProducer';
export const RESUME_PRODUCER = 'resumeProducer';

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
export const SYNC_MY_TODAY_TOTAL_DURATION = 'syncMyTodayTotalDuration';
export const PEER_TODAY_TOTAL_DURATION_UPDATED =
  'peerTodayTotalDurationUpdated';

// Chat related
export const WRITE_CHAT = 'writeChat';
export const READ_CHAT = 'readChat';
export const CHAT_MESSAGE = 'chatMessage';
