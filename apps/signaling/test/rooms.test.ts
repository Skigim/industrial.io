import { describe, expect, it } from "vitest";
import { createRoomStore } from "../src/roomStore.js";

describe("room store", () => {
  it("creates and joins up to two peers", () => {
    const store = createRoomStore();
    const room = store.createRoom("owner");

    expect(store.joinRoom(room.id, "guest")).toBe(true);
    expect(store.joinRoom(room.id, "third")).toBe(false);
  });

  it("rejects duplicate joins for the same peer", () => {
    const store = createRoomStore();
    const room = store.createRoom("owner");

    expect(store.joinRoom(room.id, "owner")).toBe(false);
    expect(store.joinRoom(room.id, "guest")).toBe(true);
  });

  it("rejects joins for unknown rooms", () => {
    const store = createRoomStore();

    expect(store.joinRoom("missing-room", "guest")).toBe(false);
  });

  it("frees a room slot when a peer disconnects", () => {
    const store = createRoomStore();
    const room = store.createRoom("owner");

    expect(store.joinRoom(room.id, "guest")).toBe(true);
    expect(store.removePeer("guest")).toBe(true);
    expect(store.joinRoom(room.id, "replacement")).toBe(true);
  });

  it("removes empty rooms after all peers disconnect", () => {
    const store = createRoomStore();
    const room = store.createRoom("owner");

    expect(store.removePeer("owner")).toBe(true);
    expect(store.joinRoom(room.id, "guest")).toBe(false);
  });
});