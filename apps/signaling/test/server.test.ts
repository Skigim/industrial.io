import { describe, expect, it, vi } from "vitest";
import { createRoomStore, type Room } from "../src/roomStore.js";
import { registerRoomSocketHandlers } from "../src/server.js";
import type { RoomStore } from "../src/roomStore.js";

function createFakeSocket(id: string) {
  const handlers = new Map<string, (...args: unknown[]) => void>();

  return {
    id,
    emit: vi.fn(),
    on(event: string, handler: (...args: unknown[]) => void) {
      handlers.set(event, handler);
      return this;
    },
    trigger(event: string, ...args: unknown[]) {
      const handler = handlers.get(event);

      if (!handler) {
        throw new Error(`Missing handler for ${event}`);
      }

      handler(...args);
    }
  };
}

describe("signaling server", () => {
  it("emits room:created with the newly created room", () => {
    const room: Room = { id: "room-1", peers: ["peer-1"] };
    const store: RoomStore = {
      createRoom: vi.fn(() => room),
      joinRoom: vi.fn(),
      removePeer: vi.fn()
    };
    const socket = createFakeSocket("peer-1");

    registerRoomSocketHandlers(socket, store);
    socket.trigger("room:create");

    expect(store.createRoom).toHaveBeenCalledWith("peer-1");
    expect(socket.emit).toHaveBeenCalledWith("room:created", room);
  });

  it("emits a successful join result for the second peer", () => {
    const store = createRoomStore();
    const ownerSocket = createFakeSocket("owner");
    const guestSocket = createFakeSocket("guest");

    registerRoomSocketHandlers(ownerSocket, store);
    registerRoomSocketHandlers(guestSocket, store);

    ownerSocket.trigger("room:create");

    const createdRoom = ownerSocket.emit.mock.calls[0]?.[1] as Room;

    guestSocket.trigger("room:join", createdRoom.id);

    expect(guestSocket.emit).toHaveBeenCalledWith("room:join-result", { ok: true });
  });

  it("emits a failed join result when the room is missing", () => {
    const store = createRoomStore();
    const socket = createFakeSocket("guest");

    registerRoomSocketHandlers(socket, store);
    socket.trigger("room:join", "missing-room");

    expect(socket.emit).toHaveBeenCalledWith("room:join-result", { ok: false });
  });

  it("emits a failed join result when the room is already full", () => {
    const store = createRoomStore();
    const ownerSocket = createFakeSocket("owner");
    const guestSocket = createFakeSocket("guest");
    const thirdSocket = createFakeSocket("third");

    registerRoomSocketHandlers(ownerSocket, store);
    registerRoomSocketHandlers(guestSocket, store);
    registerRoomSocketHandlers(thirdSocket, store);

    ownerSocket.trigger("room:create");

    const createdRoom = ownerSocket.emit.mock.calls[0]?.[1] as Room;

    guestSocket.trigger("room:join", createdRoom.id);
    thirdSocket.trigger("room:join", createdRoom.id);

    expect(thirdSocket.emit).toHaveBeenCalledWith("room:join-result", { ok: false });
  });

  it("removes the connected peer from rooms on disconnect", () => {
    const store: RoomStore = {
      createRoom: vi.fn(),
      joinRoom: vi.fn(),
      removePeer: vi.fn(() => true)
    };
    const socket = createFakeSocket("peer-1");

    registerRoomSocketHandlers(socket, store);
    socket.trigger("disconnect");

    expect(store.removePeer).toHaveBeenCalledWith("peer-1");
  });
});