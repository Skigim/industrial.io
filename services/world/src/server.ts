import websocket from '@fastify/websocket';
import Fastify from 'fastify';

import { clientMessageSchema } from '@industrial/contracts';

import { RegionManager, type JoinRegionRequest } from './region/RegionManager.js';
import type { RegionSnapshot } from './region/bootstrapStarterRegion.js';

export type WorldServer = {
  app: ReturnType<typeof Fastify>;
  joinRegion: (request: JoinRegionRequest) => Promise<RegionSnapshot>;
};

export const createWorldServer = async (): Promise<WorldServer> => {
  const app = Fastify();
  const regionManager = new RegionManager();

  await app.register(websocket);

  app.get('/health', async () => ({ ok: true }));

  app.get('/ws', { websocket: true }, (socket, request) => {
    const query = request.query as Partial<JoinRegionRequest>;
    let joinedRegionId = typeof query.regionId === 'string' ? query.regionId : undefined;

    const sendSnapshot = (snapshot: RegionSnapshot) => {
      socket.send(JSON.stringify({ type: 'region.snapshot', ...snapshot }));
    };

    if (joinedRegionId && typeof query.playerId === 'string') {
      sendSnapshot(regionManager.joinRegion({ regionId: joinedRegionId, playerId: query.playerId }));
    }

    const interval = setInterval(() => {
      if (!joinedRegionId) {
        return;
      }

      sendSnapshot(regionManager.tickRegion(joinedRegionId));
    }, 1000);

    socket.on('message', (rawMessage: Buffer) => {
      const parsed = clientMessageSchema.safeParse(JSON.parse(String(rawMessage)));

      if (!parsed.success) {
        return;
      }

      if (parsed.data.type === 'region.join') {
        joinedRegionId = parsed.data.regionId;
        sendSnapshot(regionManager.joinRegion(parsed.data));
        return;
      }

      sendSnapshot(regionManager.placeBuilding(parsed.data));
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
