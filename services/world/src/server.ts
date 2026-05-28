import websocket from '@fastify/websocket';
import Fastify from 'fastify';

import { clientMessageSchema } from '@industrial/contracts';

import { RegionManager, type JoinRegionRequest } from './region/RegionManager.js';
import type { RegionSnapshot } from './region/bootstrapStarterRegion.js';

const liveTickIntervalMs = 1000;

export type WorldServer = {
  app: ReturnType<typeof Fastify>;
  joinRegion: (request: JoinRegionRequest) => Promise<RegionSnapshot>;
  getActiveRegionCount: () => number;
};

export type CreateWorldServerOptions = {
  liveSimulationSpeedMultiplier?: number;
};

const readJoinRegionRequest = (query: unknown): JoinRegionRequest | null => {
  if (!query || typeof query !== 'object') {
    return null;
  }

  const candidate = query as {
    regionId?: unknown;
    playerId?: unknown;
  };

  if (typeof candidate.regionId !== 'string' || typeof candidate.playerId !== 'string') {
    return null;
  }

  return {
    regionId: candidate.regionId,
    playerId: candidate.playerId,
  };
};

export const createWorldServer = async (
  options: CreateWorldServerOptions = {},
): Promise<WorldServer> => {
  const app = Fastify();
  const regionManager = new RegionManager();
  const regionConnectionCounts = new Map<string, number>();
  const liveSimulationSpeedMultiplier = options.liveSimulationSpeedMultiplier ?? 1;

  const retainRegion = (regionId: string) => {
    regionConnectionCounts.set(regionId, (regionConnectionCounts.get(regionId) ?? 0) + 1);
  };

  const releaseRegion = (regionId: string) => {
    const nextCount = (regionConnectionCounts.get(regionId) ?? 1) - 1;

    if (nextCount > 0) {
      regionConnectionCounts.set(regionId, nextCount);
      return;
    }

    regionConnectionCounts.delete(regionId);
    regionManager.deleteRegion(regionId);
  };

  await app.register(websocket);

  app.get('/health', async () => ({ ok: true }));

  app.get('/ws', { websocket: true }, (socket, request) => {
    const joinRequest = readJoinRegionRequest(request.query);
    let joinedRegionId: string | undefined;
    let retainedRegionId: string | undefined;

    const sendSnapshot = (snapshot: RegionSnapshot) => {
      socket.send(JSON.stringify({ type: 'region.snapshot', ...snapshot }));
    };

    const sendPlacementRejected = (
      buildingType: string,
      tile: { x: number; y: number },
      reason: string,
    ) => {
      socket.send(JSON.stringify({
        type: 'build.place.rejected',
        buildingType,
        tile,
        reason,
      }));
    };

    const joinRegion = (nextJoinRequest: JoinRegionRequest) => {
      if (retainedRegionId !== nextJoinRequest.regionId) {
        if (retainedRegionId) {
          releaseRegion(retainedRegionId);
        }

        retainRegion(nextJoinRequest.regionId);
        retainedRegionId = nextJoinRequest.regionId;
      }

      joinedRegionId = nextJoinRequest.regionId;
      sendSnapshot(regionManager.joinRegion(nextJoinRequest));
    };

    if (joinRequest) {
      joinRegion(joinRequest);
    }

    const interval = setInterval(() => {
      if (!joinedRegionId) {
        return;
      }

      sendSnapshot(
        regionManager.tickRegion(
          joinedRegionId,
          liveSimulationSpeedMultiplier === 1
            ? undefined
            : liveTickIntervalMs * liveSimulationSpeedMultiplier,
        ),
      );
    }, liveTickIntervalMs);

    socket.on('message', (rawMessage: Buffer) => {
      let message: unknown;

      try {
        message = JSON.parse(String(rawMessage));
      } catch (error) {
        console.error('Failed to parse world client message.', error);
        return;
      }

      const parsed = clientMessageSchema.safeParse(message);

      if (!parsed.success) {
        return;
      }

      if (parsed.data.type === 'region.join') {
        joinRegion(parsed.data);
        return;
      }

      if (parsed.data.type === 'build.place') {
        if (parsed.data.regionId !== joinedRegionId) {
          sendPlacementRejected(
            parsed.data.buildingType,
            parsed.data.tile,
            'Build placement region does not match the joined region.',
          );
          return;
        }

        try {
          sendSnapshot(regionManager.placeBuilding(parsed.data));
        } catch (error) {
          console.error('Failed to place building from websocket message.', error);
          sendPlacementRejected(
            parsed.data.buildingType,
            parsed.data.tile,
            error instanceof Error ? error.message : 'Failed to place building.',
          );
          return;
        }
      }
    });

    socket.on('close', () => {
      clearInterval(interval);

      if (retainedRegionId) {
        releaseRegion(retainedRegionId);
        retainedRegionId = undefined;
      }
    });
  });

  return {
    app,
    joinRegion: async (request: JoinRegionRequest) => regionManager.joinRegion(request),
    getActiveRegionCount: () => regionManager.getActiveRegionCount(),
  };
};

export const startWorldServer = async (
  options: CreateWorldServerOptions = {},
): Promise<void> => {
  const server = await createWorldServer(options);
  const host = process.env.HOST ?? '127.0.0.1';
  const port = Number(process.env.PORT ?? '3002');

  await server.app.listen({ host, port });
};
