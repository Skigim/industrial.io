// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const createRendererMock = vi.hoisted(() => vi.fn(() => vi.fn()));

vi.mock('./renderer/createRenderer', () => ({
  createRenderer: createRendererMock,
}));

import { GameViewport } from './GameViewport';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  createRendererMock.mockReset();
});

describe('GameViewport', () => {
  it('passes the visible region snapshot into the renderer bridge', () => {
    render(
      <GameViewport
        hoveredTile={null}
        isPlacementModeEnabled={false}
        regionSnapshot={{
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
        }}
        onHoverTileChange={vi.fn()}
        onCancelPlacement={vi.fn()}
        onPlaceBuilding={vi.fn(() => false)}
      />,
    );

    expect(createRendererMock).toHaveBeenCalledWith(
      screen.getByTestId('game-viewport'),
      undefined,
      {
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
    );
  });

  it('preserves the last pointer client position when snapshots refresh during placement mode', () => {
    const { rerender } = render(
      <GameViewport
        hoveredTile={{ x: 4, y: 6 }}
        isPlacementModeEnabled
        regionSnapshot={{
          regionId: 'region-1',
          storage: { 'iron-plate': 3 },
          buildings: [],
          resourceNodes: [],
        }}
        onHoverTileChange={vi.fn()}
        onCancelPlacement={vi.fn()}
        onPlaceBuilding={vi.fn(() => false)}
      />,
    );

    const viewport = screen.getByTestId('game-viewport');

    fireEvent(
      viewport,
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 96,
        clientY: 64,
      }),
    );

    rerender(
      <GameViewport
        hoveredTile={{ x: 4, y: 6 }}
        isPlacementModeEnabled
        regionSnapshot={{
          regionId: 'region-1',
          storage: { 'iron-plate': 4 },
          buildings: [{ id: 'belt-1', type: 'belt', tile: { x: 8, y: 6 } }],
          resourceNodes: [],
        }}
        onHoverTileChange={vi.fn()}
        onCancelPlacement={vi.fn()}
        onPlaceBuilding={vi.fn(() => false)}
      />,
    );

    expect(createRendererMock).toHaveBeenLastCalledWith(
      viewport,
      expect.objectContaining({
        hoveredTile: { x: 4, y: 6 },
        lastPointerClientPosition: { clientX: 96, clientY: 64 },
      }),
      expect.objectContaining({
        storage: { 'iron-plate': 4 },
        buildings: [{ id: 'belt-1', type: 'belt', tile: { x: 8, y: 6 } }],
      }),
    );
  });
});