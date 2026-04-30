import express from "express";
import { createServer } from "node:http";
import { nanoid } from "nanoid";
import { Server } from "socket.io";

type Room = { id: string; peers: string[] };

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

      if (!room || room.peers.length >= 2) {
        return false;
      }

      room.peers.push(peerId);

      return true;
    }
  };
}

if (process.env.NODE_ENV !== "test") {
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

  server.listen(8787);
}