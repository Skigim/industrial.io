import { nanoid } from "nanoid";

export type Room = Readonly<{ id: string; peers: readonly string[] }>;

type StoredRoom = { id: string; peers: string[] };

export type RoomStore = {
  createRoom(ownerId: string): Room;
  joinRoom(roomId: string, peerId: string): boolean;
  removePeer(peerId: string): boolean;
};

function toRoomSnapshot(room: StoredRoom): Room {
  return Object.freeze({ id: room.id, peers: Object.freeze([...room.peers]) });
}

export function createRoomStore(): RoomStore {
  const rooms = new Map<string, StoredRoom>();

  return {
    createRoom(ownerId: string) {
      const room: StoredRoom = { id: nanoid(8), peers: [ownerId] };

      rooms.set(room.id, room);

      return toRoomSnapshot(room);
    },
    joinRoom(roomId: string, peerId: string) {
      const room = rooms.get(roomId);

      if (!room || room.peers.includes(peerId) || room.peers.length >= 2) {
        return false;
      }

      room.peers.push(peerId);

      return true;
    },
    removePeer(peerId: string) {
      let removed = false;

      for (const [roomId, room] of rooms) {
        const nextPeers = room.peers.filter((currentPeerId) => currentPeerId !== peerId);

        if (nextPeers.length === room.peers.length) {
          continue;
        }

        removed = true;

        if (nextPeers.length === 0) {
          rooms.delete(roomId);
          continue;
        }

        room.peers = nextPeers;
      }

      return removed;
    }
  };
}