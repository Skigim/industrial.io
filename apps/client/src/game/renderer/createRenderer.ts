const minimumWorldWidth = 1600;
const minimumWorldHeight = 1200;
const viewportScale = 2;

import { getTileFromPointer, tileSizePx, type PlacementTile } from './tileMath';
import type { VisibleRegionSnapshot } from '../visibleWorld';

const itemColors: Record<string, string> = {
  'iron-ore': '#c77a4f',
  'iron-ingot': '#cfd6dc',
  'construction-part': '#f2cb62',
};

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
  context.strokeStyle = 'rgba(157, 183, 204, 0.11)';

  for (let y = 0; y < canvas.height; y += tileSizePx) {
    for (let x = 0; x < canvas.width; x += tileSizePx) {
      context.strokeRect(x, y, tileSizePx, tileSizePx);
    }
  }
};

const fillCircle = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  fillStyle: string,
): void => {
  context.beginPath();
  context.fillStyle = fillStyle;
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
};

const strokeCircle = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  strokeStyle: string,
  lineWidth: number,
): void => {
  context.beginPath();
  context.strokeStyle = strokeStyle;
  context.lineWidth = lineWidth;
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.stroke();
};

const fillPath = (
  context: CanvasRenderingContext2D,
  fillStyle: string,
  draw: () => void,
): void => {
  context.beginPath();
  context.fillStyle = fillStyle;
  draw();
  context.closePath();
  context.fill();
};

const drawTilePlate = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  fillStyle: string,
  strokeStyle: string,
): void => {
  context.fillStyle = fillStyle;
  context.fillRect(x + 3, y + 3, tileSizePx - 6, tileSizePx - 6);
  context.strokeStyle = strokeStyle;
  context.lineWidth = 2;
  context.strokeRect(x + 3, y + 3, tileSizePx - 6, tileSizePx - 6);
};

const drawOrePatch = (context: CanvasRenderingContext2D, x: number, y: number): void => {
  context.fillStyle = '#141a20';
  context.fillRect(x, y, tileSizePx, tileSizePx);

  fillPath(context, '#7b4a36', () => {
    context.moveTo(x + 4, y + 19);
    context.lineTo(x + 11, y + 7);
    context.lineTo(x + 25, y + 5);
    context.lineTo(x + 30, y + 17);
    context.lineTo(x + 23, y + 29);
    context.lineTo(x + 9, y + 27);
  });
  fillPath(context, '#c77a4f', () => {
    context.moveTo(x + 11, y + 18);
    context.lineTo(x + 17, y + 10);
    context.lineTo(x + 24, y + 17);
    context.lineTo(x + 20, y + 25);
    context.lineTo(x + 12, y + 24);
  });
};

const drawSiteAnchor = (context: CanvasRenderingContext2D, x: number, y: number): void => {
  drawTilePlate(context, x, y, '#173243', '#6fd0ff');
  context.strokeStyle = '#d7f2ff';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(x + 16, y + 7);
  context.lineTo(x + 25, y + 25);
  context.lineTo(x + 7, y + 25);
  context.closePath();
  context.stroke();
  fillCircle(context, x + 16, y + 16, 4, '#d7f2ff');
};

const drawMiner = (context: CanvasRenderingContext2D, x: number, y: number): void => {
  drawTilePlate(context, x, y, '#213c2d', '#78c36d');
  context.fillStyle = '#365a44';
  context.fillRect(x + 9, y + 9, 18, 14);
  strokeCircle(context, x + 16, y + 16, 7, '#d7e3ea', 3);
  context.strokeStyle = '#d7e3ea';
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(x + 16, y + 9);
  context.lineTo(x + 16, y + 23);
  context.moveTo(x + 9, y + 16);
  context.lineTo(x + 23, y + 16);
  context.stroke();
  fillPath(context, '#d7e3ea', () => {
    context.moveTo(x + 5, y + 16);
    context.lineTo(x - 2, y + 10);
    context.lineTo(x - 2, y + 22);
  });
  context.fillStyle = '#9fb3c1';
  context.fillRect(x + 24, y + 12, 6, 8);
};

