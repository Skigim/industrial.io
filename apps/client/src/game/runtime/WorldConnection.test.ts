import { afterEach, describe, expect, it } from 'vitest';

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
});