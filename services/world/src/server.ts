import websocket from '@fastify/websocket';
import Fastify from 'fastify';

import { clientMessageSchema } from '@industrial/contracts';

import { RegionManager, type JoinRegionRequest } from './region/RegionManager.js';
import type { RegionSnapshot } from './region/bootstrapStarterRegion.js';

export type WorldServer = {
  app: ReturnType<typeof Fastify>;
  joinRegion: (request: JoinRegionRequest) => Promise<RegionSnapshot>;
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

export const createWorldServer = async (): Promise<WorldServer> => {
  const app = Fastify();
  const regionManager = new RegionManager();

  await app.register(websocket);

  app.get('/health', async () => ({ ok: true }));

  app.get('/ws', { websocket: true }, (socket, request) => {
    const joinRequest = readJoinRegionRequest(request.query);
    let joinedRegionId = joinRequest?.regionId;

    const sendSnapshot = (snapshot: RegionSnapshot) => {
      socket.send(JSON.stringify({ type: 'region.snapshot', ...snapshot }));
    };

    if (joinRequest) {
      sendSnapshot(regionManager.joinRegion(joinRequest));
    }

    const interval = setInterval(() => {
      if (!joinedRegionId) {
        return;
      }

      sendSnapshot(regionManager.tickRegion(joinedRegionId));
    }, 1000);

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
        joinedRegionId = parsed.data.regionId;
        sendSnapshot(regionManager.joinRegion(parsed.data));
        return;
      }

      if (parsed.data.type === 'build.place') {
        sendSnapshot(regionManager.placeBuilding(parsed.data));
      }
    });

    socket.on('close', () => {
      clearInterval(interval);
    });
  });

  return {
    app,
    joinRegion: async (request: JoinRegionRequest) => regionManager.joinRegion(request),
  };
};

export const startWorldServer = async (): Promise<void> => {
  const server = await createWorldServer();
  const host = process.env.HOST ?? '127.0.0.1';
  const port = Number(process.env.PORT ?? '3002');

  await server.app.listen({ host, port });
};
