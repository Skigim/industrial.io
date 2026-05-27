import { useEffect, useMemo, useRef, useState } from 'react';

import { WorldConnection } from './game/runtime/WorldConnection';
import { GameViewport } from './game/GameViewport';
import type { PlacementTile } from './game/renderer/tileMath';
import type { VisibleRegionSnapshot } from './game/visibleWorld';
import { Hud } from './ui/Hud';
import { BuildPanel } from './ui/BuildPanel';

const appShellStyle = {
  position: 'relative',
  height: '100vh',
  overflow: 'hidden',
} as const;

const overlayStyle = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  padding: '16px',
  pointerEvents: 'none',
} as const;

const overlayPanelStyle = {
  pointerEvents: 'auto',
} as const;

type GuestSession = {
  playerId: string;
  regionId: string;
};

type BuildingType = 'site-anchor' | 'burner-generator' | 'miner' | 'belt' | 'smelter' | 'storage';

type PendingBuild = {
  buildingType: BuildingType;
  tile: PlacementTile;
};

type RegionSnapshotMessage = VisibleRegionSnapshot & {
  type: 'region.snapshot';
};

type PlacementRejectedMessage = {
  type: 'build.place.rejected';
  buildingType: BuildingType;
  tile: PlacementTile;
  reason: string;
};

const isPlacementTile = (value: unknown): value is PlacementTile => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as { x?: unknown; y?: unknown };

  return Number.isInteger(candidate.x) && Number.isInteger(candidate.y);
};

const isRegionSnapshotMessage = (value: unknown): value is RegionSnapshotMessage => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as {
    type?: unknown;
    regionId?: unknown;
    storage?: unknown;
    buildings?: unknown;
    resourceNodes?: unknown;
  };

  if (
    candidate.type !== 'region.snapshot'
    || typeof candidate.regionId !== 'string'
    || !candidate.storage
    || typeof candidate.storage !== 'object'
    || !Array.isArray(candidate.buildings)
    || !Array.isArray(candidate.resourceNodes)
  ) {
    return false;
  }

  const storage = candidate.storage as Record<string, unknown>;

  if (Object.values(storage).some((entry) => typeof entry !== 'number')) {
    return false;
  }

  const buildingsAreValid = candidate.buildings.every((building) => {
    if (!building || typeof building !== 'object') {
      return false;
    }

    const candidateBuilding = building as {
      id?: unknown;
      type?: unknown;
      tile?: unknown;
    };

    return typeof candidateBuilding.id === 'string'
      && typeof candidateBuilding.type === 'string'
      && isPlacementTile(candidateBuilding.tile);
  });

  if (!buildingsAreValid) {
    return false;
  }

  return candidate.resourceNodes.every((resourceNode) => {
    if (!resourceNode || typeof resourceNode !== 'object') {
      return false;
    }

    const candidateResourceNode = resourceNode as {
      id?: unknown;
      resourceType?: unknown;
      tiles?: unknown;
    };

    return typeof candidateResourceNode.id === 'string'
      && typeof candidateResourceNode.resourceType === 'string'
      && Array.isArray(candidateResourceNode.tiles)
      && candidateResourceNode.tiles.every(isPlacementTile);
  });
};

const isPlacementRejectedMessage = (value: unknown): value is PlacementRejectedMessage => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as {
    type?: unknown;
    buildingType?: unknown;
    tile?: unknown;
    reason?: unknown;
  };

  return candidate.type === 'build.place.rejected'
    && typeof candidate.buildingType === 'string'
    && isPlacementTile(candidate.tile)
    && typeof candidate.reason === 'string';
};

const areTilesEqual = (left: PlacementTile, right: PlacementTile): boolean => (
  left.x === right.x && left.y === right.y
);

