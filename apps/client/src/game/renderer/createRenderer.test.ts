// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createRenderer } from './createRenderer';

let resizeCallback: ResizeObserverCallback | undefined;

class FakeResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    resizeCallback = callback;
  }

  observe(): void {}

  disconnect(): void {}
}

const originalResizeObserver = globalThis.ResizeObserver;

type FakeCanvasMethod = ReturnType<typeof vi.fn>;

type FillRectDraw = {
  fillStyle: string;
  args: [number, number, number, number];
};

type FakeCanvasContext = {
  clearRect: FakeCanvasMethod;
  strokeRect: FakeCanvasMethod;
  fillRect: FakeCanvasMethod;
  beginPath: FakeCanvasMethod;
  closePath: FakeCanvasMethod;
  moveTo: FakeCanvasMethod;
  lineTo: FakeCanvasMethod;
  arc: FakeCanvasMethod;
  rect: FakeCanvasMethod;
  fill: FakeCanvasMethod;
  stroke: FakeCanvasMethod;
  strokeStyle: string;
  fillStyle: string;
  lineWidth: number;
  fillRectDraws: FillRectDraw[];
};

const createCanvasContext = (): FakeCanvasContext => {
  const context: FakeCanvasContext = {
    clearRect: vi.fn(),
    strokeRect: vi.fn(),
    fillRect: vi.fn((x: number, y: number, width: number, height: number) => {
      context.fillRectDraws.push({
        fillStyle: context.fillStyle,
        args: [x, y, width, height],
      });
    }),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    fillRectDraws: [],
  };

  return context;
};

