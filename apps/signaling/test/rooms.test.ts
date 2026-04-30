import { describe, expect, it } from "vitest";
import { createRoomStore } from "../src/server";

describe("room store", () => {
  it("creates and joins up to two peers", () => {
    const store = createRoomStore();
    const room = store.createRoom("owner");

    expect(store.joinRoom(room.id, "guest")).toBe(true);
    expect(store.joinRoom(room.id, "third")).toBe(false);
  });
});