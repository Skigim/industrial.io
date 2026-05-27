// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const worldConnectionMocks = vi.hoisted(() => ({
  connect: vi.fn(),
  joinRegion: vi.fn(),
  placeBuilding: vi.fn(),
}));

const gameViewportRenderSpy = vi.hoisted(() => vi.fn());

vi.mock('./game/runtime/WorldConnection', () => ({
  WorldConnection: vi.fn(() => worldConnectionMocks),
}));

vi.mock('./game/GameViewport', () => ({
  GameViewport: (props: unknown) => {
    gameViewportRenderSpy(props);
    return <div data-testid="game-viewport" />;
  },
}));

import { App } from './App';

type FakeSocket = {
  addEventListener: (type: string, listener: (event: Event | MessageEvent) => void) => void;
  close: () => void;
  emit: (type: string, event?: Event | MessageEvent) => void;
};

const createFakeSocket = (): FakeSocket => {
  const listeners = new Map<string, Array<(event: Event | MessageEvent) => void>>();

  return {
    addEventListener: (type, listener) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    close: vi.fn(),
    emit: (type, event = new Event(type)) => {
      for (const listener of listeners.get(type) ?? []) {
        listener(event);
      }
    },
  };
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  worldConnectionMocks.connect.mockReset();
  worldConnectionMocks.joinRegion.mockReset();
  worldConnectionMocks.placeBuilding.mockReset();
  gameViewportRenderSpy.mockReset();
});

describe('App visible world snapshot', () => {
  it('passes buildings and resource nodes from region snapshots into the viewport', async () => {
    const socket = createFakeSocket();

    worldConnectionMocks.connect.mockReturnValue(socket as unknown as WebSocket);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          playerId: 'player-1',
          regionId: 'region-1',
        }),
      } as Response),
    );

    render(<App />);

    await waitFor(() => {
      expect(worldConnectionMocks.connect).toHaveBeenCalledWith('region-1', 'player-1');
    });

    socket.emit('open');

    await waitFor(() => {
      expect(worldConnectionMocks.joinRegion).toHaveBeenCalledWith(socket, 'region-1', 'player-1');
    });

    socket.emit(
      'message',
      new MessageEvent('message', {
        data: JSON.stringify({
          type: 'region.snapshot',
          regionId: 'region-1',
          storage: { 'iron-plate': 3 },
          buildings: [{ id: 'belt-1', type: 'belt', tile: { x: 8, y: 6 } }],
          resourceNodes: [
            {
              id: 'starter-iron-patch',
              resourceType: 'iron-ore',
              tiles: [{ x: 10, y: 6 }],
            },
          ],
        }),
      }),
    );

    await waitFor(() => {
      expect(screen.getByText('Iron Plate: 3')).toBeInTheDocument();
      expect(gameViewportRenderSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          regionSnapshot: {
            regionId: 'region-1',
            storage: { 'iron-plate': 3 },
            buildings: [{ id: 'belt-1', type: 'belt', tile: { x: 8, y: 6 } }],
            resourceNodes: [
              {
                id: 'starter-iron-patch',
                resourceType: 'iron-ore',
                tiles: [{ x: 10, y: 6 }],
              },
            ],
          },
        }),
      );
    });
  });
});