import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { types as mediasoupTypes } from "mediasoup-client";
import * as EventNames from "../../common/webrtc/eventNames";
import type {
  AckResponse,
  ConsumerOptionsExtended,
  ProducerPayload,
  SocketID,
} from "../../common/webrtc/payloadRelated";
import type { ProducerInfo } from "./typeDef";
import { useConnectionInfoContext } from "./hooks/useSocketInfoContext";
import { ChatBox } from "./components/chat/ChatBox";
import { RoomControls } from "./components/room/RoomControls";
import { VideoGrid } from "./components/room/VideoGrid";

export function Room() {
  const {
    socket,
    connected,
    device,
    isDeviceLoaded,
    stream,
    isSharing,
    obtainStream,
    startSharing,
    stopSharing,
  } = useConnectionInfoContext();
  const { roomId } = useParams<{ roomId: string }>(); 
  const navigate = useNavigate();
  const [isRoomJoined, setIsRoomJoined] = useState(false);

  const hasMediaPermission = !!stream;

  useEffect(() => {
    if (!stream && connected) {
      console.log(
        "[Room] No stream found, obtaining stream for direct room access...",
      );
      obtainStream();
    }
  }, [stream, connected, obtainStream]);

  const [isSendTransportCreatedLocally, setIsSendTransportCreatedLocally] =
    useState(false);
  const [isRecvTransportCreatedLocally, setIsRecvTransportCreatedLocally] =
    useState(false);

  const sendTransportRef =
    useRef<mediasoupTypes.Transport<mediasoupTypes.AppData> | null>(null);
  const recvTransportRef =
    useRef<mediasoupTypes.Transport<mediasoupTypes.AppData> | null>(null);

  const producerRef = useRef<mediasoupTypes.Producer | null>(null);
  const socketRef = useRef(socket);
  const isRoomJoinedRef = useRef(isRoomJoined);
  const hasLeftRoomRef = useRef(false);
  const [producersList, setProducersList] = useState<ProducerInfo[]>([]);
  const [consumersByPeerId, setConsumersByPeerId] = useState<
    Map<string, mediasoupTypes.Consumer>
  >(new Map());
  const [areMediaTracksReadyToBeOpened, setAreMediaTracksReadyToBeOpened] =
    useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(
    new Map(),
  );

  const [chatMessages, setChatMessages] = useState<
    { senderId: string; message: string; timestamp: string }[]
  >([]);

  const handleNewRemoteStream = useCallback(
    (peerId: string, stream: MediaStream) => {
      setRemoteStreams((prev) => new Map(prev).set(peerId, stream));
    },
    [],
  );

  const handleStreamClosed = useCallback((peerId: string) => {
    setRemoteStreams((prev) => {
      const newMap = new Map(prev);
      newMap.delete(peerId);
      return newMap;
    });
  }, []);

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  useEffect(() => {
    isRoomJoinedRef.current = isRoomJoined;
  }, [isRoomJoined]);

  const leaveRoom = useCallback(() => {
    if (!socket || !isRoomJoined || hasLeftRoomRef.current) return;

    hasLeftRoomRef.current = true;

    socket.emit(
      EventNames.LEAVE_ROOM,
      (response: AckResponse<{ left: boolean }>) => {
        if (response.success && response.data?.left) {
          sendTransportRef.current?.close();
          recvTransportRef.current?.close();
          console.log("Left room successfully");
          navigate("/group-study");
        } else {
          console.error("Failed to leave room:", response.error);
          hasLeftRoomRef.current = false;
        }
      },
    );
  }, [socket, isRoomJoined, navigate]);

  useEffect(() => {
    hasLeftRoomRef.current = false;

    return () => {
      sendTransportRef.current?.close();
      recvTransportRef.current?.close();

      if (
        socketRef.current &&
        isRoomJoinedRef.current &&
        !hasLeftRoomRef.current
      ) {
        socketRef.current.emit(EventNames.LEAVE_ROOM);
      }
    };
  }, []); 

  useEffect(() => {
    if (!socket || !connected || !roomId || isRoomJoined) return;

    socket.emit(
      EventNames.JOIN_ROOM,
      { roomId },
      async (
        response: AckResponse<{
          roomId: string;
          routerRtpCapabilities: mediasoupTypes.RtpCapabilities;
          existingProducers: {
            producerId: string;
            socketId: string;
            kind: string;
          }[];
          peers: SocketID[];
        }>,
      ) => {
        if (response.success && response.data) {
          console.log("Room joined successfully:", response.data);
          setIsRoomJoined(true);

          if (response.data.existingProducers.length > 0) {
            console.log(
              "(EventNames.JOIN_ROOM) Existing producers:",
              response.data.existingProducers,
            );
            setProducersList(
              response.data.existingProducers.map((p) => ({
                ...p,
                kind: p.kind as "video" | "audio",
                isBeingConsumed: false,
              })),
            );
          }
        } else {
          console.error("Failed to join room:", response.error);
          alert("방 참가에 실패했습니다: " + response.error);
          navigate("/group-study");
        }
      },
    );
  }, [socket, connected, roomId, isRoomJoined, navigate]);

  useEffect(() => {
    if (socket) {
      const updateProducersList = (payloads: ProducerPayload[]) => {
        console.log("New producers:", payloads);
        setProducersList((prev) => [
          ...prev,
          ...payloads.map((payload) => ({
            ...payload,
            isBeingConsumed: false,
          })),
        ]);
      };

      socket!.on(EventNames.ROOM_GET_PRODUCER, updateProducersList);
      return () => {
        socket.off(EventNames.ROOM_GET_PRODUCER, updateProducersList);
      };
    }
  }, [connected, socket]);

  useEffect(() => {
    if (socket) {
      socket.on(EventNames.ROOM_PEER_JOINED, (payload: { peerId: string }) => {
        console.log("New peer joined:", payload);
      });
      return () => {
        socket.off(EventNames.ROOM_PEER_JOINED);
      };
    }
  }, [socket]);

  useEffect(() => {
    if (!isDeviceLoaded) return;
    if (!isRecvTransportCreatedLocally) return;
    if (!socket) return;

    producersList.forEach((producer) => {
      if (producer.kind !== "video") return;

      if (!producer.isBeingConsumed) {
        setProducersList((prev) =>
          prev.map((p) =>
            p.producerId === producer.producerId
              ? { ...p, isBeingConsumed: true }
              : p,
          ),
        );

        console.log(`Requesting to consume producer: ${producer.producerId}`);

        socket.emit(
          EventNames.INTENT_TO_CONSUME,
          { producerId: producer.producerId, peerId: producer.socketId },
          async (response: AckResponse<ConsumerOptionsExtended>) => {
            if (response.success === false) {
              console.error(`Consume failed: ${response.error}`);
              return;
            }

            if (response.success === true && response.data) {
              const { peerId, ...consumerOptions } = response.data;
              console.log(`Creating consumer for peer: ${peerId}`);

              try {
                const consumer =
                  await recvTransportRef.current!.consume(consumerOptions);

                console.log(
                  `Successfully created consumer: ${consumer.id} (kind: ${consumer.kind}) for peer: ${peerId}`,
                );

                setConsumersByPeerId((prev) =>
                  new Map(prev).set(peerId, consumer),
                );

                socket.emit(
                  EventNames.RESUME_CONSUMER,
                  { consumerId: consumer.id },
                  (ackResponse: AckResponse<{ resumed: boolean }>) => {
                    if (ackResponse.success) {
                      console.log(
                        `Consumer ${consumer.id} resumed successfully`,
                      );
                    }
                  },
                );

                const { track } = consumer;
                const newStream = new MediaStream([track]);
                handleNewRemoteStream(peerId, newStream);

                consumer.on("transportclose", () => {
                  console.log(`Consumer transport closed for peer: ${peerId}`);
                  setConsumersByPeerId((prev) => {
                    const newMap = new Map(prev);
                    newMap.delete(peerId);
                    return newMap;
                  });
                  handleStreamClosed(peerId);
                });

                consumer.on("trackended", () => {
                  console.log(`Track from peer ${peerId} ended`);
                  handleStreamClosed(peerId);
                });
              } catch (error) {
                console.error("Error creating consumer:", error);
              }
            }
          },
        );
      }
    });
  }, [
    producersList, 
    handleNewRemoteStream,
    socket,
    handleStreamClosed,
    isDeviceLoaded,
    isRecvTransportCreatedLocally,
  ]);

  useEffect(() => {
    function handleProducerClosed(payload: { producerId: string }) {
      const { producerId } = payload;
      console.log("producerId that has been closed", producerId);

      setProducersList((prev) => {
        const producer = prev.find((p) => p.producerId === producerId);
        if (producer) {
          if (producer.isBeingConsumed) {
            const consumer = consumersByPeerId.get(producer.socketId);
            if (consumer) {
              consumer.close();
              handleStreamClosed(producer.socketId);
              setConsumersByPeerId((prevConsumers) => {
                const newMap = new Map(prevConsumers);
                newMap.delete(producer.socketId);
                return newMap;
              });
            }
          }
          return prev.filter((p) => p.producerId !== producerId);
        }
        return prev;
      });
    }

    if (connected && isRoomJoined) {
      socket!.on(EventNames.PRODUCER_CLOSED, handleProducerClosed);
    }
    return () => {
      if (socket) {
        socket.off(EventNames.PRODUCER_CLOSED, handleProducerClosed);
      }
    };
  }, [connected, socket, consumersByPeerId, handleStreamClosed, isRoomJoined]);

  useEffect(() => {
    if (!hasMediaPermission) return;

    if (
      connected === true &&
      socket !== null &&
      isDeviceLoaded === true &&
      device !== null
    ) {
      socket!.emit(EventNames.CREATE_SEND_TRANSPORT);
      socket!.on(EventNames.SEND_TRANSPORT_CREATED, createSendTransportLocally);
    }

    async function createSendTransportLocally(
      webRtcTransportOptions: mediasoupTypes.TransportOptions,
    ) {
      try {
        const sendTransport = device!.createSendTransport(
          webRtcTransportOptions,
        );
        if (sendTransport) {
          console.log(
            "verify: local send-transport has been created",
            sendTransport,
          );
          sendTransportRef.current = sendTransport;
          setAreMediaTracksReadyToBeOpened(true);
          setIsSendTransportCreatedLocally(true);
        }
      } catch (error) {
        console.warn("error inside handleWebRtcTransportResponse", error);
      }
    }
    return () => {
      if (
        connected === true &&
        socket !== null &&
        isDeviceLoaded === true &&
        device !== null
      ) {
        socket.off(
          EventNames.SEND_TRANSPORT_CREATED,
          createSendTransportLocally,
        );
      }
    };
  }, [connected, isDeviceLoaded, hasMediaPermission]);

  useEffect(() => {
    if (!hasMediaPermission) return;

    if (
      connected === true &&
      socket !== null &&
      isDeviceLoaded === true &&
      device !== null
    ) {
      socket!.emit(EventNames.CREATE_RECV_TRANSPORT);
      socket!.on(EventNames.RECV_TRANSPORT_CREATED, createRecvTransportLocally);
    }

    return () => {
      if (
        connected === true &&
        socket !== null &&
        isDeviceLoaded === true &&
        device !== null
      ) {
        socket.off(
          EventNames.RECV_TRANSPORT_CREATED,
          createRecvTransportLocally,
        );
      }
    };

    async function createRecvTransportLocally(
      webRtcTransportOptions: mediasoupTypes.TransportOptions,
    ) {
      try {
        const recvTransport = device!.createRecvTransport(
          webRtcTransportOptions,
        );
        console.log(
          "verify: local recv-transport has been created",
          recvTransport,
        );
        if (recvTransport) {
          recvTransportRef.current = recvTransport;
          setIsRecvTransportCreatedLocally(true);
        }
      } catch (error) {
        console.warn("error inside createRecvTransportLocally", error);
      }
    }
  }, [connected, isDeviceLoaded, hasMediaPermission]);

  useEffect(() => {
    if (isSendTransportCreatedLocally) {
      sendTransportRef.current!.on(
        "connect",
        ({ dtlsParameters }, callback, errback) => {
          try {
            if (socket !== null && sendTransportRef.current !== null) {
              socket.emit(
                EventNames.CONNECT_SEND_TRANSPORT,
                {
                  transportId: sendTransportRef.current.id,
                  dtlsParameters,
                },
                (ackResponse: AckResponse) => {
                  if (ackResponse.success) {
                    console.log("Send transport connected successfully");
                    callback();
                  } else {
                    errback(new Error(ackResponse.error || "Unknown error"));
                  }
                },
              );
            }
          } catch (error: unknown) {
            errback(error as Error);
          }
        },
      );

      sendTransportRef.current!.on(
        "produce",
        (parameters, callback, errback) => {
          socket!.emit(
            EventNames.PRODUCE,
            {
              transportId: sendTransportRef.current!.id,
              kind: "video", 
              rtpParameters: parameters.rtpParameters,
            },
            (ackResponse: AckResponse<{ producerId: string }>) => {
              if (ackResponse.success && ackResponse.data) {
                console.log("Produce success", ackResponse.data);
                callback({ id: ackResponse.data.producerId });
              } else {
                console.log("Produce failed", ackResponse.error);
                errback(new Error(ackResponse.error || "Unknown error"));
              }
            },
          );
        },
      );
    }

    return () => {
      if (sendTransportRef.current) {
        sendTransportRef.current.removeAllListeners("connect");
        sendTransportRef.current.removeAllListeners("produce");
      }
    };
  }, [isSendTransportCreatedLocally, socket]);

  useEffect(() => {
    if (isRecvTransportCreatedLocally && recvTransportRef.current) {
      recvTransportRef.current.on(
        "connect",
        ({ dtlsParameters }, callback, errback) => {
          try {
            if (socket !== null && recvTransportRef.current !== null) {
              socket.emit(
                EventNames.CONNECT_RECV_TRANSPORT,
                {
                  transportId: recvTransportRef.current.id,
                  dtlsParameters,
                },
                (ackResponse: AckResponse) => {
                  if (ackResponse.success) {
                    console.log("Recv transport connected successfully");
                    callback();
                  } else {
                    errback(new Error(ackResponse.error || "Unknown error"));
                  }
                },
              );
            }
          } catch (error) {
            errback(error as Error);
          }
        },
      );
    }
  }, [isRecvTransportCreatedLocally]);

  useEffect(() => {
    async function produce() {
      if (
        !stream ||
        !isSharing || 
        !isSendTransportCreatedLocally ||
        !sendTransportRef.current
      )
        return;

      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack) return;

      if (producerRef.current) return;

      try {
        const producer = await sendTransportRef.current.produce({
          track: videoTrack,
          stopTracks: false,
        });

        console.log("Video Producer created:", producer);
        producerRef.current = producer;
      } catch (err) {
        console.error("Produce failed:", err);
      }
    }

    if (isSendTransportCreatedLocally && isSharing) {
      produce();
    }
  }, [stream, isSharing, isSendTransportCreatedLocally]);

  function endSharing() {
    if (producerRef.current) {
      producerRef.current.close();
      socket?.emit(EventNames.PRODUCER_CLOSED, {
        producerId: producerRef.current.id,
      });
      producerRef.current = null;
    }
    stopSharing();
  }

  const handleSendMessage = (message: string) => {
    if (!message.trim() || !socket) return;

    const newMessage = {
      senderId: "Me",
      message,
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, newMessage]);

    socket.emit(EventNames.CHAT_MESSAGE, { message });
  };

  useEffect(() => {
    if (!socket) return;

    const handleIncomingMessage = (payload: {
      senderId: string;
      message: string;
      timestamp: string;
    }) => {
      console.log("Incoming chat message:", payload);
      setChatMessages((prev) => [...prev, payload]);
    };

    socket.on(EventNames.CHAT_MESSAGE, handleIncomingMessage);

    return () => {
      socket.off(EventNames.CHAT_MESSAGE, handleIncomingMessage);
    };
  }, [socket]);

  return (
    <>
      <RoomControls
        onLeaveRoom={leaveRoom}
        isSharing={isSharing}
        onToggleSharing={isSharing ? endSharing : startSharing}
        canShare={areMediaTracksReadyToBeOpened}
      />

      <VideoGrid localStream={stream} remoteStreams={remoteStreams} />

      <ChatBox messages={chatMessages} onSendMessage={handleSendMessage} />
    </>
  );
}
