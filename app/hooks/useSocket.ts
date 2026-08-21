"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

export function useSocket(albumId?: number | null, userId?: number | null) {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const socketClient = io({
      transports: ["polling", "websocket"],
      reconnection: true,
    });

    socketClient.on("connect", () => {
      console.info("Memoraa socket connected", socketClient.id);
    });
    socketClient.on("connect_error", (error) => {
      console.error("Memoraa socket connection error:", error);
    });
    socketClient.on("disconnect", (reason) => {
      console.warn("Memoraa socket disconnected:", reason);
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

    const normalizedAlbumId = Number(albumId);
    if (!Number.isFinite(normalizedAlbumId)) {
      console.error("Cannot join album socket room: invalid album id", albumId);
      return;
    }

    const joinAlbum = () => {
      socket.emit("join_album", normalizedAlbumId);
    };

    socket.on("connect", joinAlbum);
    if (socket.connected) {
      joinAlbum();
    }

    return () => {
      socket.off("connect", joinAlbum);
      socket.emit("leave_album", normalizedAlbumId);
    };
  }, [socket, albumId]);

  useEffect(() => {
    if (!socket || userId == null || !Number.isFinite(Number(userId))) return;
    const normalizedUserId = Number(userId);
    socket.emit("join_notifications", normalizedUserId);
    return () => {
      socket.emit("leave_notifications", normalizedUserId);
    };
  }, [socket, userId]);

  return socket;
}
