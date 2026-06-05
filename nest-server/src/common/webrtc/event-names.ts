// Device 관련
export const GET_ROUTER_RTP_CAPABILITIES = 'getRouterRtpCapabilities';
export const SEND_ROUTER_RTP_CAPABILITIES = 'routerRtpCapabilities';
export const SET_DEVICE_RTP_CAPABILITIES = 'setDeviceRtpCapabilities';

// Trnasport 관련
export const CREATE_SEND_TRANSPORT = 'createSendTransport';
export const SEND_TRANSPORT_CREATED = 'sendTransportCreated';
export const CREATE_RECV_TRANSPORT = 'createRecvTransport';
export const RECV_TRANSPORT_CREATED = 'recvTransportCreated';
export const CONNECT_SEND_TRANSPORT = 'connectSendTransport';
export const CONNECT_RECV_TRANSPORT = 'connectRecvTransport';
export const RESTART_ICE = 'restartIce';

// Producer 관련
export const PRODUCE = 'produce';
export const PAUSE_PRODUCER = 'pauseProducer';
export const RESUME_PRODUCER = 'resumeProducer';
export const PRODUCER_CLOSED = 'producerClosed';

// Consumer 관련
export const INTENT_TO_CONSUME = 'intentToConsume';
export const PAUSE_CONSUMER = 'pauseConsumer';
export const RESUME_CONSUMER = 'resumeConsumer';
export const SET_CONSUMER_PREFERRED_LAYERS = 'setConsumerPreferredLayers';
export const SET_COMMON_PREFERRED_LAYERS_FOR_ALL_CONSUMERS =
  'setCommonPreferredLayersForAllConsumers';
export const CONSUMER_LAYERS_CHANGED = 'consumerLayersChanged'; // createConsumer() in the GroupStudyManagementService.

// Room 관련 이벤트
export const GET_ROOMS = 'getRooms';
export const ROOMS_LIST = 'roomsList';
export const CREATE_ROOM = 'createRoom';
export const JOIN_ROOM = 'joinRoom';
export const LEAVE_ROOM = 'leaveRoom';

export const ROOM_PEER_JOINED = 'roomPeerJoined'; // joinRoom() in the GroupStudyManagementService
export const ROOM_PEER_LEFT = 'roomPeerLeft'; // notifyPeerLeft() in the GroupStudyManagementService
export const ROOM_GET_PRODUCER = 'newProducerAvailable'; // createProducer() in the GroupStudyManagementService

export const CHAT_MESSAGE = 'chatMessage';

export const SYNC_MY_TODAY_TOTAL_DURATION = 'syncMyTodayTotalDuration';
export const PEER_TODAY_TOTAL_DURATION_UPDATED =
  'peerTodayTotalDurationUpdated'; // updatePeerTodayTotalDuration() in the GroupStudyManagementService

export const SYNC_DATA_TO_PEER_RECONNECTED = 'syncDataToPeerReconnected'; // handleConnection() in the SignalingGateway

// Log out
export const LOG_OUT = 'logOut';
