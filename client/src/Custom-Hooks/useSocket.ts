import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { auth } from "../firebase";
import { BASE_URL } from "../constants";

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const initSocket = async () => {
      const user = auth.currentUser;
      let token = "";

      if (user) {
        token = await user.getIdToken();
      }

      console.log("Initializing socket with URL:", BASE_URL);

      const newSocket = io(BASE_URL, {
        auth: {
          token: token
        }
      });

      setSocket(newSocket);

      newSocket.on("connect", () => {
        console.log("socket.connected", newSocket.connected);
        setConnected(true);
      });

      newSocket.on("disconnect", () => {
        console.log("Socket disconnected");
        setConnected(false);
      });

      return newSocket;
    };

    let socketInstance: Socket | null = null;
    initSocket().then((s) => {
      socketInstance = s;
    });

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []);

  return {
    socket,
    connected
  };
}
