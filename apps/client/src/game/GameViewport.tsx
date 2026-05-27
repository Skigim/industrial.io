import { useEffect, useRef, type MouseEvent as ReactMouseEvent } from 'react';

import { createRenderer } from './renderer/createRenderer';
import type { PlacementTile } from './renderer/tileMath';
import type { VisibleRegionSnapshot } from './visibleWorld';

const viewportStyle = {
  position: 'absolute',
  inset: 0,
  overflow: 'auto',
  background:
    'radial-gradient(circle at top, rgba(54, 92, 132, 0.35), transparent 35%), linear-gradient(180deg, #08131f 0%, #101f30 100%)',
} as const;

type GameViewportProps = {
  hoveredTile: PlacementTile | null;
  isPlacementModeEnabled: boolean;
  regionSnapshot: VisibleRegionSnapshot | null;
  onHoverTileChange: (tile: PlacementTile | null) => void;
  onCancelPlacement: () => void;
  onPlaceBuilding: (tile: PlacementTile) => boolean;
};

export const GameViewport = ({
  hoveredTile,
  isPlacementModeEnabled,
  regionSnapshot,
  onHoverTileChange,
  onCancelPlacement,
  onPlaceBuilding,
}: GameViewportProps) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const hoveredTileRef = useRef<PlacementTile | null>(hoveredTile);
  const hoverChangeRef = useRef(onHoverTileChange);
  const lastPointerClientPositionRef = useRef<Pick<PointerEvent, 'clientX' | 'clientY'> | null>(null);

  useEffect(() => {
    hoveredTileRef.current = hoveredTile;
  }, [hoveredTile]);

  useEffect(() => {
    hoverChangeRef.current = onHoverTileChange;
  }, [onHoverTileChange]);

  useEffect(() => {
    if (!viewportRef.current) {
      return;
    }

    return createRenderer(
      viewportRef.current,
      isPlacementModeEnabled
        ? {
            hoveredTile: hoveredTileRef.current,
            lastPointerClientPosition: lastPointerClientPositionRef.current,
            onHoverTileChange: (tile) => {
              hoveredTileRef.current = tile;
              hoverChangeRef.current(tile);
            },
          }
        : undefined,
      regionSnapshot,
    );
  }, [isPlacementModeEnabled, regionSnapshot]);

  const handleClick = () => {
    const tile = hoveredTileRef.current;

    if (!isPlacementModeEnabled || tile === null) {
      return;
    }

    if (onPlaceBuilding(tile)) {
      hoveredTileRef.current = null;
      hoverChangeRef.current(null);
    }
  };

  const handlePointerMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    lastPointerClientPositionRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
    };
  };

  const handlePointerLeave = () => {
    lastPointerClientPositionRef.current = null;
  };

  const handleContextMenu = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!isPlacementModeEnabled) {
      return;
    }

    event.preventDefault();
    hoveredTileRef.current = null;
    onCancelPlacement();
  };

  return (
    <div
      data-testid="game-viewport"
      ref={viewportRef}
      style={viewportStyle}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    />
  );
};