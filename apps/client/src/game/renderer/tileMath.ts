export const tileSizePx = 32;

export type PlacementTile = {
  x: number;
  y: number;
};

type TilePointerEvent = Pick<PointerEvent, 'clientX' | 'clientY'>;

export const getTileFromPointer = (
  container: Pick<HTMLDivElement, 'getBoundingClientRect' | 'scrollLeft' | 'scrollTop'>,
  event: TilePointerEvent,
): PlacementTile => {
  const rect = container.getBoundingClientRect();

  return {
    x: Math.max(0, Math.floor((event.clientX - rect.left + container.scrollLeft) / tileSizePx)),
    y: Math.max(0, Math.floor((event.clientY - rect.top + container.scrollTop) / tileSizePx)),
  };
};