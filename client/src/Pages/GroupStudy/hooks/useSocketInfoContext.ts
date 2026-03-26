import { useOutletContext } from "react-router-dom";
import { Socket } from "socket.io-client";
import { Device } from "mediasoup-client";

export type SocketContextType = {
  socket: Socket | null;
  connected: boolean;
};

export type DeviceContextType = {
  device: Device | null;
  isDeviceLoaded: boolean;
};

export type MediaContextType = {
  stream: MediaStream | null;
  isSharing: boolean;
  obtainStream: () => Promise<MediaStream | null>;
  startSharing: () => void;
  stopSharing: () => void;
  releaseStream: () => void;
};

export type ConnectionInfoContextType = SocketContextType &
  DeviceContextType &
  MediaContextType;

export const useConnectionInfoContext = () => {
  return useOutletContext<ConnectionInfoContextType>();
};
