import type { Server as SocketIOServer } from "socket.io";

declare global {
  var memoraaSocket: SocketIOServer | undefined;
}

export function getSocketServer(): SocketIOServer | undefined {
  return globalThis.memoraaSocket;
}

export function emitToAlbum(event: string, albumId: number, payload: unknown) {
  const io = getSocketServer();

  if (!io) {
    return false;
  }

  io.to(`album:${albumId}`).emit(event, payload);
  return true;
}

export function emitToUser(event: string, userId: number, payload: unknown) {
  const io = getSocketServer();
  if (!io) return false;
  io.to(`notifications:${userId}`).emit(event, payload);
  return true;
}
