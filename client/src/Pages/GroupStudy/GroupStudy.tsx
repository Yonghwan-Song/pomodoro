import { useState, useEffect, useRef } from "react";
import * as mediasoupClient from "mediasoup-client";
import * as EventNames from "../../common/webrtc/eventNames";
import { useSocket } from "../../Custom-Hooks/useSocket";
import { useUserMedia } from "../../Custom-Hooks/useUserMedia";
import { Outlet } from "react-router-dom";
import { type ConnectionInfoContextType } from "./hooks/useSocketInfoContext";
import { Device, types as mediasoupTypes } from "mediasoup-client";

export default function GroupStudy() {
  const { socket, connected } = useSocket();
  const deviceRef = useRef<Device | null>(null);
  const [isDeviceCreated, setIsDeviceCreated] = useState(false);
  const [isDeviceLoaded, setIsDeviceLoaded] = useState(false);

  // Media stream 관리 - Room 입장 전에 obtainStream 호출, Room에서 startSharing으로 공유 시작
  const {
    stream,
    isSharing,
    obtainStream,
    startSharing,
    stopSharing,
    releaseStream,
  } = useUserMedia({
    video: true,
    audio: false,
  });

  useEffect(() => {
    async function checkHandler() {
      const handlerName = await mediasoupClient.detectDeviceAsync();

      if (handlerName) {
        console.log("detected handler: %s", handlerName);
      } else {
        console.warn("no suitable handler found for current browser/device");
      }
    }
    checkHandler();
  }, []);

  /**
   * DEFENSIVE CODING: Device creation with state tracking.
   */
  useEffect(() => {
    async function createDevice() {
      try {
        deviceRef.current = await Device.factory();
        setIsDeviceCreated(true);
        console.log("deviceRef.current", deviceRef.current);
      } catch (error: unknown) {
        if ((error as Error).name === "UnsupportedError") {
          console.warn("browser not supported");
        }
      }
    }
    createDevice();
  }, []);

  /**
   * Request `RTP capabilities` of a mediasoup router.
   */
  useEffect(() => {
    if (connected && isDeviceCreated && socket) {
      socket.emit(EventNames.GET_ROUTER_RTP_CAPABILITIES);
    }
  }, [connected, isDeviceCreated, socket]);

  /**
   * Load device with the `RTP capabilities` requested above.
   */
  useEffect(() => {
    if (!connected || !socket || !isDeviceCreated) return;

    async function loadDeviceAndSendDeviceRtpCapabilitiesToServer(
      routerRtpCapabilities: mediasoupTypes.RtpCapabilities,
    ) {
      try {
        if (!deviceRef.current || !socket) {
          console.warn("Device or socket not ready");
          return;
        }
        
        if (deviceRef.current.loaded) {
          console.log("Device already loaded, skipping...");
          setIsDeviceLoaded(true);
          return;
        }
        await deviceRef.current.load({ routerRtpCapabilities });
        
        socket.emit(
          EventNames.SET_DEVICE_RTP_CAPABILITIES,
          deviceRef.current.rtpCapabilities,
          () => {
            console.log(
              "[GroupStudy] Server confirmed RTP capabilities received",
            );
            setIsDeviceLoaded(true);
          },
        );
      } catch (error) {
        console.warn("error while loading routerRtpCapabilities", error);
      }
    }

    socket.on(
      EventNames.SEND_ROUTER_RTP_CAPABILITIES,
      loadDeviceAndSendDeviceRtpCapabilitiesToServer,
    );

    return () => {
      socket.off(
        EventNames.SEND_ROUTER_RTP_CAPABILITIES,
        loadDeviceAndSendDeviceRtpCapabilitiesToServer,
      );
    };
  }, [connected, socket, isDeviceCreated]);

  return (
    <>
      <Outlet
        context={
          {
            socket,
            connected,
            device: deviceRef.current,
            isDeviceLoaded,
            stream,
            isSharing,
            obtainStream,
            startSharing,
            stopSharing,
            releaseStream,
          } satisfies ConnectionInfoContextType
        }
      />
    </>
  );
}
