import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorldConnection } from './WorldConnection';

class FakeWebSocket {
  static lastUrl: string | URL | null = null;

  constructor(url: string | URL) {
    FakeWebSocket.lastUrl = url;
  }
}

const originalWebSocket = globalThis.WebSocket;

afterEach(() => {
  globalThis.WebSocket = originalWebSocket;
  FakeWebSocket.lastUrl = null;
});

describe('WorldConnection', () => {
  it('connects to the configured world websocket endpoint', () => {
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;

    const connection = new WorldConnection('ws://world.example/socket');
    connection.connect('starter-1', 'player-1');

    expect(String(FakeWebSocket.lastUrl)).toBe(
      'ws://world.example/socket?regionId=starter-1&playerId=player-1',
    );
  });

  it('serializes the selected tile in build placement messages', () => {
    const send = vi.fn();
    const socket = {
      readyState: WebSocket.OPEN,
      send,
    } as Pick<WebSocket, 'readyState' | 'send'> as WebSocket;

    const connection = new WorldConnection('ws://world.example/socket');

    connection.placeBuilding(socket, 'starter-1', 'player-1', 'miner', { x: 7, y: 9 });

    expect(send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'build.place',
        regionId: 'starter-1',
        playerId: 'player-1',
        buildingType: 'miner',
        tile: { x: 7, y: 9 },
      }),
    );
  });
});