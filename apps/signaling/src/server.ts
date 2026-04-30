import express from "express";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { Server, type Socket } from "socket.io";
import { createRoomStore, type RoomStore } from "./roomStore.js";

type SignalingServer = {
  app: ReturnType<typeof express>;
  io: Server;
  server: ReturnType<typeof createServer>;
  store: RoomStore;
};

type SignalingSocket = Pick<Socket, "id" | "emit" | "on">;

export { createRoomStore } from "./roomStore.js";

export function registerRoomSocketHandlers(socket: SignalingSocket, store: RoomStore) {
  socket.on("room:create", () => {
    socket.emit("room:created", store.createRoom(socket.id));
  });

  socket.on("room:join", (roomId: string) => {
    socket.emit("room:join-result", { ok: store.joinRoom(roomId, socket.id) });
  });

  socket.on("disconnect", () => {
    store.removePeer(socket.id);
  });
}

export function startSignalingServer(port = 8787): SignalingServer {
  const app = express();
  const server = createServer(app);
  const io = new Server(server, { cors: { origin: "*" } });
  const store = createRoomStore();

  io.on("connection", (socket) => {
    registerRoomSocketHandlers(socket, store);
  });

  server.listen(port);

  return { app, io, server, store };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startSignalingServer();
}