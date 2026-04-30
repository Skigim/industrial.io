import express from "express";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { nanoid } from "nanoid";
import { Server } from "socket.io";

type Room = { id: string; peers: string[] };
type RoomStore = ReturnType<typeof createRoomStore>;
type SignalingServer = {
  app: ReturnType<typeof express>;
  io: Server;
  server: ReturnType<typeof createServer>;
  store: RoomStore;
};

export function createRoomStore() {
  const rooms = new Map<string, Room>();

  return {
    createRoom(ownerId: string) {
      const room = { id: nanoid(8), peers: [ownerId] };

      rooms.set(room.id, room);

      return room;
    },
    joinRoom(roomId: string, peerId: string) {
      const room = rooms.get(roomId);

      if (!room || room.peers.includes(peerId) || room.peers.length >= 2) {
        return false;
      }

      room.peers.push(peerId);

      return true;
    }
  };
}

export function startSignalingServer(port = 8787): SignalingServer {
  const app = express();
  const server = createServer(app);
  const io = new Server(server, { cors: { origin: "*" } });
  const store = createRoomStore();

  io.on("connection", (socket) => {
    socket.on("room:create", () => {
      socket.emit("room:created", store.createRoom(socket.id));
    });

    socket.on("room:join", (roomId: string) => {
      socket.emit("room:join-result", { ok: store.joinRoom(roomId, socket.id) });
    });
  });

  server.listen(port);

  return { app, io, server, store };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startSignalingServer();
}