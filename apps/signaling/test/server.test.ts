import { describe, expect, it, vi } from "vitest";
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