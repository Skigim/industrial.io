import { useEffect, useMemo, useRef, useState } from 'react';

import { WorldConnection } from './game/runtime/WorldConnection';
import { GameViewport } from './game/GameViewport';
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

type RegionSnapshotMessage = {
  type: 'region.snapshot';
  storage: {
    'iron-plate': number;
  };
};

export const App = () => {
  const [session, setSession] = useState<GuestSession | null>(null);
  const [ironPlateCount, setIronPlateCount] = useState(0);
  const worldConnection = useMemo(() => new WorldConnection(), []);
  const socketRef = useRef<WebSocket | null>(null);
  const pendingBuildsRef = useRef<BuildingType[]>([]);

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

          for (const buildingType of pendingBuildsRef.current) {
            worldConnection.placeBuilding(socket, nextSession.regionId, nextSession.playerId, buildingType);
          }

          pendingBuildsRef.current = [];
        });

        socket.addEventListener('message', (event) => {
          const message = JSON.parse(String(event.data)) as RegionSnapshotMessage;

          if (message.type === 'region.snapshot') {
            setIronPlateCount(message.storage['iron-plate'] ?? 0);
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

  const handleBuild = (buildingType: BuildingType) => {
    if (!session || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      pendingBuildsRef.current.push(buildingType);
      return;
    }

    worldConnection.placeBuilding(socketRef.current, session.regionId, session.playerId, buildingType);
  };

  return (
    <main style={appShellStyle}>
      <GameViewport />
      <div data-testid="ui-overlay" style={overlayStyle}>
        <div style={overlayPanelStyle}>
          <Hud ironPlateCount={ironPlateCount} />
        </div>
        <div style={overlayPanelStyle}>
          <BuildPanel onBuild={handleBuild} />
        </div>
      </div>
    </main>
  );
};