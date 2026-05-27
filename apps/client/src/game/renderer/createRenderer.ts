const minimumWorldWidth = 1600;
const minimumWorldHeight = 1200;
const viewportScale = 2;

import { getTileFromPointer, tileSizePx, type PlacementTile } from './tileMath';
import type { VisibleRegionSnapshot } from '../visibleWorld';

export type RendererPlacementState = {
  hoveredTile: PlacementTile | null;
  lastPointerClientPosition?: Pick<PointerEvent, 'clientX' | 'clientY'> | null;
  onHoverTileChange?: (tile: PlacementTile | null) => void;
};

const sizeCanvas = (canvas: HTMLCanvasElement, container: HTMLDivElement): void => {
  const width = Math.max(Math.ceil(container.clientWidth * viewportScale), minimumWorldWidth);
  const height = Math.max(Math.ceil(container.clientHeight * viewportScale), minimumWorldHeight);

  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
};

const drawGrid = (context: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void => {
  context.strokeStyle = 'rgba(255, 255, 255, 0.08)';

  for (let y = 0; y < canvas.height; y += tileSizePx) {
    for (let x = 0; x < canvas.width; x += tileSizePx) {
      context.strokeRect(x, y, tileSizePx, tileSizePx);
    }
  }
};

const drawResourceNodes = (
  context: CanvasRenderingContext2D,
  regionSnapshot: VisibleRegionSnapshot | null | undefined,
): void => {
  if (!regionSnapshot) {
    return;
  }

  for (const resourceNode of regionSnapshot.resourceNodes) {
    context.fillStyle = resourceNode.resourceType === 'iron-ore'
      ? 'rgba(170, 92, 56, 0.65)'
      : 'rgba(138, 148, 166, 0.45)';

    for (const tile of resourceNode.tiles) {
      context.fillRect(tile.x * tileSizePx, tile.y * tileSizePx, tileSizePx, tileSizePx);
    }
  }
};

const drawBuildings = (
  context: CanvasRenderingContext2D,
  regionSnapshot: VisibleRegionSnapshot | null | undefined,
): void => {
  if (!regionSnapshot) {
    return;
  }

  for (const building of regionSnapshot.buildings) {
    context.fillStyle = building.type === 'site-anchor'
      ? 'rgba(111, 208, 255, 0.85)'
      : 'rgba(231, 196, 104, 0.8)';
    context.fillRect(
      building.tile.x * tileSizePx,
      building.tile.y * tileSizePx,
      tileSizePx,
      tileSizePx,
    );
  }
};

const drawHoverPreview = (
  context: CanvasRenderingContext2D,
  hoveredTile: PlacementTile | null,
): void => {
  if (!hoveredTile) {
    return;
  }

  context.fillStyle = 'rgba(111, 208, 255, 0.2)';
  context.fillRect(
    hoveredTile.x * tileSizePx,
    hoveredTile.y * tileSizePx,
    tileSizePx,
    tileSizePx,
  );
};

const areTilesEqual = (
  left: PlacementTile | null,
  right: PlacementTile | null,
): boolean => left?.x === right?.x && left?.y === right?.y;

export const createRenderer = (
  container: HTMLDivElement,
  placementState?: RendererPlacementState,
  _regionSnapshot?: VisibleRegionSnapshot | null,
): (() => void) => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  let activeHoveredTile = placementState?.hoveredTile ?? null;
  let lastPointerClientPosition = placementState?.lastPointerClientPosition ?? null;

  const render = () => {
    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(context, canvas);
    drawResourceNodes(context, _regionSnapshot);
    drawBuildings(context, _regionSnapshot);
    drawHoverPreview(context, activeHoveredTile);
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!placementState) {
      return;
    }

    lastPointerClientPosition = {
      clientX: event.clientX,
      clientY: event.clientY,
    };

    const nextHoveredTile = getTileFromPointer(container, event);

    if (areTilesEqual(activeHoveredTile, nextHoveredTile)) {
      return;
    }

    activeHoveredTile = nextHoveredTile;
    placementState.onHoverTileChange?.(nextHoveredTile);
    render();
  };

  const handlePointerLeave = () => {
    if (!placementState || activeHoveredTile === null) {
      lastPointerClientPosition = null;
      return;
    }

    lastPointerClientPosition = null;
    activeHoveredTile = null;
    placementState.onHoverTileChange?.(null);
    render();
  };

  const handleScroll = () => {
    if (!placementState || lastPointerClientPosition === null) {
      return;
    }

    const nextHoveredTile = getTileFromPointer(container, lastPointerClientPosition);

    if (areTilesEqual(activeHoveredTile, nextHoveredTile)) {
      return;
    }

    activeHoveredTile = nextHoveredTile;
    placementState.onHoverTileChange?.(nextHoveredTile);
    render();
  };

  canvas.setAttribute('aria-label', 'Factory viewport');
  canvas.style.display = 'block';

  container.replaceChildren(canvas);

  sizeCanvas(canvas, container);
  render();

  if (placementState) {
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerleave', handlePointerLeave);
    container.addEventListener('scroll', handleScroll);
  }

  const resizeObserver = typeof ResizeObserver === 'undefined'
    ? undefined
    : new ResizeObserver(() => {
        sizeCanvas(canvas, container);
        render();
      });

  resizeObserver?.observe(container);

  return () => {
    if (placementState) {
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
      container.removeEventListener('scroll', handleScroll);
    }
    resizeObserver?.disconnect();
    canvas.remove();
  };
};