import { useEffect } from "react";
import { useConnectionStore } from "../../zustand-stores/connectionStore";
import { Outlet } from "react-router-dom";

export default function GroupStudy() {
  const socket = useConnectionStore((s) => s.socket);
  const connected = useConnectionStore((s) => s.connected);
  const connect = useConnectionStore((s) => s.connect);
  const isDeviceLoaded = useConnectionStore((s) => s.isDeviceLoaded);
  const initDevice = useConnectionStore((s) => s.initDevice);

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    if (connected && socket && !isDeviceLoaded) {
      initDevice();
    }
  }, [connected, socket, isDeviceLoaded, initDevice]);

  return <Outlet />;
}
