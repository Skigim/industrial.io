// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const worldConnectionMocks = vi.hoisted(() => ({
  connect: vi.fn(),
  joinRegion: vi.fn(),
  placeBuilding: vi.fn(),
}));

vi.mock('./game/runtime/WorldConnection', () => ({
  WorldConnection: vi.fn(() => worldConnectionMocks),
}));

import { App } from './App';

type FakeCanvasContext = Pick<CanvasRenderingContext2D, 'clearRect' | 'strokeRect' | 'fillRect'> & {
  strokeStyle: string;
  fillStyle: string;
};

const createCanvasContext = (): FakeCanvasContext => ({
  clearRect: vi.fn(),
  strokeRect: vi.fn(),
  fillRect: vi.fn(),
  strokeStyle: '',
  fillStyle: '',
});

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
});

describe('App', () => {
  it('renders the build panel and world viewport', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      createCanvasContext() as unknown as CanvasRenderingContext2D,
    );

    render(<App />);

    expect(screen.getByText('Build')).toBeInTheDocument();
    expect(screen.getByTestId('game-viewport')).toBeInTheDocument();
    expect(screen.getByTestId('ui-overlay')).toContainElement(screen.getByText('Industrial.io'));
  });

  it('arms a building from the build panel and cancels it', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      createCanvasContext() as unknown as CanvasRenderingContext2D,
    );

    render(<App />);

    const minerButton = screen.getByRole('button', { name: 'Miner' });

    expect(minerButton).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: 'Cancel Build Tool' })).not.toBeInTheDocument();
    expect(screen.queryByText('Armed')).not.toBeInTheDocument();

    fireEvent.click(minerButton);

    expect(minerButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Armed')).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: 'Cancel Build Tool' });

    fireEvent.click(cancelButton);

    expect(minerButton).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: 'Cancel Build Tool' })).not.toBeInTheDocument();
    expect(screen.queryByText('Armed')).not.toBeInTheDocument();
  });

  it('does not re-register the Escape key listener when build state changes', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      createCanvasContext() as unknown as CanvasRenderingContext2D,
    );
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    render(<App />);

    const minerButton = screen.getByRole('button', { name: 'Miner' });

    fireEvent.click(minerButton);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Build Tool' }));

    const keydownAdds = addEventListenerSpy.mock.calls.filter(([eventName]) => eventName === 'keydown');
    const keydownRemoves = removeEventListenerSpy.mock.calls.filter(([eventName]) => eventName === 'keydown');

    expect(keydownAdds).toHaveLength(1);
    expect(keydownRemoves).toHaveLength(0);
  });

  it('arms a building without immediately placing it when a session is active', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      createCanvasContext() as unknown as CanvasRenderingContext2D,
    );

    const socket = createFakeSocket();

    worldConnectionMocks.connect.mockReturnValue(socket as unknown as WebSocket);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        playerId: 'player-1',
        regionId: 'region-1',
      }),
    } as Response);

    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/session/guest', { method: 'POST' });
      expect(worldConnectionMocks.connect).toHaveBeenCalledWith('region-1', 'player-1');
    });

    socket.emit('open');

    await waitFor(() => {
      expect(worldConnectionMocks.joinRegion).toHaveBeenCalledWith(
        socket,
        'region-1',
        'player-1',
      );
    });

    const minerButton = screen.getByRole('button', { name: 'Miner' });

    fireEvent.click(minerButton);

    expect(minerButton).toHaveAttribute('aria-pressed', 'true');
    expect(worldConnectionMocks.placeBuilding).not.toHaveBeenCalled();
  });

  it('places the armed building on the hovered tile and clears placement state after success', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      createCanvasContext() as unknown as CanvasRenderingContext2D,
    );

    const socket = createFakeSocket();

    worldConnectionMocks.connect.mockReturnValue(socket as unknown as WebSocket);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        playerId: 'player-1',
        regionId: 'region-1',
      }),
    } as Response);

    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/session/guest', { method: 'POST' });
      expect(worldConnectionMocks.connect).toHaveBeenCalledWith('region-1', 'player-1');
    });

    socket.emit('open');

    await waitFor(() => {
      expect(worldConnectionMocks.joinRegion).toHaveBeenCalledWith(
        socket,
        'region-1',
        'player-1',
      );
    });

    const minerButton = screen.getByRole('button', { name: 'Miner' });
    const viewport = screen.getByTestId('game-viewport');

    fireEvent.click(minerButton);
    fireEvent(viewport, new MouseEvent('pointermove', { clientX: 96, clientY: 64 }));
    fireEvent.click(viewport);

    expect(worldConnectionMocks.placeBuilding).toHaveBeenCalledTimes(1);
    expect(worldConnectionMocks.placeBuilding).toHaveBeenCalledWith(
      socket,
      'region-1',
      'player-1',
      'miner',
      { x: 3, y: 2 },
    );

    fireEvent.click(viewport);

    expect(worldConnectionMocks.placeBuilding).toHaveBeenCalledTimes(1);
    expect(minerButton).toHaveAttribute('aria-pressed', 'true');

    socket.emit(
      'message',
      new MessageEvent('message', {
        data: JSON.stringify({
          type: 'region.snapshot',
          regionId: 'region-1',
          storage: { 'iron-plate': 0 },
          buildings: [{ id: 'miner-1', type: 'miner', tile: { x: 3, y: 2 } }],
          resourceNodes: [
            {
              id: 'starter-iron-patch',
              resourceType: 'iron-ore',
              tiles: [{ x: 3, y: 2 }],
            },
          ],
        }),
      }),
    );

    await waitFor(() => {
      expect(minerButton).toHaveAttribute('aria-pressed', 'false');
    });

    fireEvent.click(minerButton);
    fireEvent.click(viewport);

    expect(worldConnectionMocks.placeBuilding).toHaveBeenCalledTimes(1);
  });

  it('keeps the build tool armed after asynchronous placement rejection and cancels it with Escape', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      createCanvasContext() as unknown as CanvasRenderingContext2D,
    );
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const socket = createFakeSocket();

    worldConnectionMocks.connect.mockReturnValue(socket as unknown as WebSocket);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        playerId: 'player-1',
        regionId: 'region-1',
      }),
    } as Response);

    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/session/guest', { method: 'POST' });
      expect(worldConnectionMocks.connect).toHaveBeenCalledWith('region-1', 'player-1');
    });

    socket.emit('open');

    await waitFor(() => {
      expect(worldConnectionMocks.joinRegion).toHaveBeenCalledWith(
        socket,
        'region-1',
        'player-1',
      );
    });

    const minerButton = screen.getByRole('button', { name: 'Miner' });
    const viewport = screen.getByTestId('game-viewport');

    fireEvent.click(minerButton);
    fireEvent(viewport, new MouseEvent('pointermove', { clientX: 96, clientY: 64 }));
    fireEvent.click(viewport);

    expect(worldConnectionMocks.placeBuilding).toHaveBeenCalledTimes(1);

    socket.emit(
      'message',
      new MessageEvent('message', {
        data: JSON.stringify({
          type: 'build.place.rejected',
          buildingType: 'miner',
          tile: { x: 3, y: 2 },
          reason: 'Miners must be placed on an iron patch tile',
        }),
      }),
    );

    await waitFor(() => {
      expect(minerButton).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Cancel Build Tool' })).toBeInTheDocument();
    });

    expect(minerButton).toHaveAttribute('aria-pressed', 'true');

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(minerButton).toHaveAttribute('aria-pressed', 'false');
      expect(screen.queryByRole('button', { name: 'Cancel Build Tool' })).not.toBeInTheDocument();
    });

    fireEvent.click(minerButton);
    fireEvent.click(viewport);

    expect(worldConnectionMocks.placeBuilding).toHaveBeenCalledTimes(1);
  });

  it('cancels the armed build tool with right-click on the viewport and suppresses the context menu', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      createCanvasContext() as unknown as CanvasRenderingContext2D,
    );

    render(<App />);

    const minerButton = screen.getByRole('button', { name: 'Miner' });
    const viewport = screen.getByTestId('game-viewport');

    fireEvent.click(minerButton);

    expect(minerButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Cancel Build Tool' })).toBeInTheDocument();

    const contextMenuEvent = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      button: 2,
    });

    fireEvent(viewport, contextMenuEvent);

    expect(contextMenuEvent.defaultPrevented).toBe(true);

    await waitFor(() => {
      expect(minerButton).toHaveAttribute('aria-pressed', 'false');
      expect(screen.queryByRole('button', { name: 'Cancel Build Tool' })).not.toBeInTheDocument();
    });
  });
});