export const App = () => {
  const [session, setSession] = useState<GuestSession | null>(null);
  const [ironPlateCount, setIronPlateCount] = useState(0);
  const [regionSnapshot, setRegionSnapshot] = useState<VisibleRegionSnapshot | null>(null);
  const [armedBuildingType, setArmedBuildingType] = useState<BuildingType | null>(null);
  const [hoveredTile, setHoveredTile] = useState<PlacementTile | null>(null);
  const worldConnection = useMemo(() => new WorldConnection(), []);
  const socketRef = useRef<WebSocket | null>(null);
  const pendingBuildsRef = useRef<PendingBuild[]>([]);
  const pendingPlacementRef = useRef<PendingBuild | null>(null);

  useEffect(() => {
    let cancelled = false;

    const bootstrapWorld = async () => {
      try {
        const response = await fetch('/api/session/guest', { method: 'POST' });

        if (!response.ok) {
          return;
        }

        const nextSession = (await response.json()) as GuestSession;

        if (cancelled) {
          return;
        }

        setSession(nextSession);

        const socket = worldConnection.connect(nextSession.regionId, nextSession.playerId);
        socketRef.current = socket;

        socket.addEventListener('open', () => {
          worldConnection.joinRegion(socket, nextSession.regionId, nextSession.playerId);

          const failedBuilds: PendingBuild[] = [];

          for (const pendingBuild of pendingBuildsRef.current) {
            try {
              worldConnection.placeBuilding(
                socket,
                nextSession.regionId,
                nextSession.playerId,
                pendingBuild.buildingType,
                pendingBuild.tile,
              );
            } catch (error) {
              console.error('Failed to replay pending build request.', error);
              failedBuilds.push(pendingBuild);
            }
          }

          pendingBuildsRef.current = failedBuilds;
        });

        socket.addEventListener('message', (event) => {
          try {
            const message = JSON.parse(String(event.data)) as unknown;

            if (isPlacementRejectedMessage(message)) {
              if (
                pendingPlacementRef.current
                && pendingPlacementRef.current.buildingType === message.buildingType
                && areTilesEqual(pendingPlacementRef.current.tile, message.tile)
              ) {
                pendingPlacementRef.current = null;
                setArmedBuildingType(message.buildingType);
                setHoveredTile(message.tile);
              }

              console.warn('Rejected build placement.', message.reason);
              return;
            }

            if (!isRegionSnapshotMessage(message)) {
              console.warn('Ignored unexpected world message.', message);
              return;
            }

            setRegionSnapshot({
              regionId: message.regionId,
              storage: message.storage,
              buildings: message.buildings,
              resourceNodes: message.resourceNodes,
            });
            setIronPlateCount(message.storage['iron-plate'] ?? 0);

            if (
              pendingPlacementRef.current
              && message.buildings.some((building) => (
                building.type === pendingPlacementRef.current?.buildingType
                && areTilesEqual(building.tile, pendingPlacementRef.current.tile)
              ))
            ) {
              pendingPlacementRef.current = null;
              setArmedBuildingType(null);
              setHoveredTile(null);
            }
          } catch (error) {
            console.error('Failed to parse world message.', error);
          }
        });
      } catch {
        // Keep the shell renderable in tests and when backend services are not running yet.
      }
    };

    void bootstrapWorld();

    return () => {
      cancelled = true;
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [worldConnection]);

  const handleArmBuild = (buildingType: BuildingType) => {
    setArmedBuildingType(buildingType);
  };

  const handleCancelBuild = () => {
    pendingPlacementRef.current = null;
    setArmedBuildingType(null);
    setHoveredTile(null);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCancelBuild();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleCancelBuild]);

  const handlePlaceBuilding = (tile: PlacementTile): boolean => {
    if (!session || !socketRef.current || !armedBuildingType || pendingPlacementRef.current) {
      return false;
    }

    try {
      pendingPlacementRef.current = {
        buildingType: armedBuildingType,
        tile,
      };
      worldConnection.placeBuilding(
        socketRef.current,
        session.regionId,
        session.playerId,
        armedBuildingType,
        tile,
      );
      return true;
    } catch (error) {
      pendingPlacementRef.current = null;
      console.error('Failed to place build request.', error);
      return false;
    }
  };

  return (
    <main style={appShellStyle}>
      <GameViewport
        hoveredTile={hoveredTile}
        isPlacementModeEnabled={armedBuildingType !== null}
        regionSnapshot={regionSnapshot}
        onHoverTileChange={setHoveredTile}
        onCancelPlacement={handleCancelBuild}
        onPlaceBuilding={handlePlaceBuilding}
      />
      <div data-testid="ui-overlay" style={overlayStyle}>
        <div style={overlayPanelStyle}>
          <Hud ironPlateCount={ironPlateCount} />
        </div>
        <div style={overlayPanelStyle}>
          <BuildPanel
            armedBuildingType={armedBuildingType}
            onArm={handleArmBuild}
            onCancel={handleCancelBuild}
          />
        </div>
      </div>
    </main>
  );
};