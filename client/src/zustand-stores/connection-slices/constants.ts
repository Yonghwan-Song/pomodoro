export const MAX_ICE_RESTART_ATTEMPTS = 20;

export const VERY_LOW_RESOLUTION_MAX_BITRATE = 250_000;
export const SD_MAX_BITRATE_15FPS = 450_000;
export const SD_MAX_BITRATE_30FPS = 600_000;
export const QHD_MAX_BITRATE_15FPS = 800_000;
export const QHD_MAX_BITRATE_30FPS = 1_000_000;
export const HD_MAX_BITRATE_15FPS = 1_200_000;
export const HD_MAX_BITRATE_30FPS = 1_500_000;
export const FULL_HD_MAX_BITRATE_15FPS = 2_500_000;
export const FULL_HD_MAX_BITRATE_30FPS = 3_000_000;

// https://socket.io/docs/v4/client-socket-instance/#disconnect
// According to the documentation above, the two reasons below do not trigger automatic reconnection.
export const EXPLICIT_SOCKET_DISCONNECT_REASONS = new Set([
  'io client disconnect', // The socket was manually disconnected using disconnect() method of the client socket.
  'io server disconnect', // The server has forcefully disconnected the socket with socket.disconnect() (socket.io/docs/v4/server-api/#socketdisconnectclose)
  // 둘다 의도적으로 끊는것 서버쪽에서든 클라이언트쪽에서든.
]);