const drawSmelter = (context: CanvasRenderingContext2D, x: number, y: number): void => {
  drawTilePlate(context, x, y, '#4b302b', '#d98455');
  context.fillStyle = '#332320';
  context.fillRect(x + 8, y + 8, 16, 16);
  strokeCircle(context, x + 16, y + 16, 7, '#ffb466', 2);
  fillCircle(context, x + 16, y + 16, 5, '#ff8c3c');
  fillCircle(context, x + 16, y + 16, 2, '#ffe06f');
  context.fillStyle = '#687581';
  context.fillRect(x + 10, y + 3, 12, 4);
  context.fillStyle = '#f2b263';
  context.fillRect(x + 24, y + 13, 8, 6);
};

const drawConstructor = (context: CanvasRenderingContext2D, x: number, y: number): void => {
  drawTilePlate(context, x, y, '#4a431f', '#e8c54f');
  context.fillStyle = '#665a2c';
  context.fillRect(x + 8, y + 8, 16, 16);
  context.beginPath();
  context.rect(x + 8, y + 8, 16, 16);
  context.strokeStyle = '#fff1b8';
  context.lineWidth = 1.5;
  context.stroke();
  context.fillStyle = '#222a31';
  context.fillRect(x + 11, y + 11, 10, 10);
  context.strokeStyle = '#d1d8de';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x + 9, y + 10);
  context.lineTo(x + 3, y + 4);
  context.moveTo(x + 23, y + 10);
  context.lineTo(x + 29, y + 4);
  context.moveTo(x + 9, y + 23);
  context.lineTo(x + 3, y + 29);
  context.moveTo(x + 23, y + 23);
  context.lineTo(x + 29, y + 29);
  context.stroke();
  context.fillStyle = '#f8d864';
  context.fillRect(x + 24, y + 13, 8, 6);
};

const drawStorage = (context: CanvasRenderingContext2D, x: number, y: number): void => {
  drawTilePlate(context, x, y, '#303d4b', '#adc2d4');
  context.fillStyle = '#22303b';
  context.fillRect(x + 7, y + 7, 18, 18);
  context.strokeStyle = '#d7e6f1';
  context.lineWidth = 1.5;
  context.strokeRect(x + 7, y + 7, 18, 18);
  context.fillStyle = '#8a704a';
  context.fillRect(x + 9, y + 9, 7, 6);
  context.fillStyle = '#91764f';
  context.fillRect(x + 17, y + 9, 7, 6);
  context.fillStyle = '#7e6544';
  context.fillRect(x + 13, y + 17, 8, 7);
  context.fillStyle = '#bcd0df';
  context.fillRect(x + 24, y + 13, 8, 6);
};

const drawBuilding = (
  context: CanvasRenderingContext2D,
  type: string,
  tile: PlacementTile,
): void => {
  const x = tile.x * tileSizePx;
  const y = tile.y * tileSizePx;

  if (type === 'site-anchor') {
    drawSiteAnchor(context, x, y);
    return;
  }

  if (type === 'miner') {
    drawMiner(context, x, y);
    return;
  }

  if (type === 'smelter') {
    drawSmelter(context, x, y);
    return;
  }

  if (type === 'constructor') {
    drawConstructor(context, x, y);
    return;
  }

  if (type === 'storage') {
    drawStorage(context, x, y);
    return;
  }

  drawTilePlate(context, x, y, '#35414d', '#aebdcc');
};

