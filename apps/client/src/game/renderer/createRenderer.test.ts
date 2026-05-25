// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';

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

afterEach(() => {
  globalThis.ResizeObserver = originalResizeObserver;
  resizeCallback = undefined;
  document.body.innerHTML = '';
});

describe('createRenderer', () => {
  it('creates a scrollable world canvas that grows with the viewport', () => {
    globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;

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
});