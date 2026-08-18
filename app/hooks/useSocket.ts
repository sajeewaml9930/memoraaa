"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

export function useSocket(albumId?: number | null) {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const socketClient = io({
      transports: ["websocket"],
      reconnection: true,
    });

    setSocket(socketClient);

    return () => {
      socketClient.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket || albumId == null) {
      return;
    }

    socket.emit("join_album", Number(albumId));

    return () => {
      socket.emit("leave_album", Number(albumId));
    };
  }, [socket, albumId]);

  return socket;
}