const drawResourceNodes = (
  context: CanvasRenderingContext2D,
  regionSnapshot: VisibleRegionSnapshot | null | undefined,
): void => {
  if (!regionSnapshot) {
    return;
  }

  for (const resourceNode of regionSnapshot.resourceNodes) {
    for (const tile of resourceNode.tiles) {
      if (resourceNode.resourceType === 'iron-ore') {
        drawOrePatch(context, tile.x * tileSizePx, tile.y * tileSizePx);
      } else {
        context.fillStyle = '#28313a';
        context.fillRect(tile.x * tileSizePx, tile.y * tileSizePx, tileSizePx, tileSizePx);
      }
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
    drawBuilding(context, building.type, building.tile);
  }
};

const drawCargo = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  itemId: string,
): void => {
  const color = itemColors[itemId] ?? '#f5f7fa';

  if (itemId === 'iron-ingot') {
    context.fillStyle = color;
    context.fillRect(x + 10, y + 11, 12, 10);
    context.strokeStyle = '#eef3f7';
    context.lineWidth = 1;
    context.strokeRect(x + 10, y + 11, 12, 10);
    return;
  }

  if (itemId === 'iron-ore') {
    fillPath(context, color, () => {
      context.moveTo(x + 10, y + 14);
      context.lineTo(x + 16, y + 9);
      context.lineTo(x + 23, y + 14);
      context.lineTo(x + 20, y + 23);
      context.lineTo(x + 12, y + 22);
    });
    return;
  }

  fillCircle(context, x + 16, y + 16, 6, color);
  strokeCircle(context, x + 16, y + 16, 6, '#ffeaa1', 2);
};

const drawBelt = (
  context: CanvasRenderingContext2D,
  tile: PlacementTile,
  itemId: string | null,
): void => {
  const x = tile.x * tileSizePx;
  const y = tile.y * tileSizePx;

  context.fillStyle = '#1a222a';
  context.fillRect(x + 1, y + 1, tileSizePx - 2, tileSizePx - 2);
  context.strokeStyle = '#8fa1b3';
  context.lineWidth = 2;
  context.strokeRect(x + 1, y + 1, tileSizePx - 2, tileSizePx - 2);

  context.fillStyle = '#26323d';
  context.fillRect(x + 2, y + 12, tileSizePx - 4, 8);

  context.strokeStyle = '#d7e0e7';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x + 6, y + 16);
  context.lineTo(x + 12, y + 16);
  context.moveTo(x + 17, y + 16);
  context.lineTo(x + 23, y + 16);
  context.stroke();

  fillPath(context, '#d7e0e7', () => {
    context.moveTo(x + 23, y + 16);
    context.lineTo(x + 11, y + 6);
    context.lineTo(x + 11, y + 26);
  });

  if (itemId) {
    drawCargo(context, x, y, itemId);
  }
};

const drawBelts = (
  context: CanvasRenderingContext2D,
  regionSnapshot: VisibleRegionSnapshot | null | undefined,
): void => {
  if (!regionSnapshot) {
    return;
  }

  for (const belt of regionSnapshot.belts) {
    drawBelt(context, belt.tile, belt.itemId);
  }
};

const drawRepairTarget = (
  context: CanvasRenderingContext2D,
  regionSnapshot: VisibleRegionSnapshot | null | undefined,
): void => {
  const repair = regionSnapshot?.scenario.repair;

  if (!repair || repair.isPlaced) {
    return;
  }

  const x = repair.tile.x * tileSizePx;
  const y = repair.tile.y * tileSizePx;

  context.fillStyle = 'rgba(255, 215, 94, 0.28)';
  context.fillRect(x, y, tileSizePx, tileSizePx);
  context.strokeStyle = '#ffd75e';
  context.lineWidth = 3;
  context.strokeRect(x + 2, y + 2, tileSizePx - 4, tileSizePx - 4);
  context.fillStyle = '#ffd75e';
  context.fillRect(x + 6, y + 14, tileSizePx - 12, 4);
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
    drawBelts(context, _regionSnapshot);
    drawRepairTarget(context, _regionSnapshot);
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