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

type FakeCanvasContext = {
  clearRect: FakeCanvasMethod;
  strokeRect: FakeCanvasMethod;
  fillRect: FakeCanvasMethod;
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

  it('draws resource nodes and placed buildings on tile-aligned world coordinates beneath the hover preview', () => {
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
      { hoveredTile: { x: 4, y: 6 } },
      {
        regionId: 'region-1',
        storage: { 'iron-plate': 3 },
        buildings: [{ id: 'belt-1', type: 'belt', tile: { x: 3, y: 2 } }],
        resourceNodes: [
          {
            id: 'starter-iron-patch',
            resourceType: 'iron-ore',
            tiles: [{ x: 1, y: 1 }],
          },
        ],
      },
    );

    expect(context.fillRect).toHaveBeenNthCalledWith(1, 32, 32, 32, 32);
    expect(context.fillRect).toHaveBeenNthCalledWith(2, 96, 64, 32, 32);
    expect(context.fillRect).toHaveBeenNthCalledWith(3, 128, 192, 32, 32);

    cleanup();
  });
});