afterEach(() => {
  globalThis.ResizeObserver = originalResizeObserver;
  resizeCallback = undefined;
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('createRenderer', () => {
  it('creates a scrollable world canvas that grows with the viewport', () => {
    globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;

    const context = createCanvasContext();

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    );

    const container = document.createElement('div');
    let viewportWidth = 1200;
    let viewportHeight = 800;

    Object.defineProperty(container, 'clientWidth', {
      configurable: true,
      get: () => viewportWidth,
    });
    Object.defineProperty(container, 'clientHeight', {
      configurable: true,
      get: () => viewportHeight,
    });

    document.body.appendChild(container);

    const cleanup = createRenderer(container);
    const canvas = container.querySelector('canvas');

    expect(canvas).toBeInTheDocument();
    expect(canvas?.width).toBeGreaterThan(viewportWidth);
    expect(canvas?.height).toBeGreaterThan(viewportHeight);

    viewportWidth = 1600;
    viewportHeight = 900;
    resizeCallback?.([], {} as ResizeObserver);

    expect(canvas?.width).toBeGreaterThan(1600);
    expect(canvas?.height).toBeGreaterThan(900);

    cleanup();
  });

  it('draws a tile grid and reports tile-aligned hover state that clears on pointer leave', () => {
    globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;

    const context = createCanvasContext();

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    );

    const container = document.createElement('div');

    Object.defineProperty(container, 'clientWidth', {
      configurable: true,
      get: () => 160,
    });
    Object.defineProperty(container, 'clientHeight', {
      configurable: true,
      get: () => 96,
    });
    Object.defineProperty(container, 'scrollLeft', {
      configurable: true,
      value: 32,
      writable: true,
    });
    Object.defineProperty(container, 'scrollTop', {
      configurable: true,
      value: 64,
      writable: true,
    });

    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      left: 10,
      top: 20,
      right: 170,
      bottom: 116,
      width: 160,
      height: 96,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    } as DOMRect);

    document.body.appendChild(container);

    const hoveredTiles: Array<{ x: number; y: number } | null> = [];
    const placementState = {
      hoveredTile: null as { x: number; y: number } | null,
      onHoverTileChange(tile: { x: number; y: number } | null) {
        hoveredTiles.push(tile);
      },
    };

    const cleanup = createRenderer(container, placementState);

    expect(context.strokeRect).toHaveBeenCalledWith(0, 0, 32, 32);
    expect(container.querySelector('canvas')).toHaveAttribute('aria-label', 'Factory viewport');

    container.dispatchEvent(
      new MouseEvent('pointermove', {
        clientX: 113,
        clientY: 149,
      }),
    );

    expect(hoveredTiles.at(-1)).toEqual({ x: 4, y: 6 });
    expect(context.fillRect).toHaveBeenLastCalledWith(128, 192, 32, 32);

    const clearRectCallsAfterFirstHover = context.clearRect.mock.calls.length;

    container.dispatchEvent(
      new MouseEvent('pointermove', {
        clientX: 121,
        clientY: 151,
      }),
    );

    expect(hoveredTiles).toEqual([{ x: 4, y: 6 }]);
    expect(context.clearRect).toHaveBeenCalledTimes(clearRectCallsAfterFirstHover);

    container.dispatchEvent(new MouseEvent('pointerleave'));

    expect(hoveredTiles.at(-1)).toBeNull();

    const clearRectCallsAfterLeave = context.clearRect.mock.calls.length;

    container.dispatchEvent(new MouseEvent('pointerleave'));

    expect(hoveredTiles).toEqual([{ x: 4, y: 6 }, null]);
    expect(context.clearRect).toHaveBeenCalledTimes(clearRectCallsAfterLeave);

    cleanup();
  });

  it('recomputes the hovered tile when the container scrolls without another pointer move', () => {
    globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;

    const context = createCanvasContext();

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    );

    const container = document.createElement('div');

    Object.defineProperty(container, 'clientWidth', {
      configurable: true,
      get: () => 160,
    });
    Object.defineProperty(container, 'clientHeight', {
      configurable: true,
      get: () => 96,
    });
    Object.defineProperty(container, 'scrollLeft', {
      configurable: true,
      value: 0,
      writable: true,
    });
    Object.defineProperty(container, 'scrollTop', {
      configurable: true,
      value: 0,
      writable: true,
    });

    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 160,
      bottom: 96,
      width: 160,
      height: 96,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);

    document.body.appendChild(container);

    const hoveredTiles: Array<{ x: number; y: number } | null> = [];
    const placementState = {
      hoveredTile: null as { x: number; y: number } | null,
      onHoverTileChange(tile: { x: number; y: number } | null) {
        hoveredTiles.push(tile);
      },
    };

    const cleanup = createRenderer(container, placementState);

    container.dispatchEvent(
      new MouseEvent('pointermove', {
        clientX: 33,
        clientY: 33,
      }),
    );

    expect(hoveredTiles.at(-1)).toEqual({ x: 1, y: 1 });

    container.scrollLeft = 64;
    container.scrollTop = 32;
    container.dispatchEvent(new Event('scroll'));

    expect(hoveredTiles.at(-1)).toEqual({ x: 3, y: 2 });
    expect(context.fillRect).toHaveBeenLastCalledWith(96, 64, 32, 32);

    cleanup();
  });

  it('draws recognizable resource patches, top-down machines, belts, and cargo beneath the hover preview', () => {
    globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;

    const context = createCanvasContext();

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    );

    const container = document.createElement('div');

    Object.defineProperty(container, 'clientWidth', {
      configurable: true,
      get: () => 160,
    });
    Object.defineProperty(container, 'clientHeight', {
      configurable: true,
      get: () => 96,
    });

    document.body.appendChild(container);

    const cleanup = createRenderer(
      container,
      { hoveredTile: { x: 14, y: 6 } },
      {
        regionId: 'region-1',
        storage: { coal: 4, 'iron-ore': 0, 'iron-ingot': 0, 'construction-part': 3 },
        buildings: [
          { id: 'site-anchor-1', type: 'site-anchor', tile: { x: 11, y: 6 }, status: 'running' },
          { id: 'miner-1', type: 'miner', tile: { x: 12, y: 6 }, status: 'running' },
          { id: 'smelter-1', type: 'smelter', tile: { x: 13, y: 6 }, status: 'running' },
          { id: 'constructor-1', type: 'constructor', tile: { x: 15, y: 6 }, status: 'blocked' },
          { id: 'storage-1', type: 'storage', tile: { x: 17, y: 6 }, status: 'idle' },
        ],
        belts: [{ id: 'belt-3', tile: { x: 16, y: 6 }, itemId: 'construction-part' }],
        resourceNodes: [
          {
            id: 'starter-iron-patch',
            resourceType: 'iron-ore',
            tiles: [{ x: 10, y: 6 }],
          },
        ],
        scenario: { current: 3, target: 10, isComplete: false },
      },
    );

    expect(context.fillRectDraws).toContainEqual({
      fillStyle: '#141a20',
      args: [320, 192, 32, 32],
    });
    expect(context.fillRectDraws).toContainEqual({
      fillStyle: '#26323d',
      args: [514, 204, 28, 8],
    });
    expect(context.arc).toHaveBeenCalledWith(400, 208, 7, 0, Math.PI * 2);
    expect(context.arc).toHaveBeenCalledWith(432, 208, 7, 0, Math.PI * 2);
    expect(context.arc).toHaveBeenCalledWith(528, 208, 6, 0, Math.PI * 2);
    expect(context.rect).toHaveBeenCalledWith(488, 200, 16, 16);
    expect(context.lineTo).toHaveBeenCalledWith(523, 198);
    expect(context.fillRectDraws.at(-1)).toEqual({
      fillStyle: 'rgba(111, 208, 255, 0.2)',
      args: [448, 192, 32, 32],
    });

    cleanup();
  });

  it('draws an obvious marker on the unrepaired starter belt gap', () => {
    const context = createCanvasContext();

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    );

    const container = document.createElement('div');

    Object.defineProperty(container, 'clientWidth', {
      configurable: true,
      get: () => 640,
    });
    Object.defineProperty(container, 'clientHeight', {
      configurable: true,
      get: () => 480,
    });

    document.body.appendChild(container);

    const cleanup = createRenderer(container, undefined, {
      regionId: 'region-1',
      storage: {},
      buildings: [],
      belts: [],
      resourceNodes: [],
      scenario: {
        current: 0,
        target: 10,
        isComplete: false,
        repair: {
          buildingType: 'belt',
          tile: { x: 14, y: 6 },
          isPlaced: false,
        },
      },
    });

    expect(context.fillRectDraws).toContainEqual({
      fillStyle: 'rgba(255, 215, 94, 0.28)',
      args: [448, 192, 32, 32],
    });

    cleanup();
  });
});