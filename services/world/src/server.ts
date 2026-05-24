import websocket from '@fastify/websocket';
import Fastify from 'fastify';

import { RegionManager } from './region/RegionManager';
import type { RegionSnapshot } from './region/bootstrapStarterRegion';

type JoinRegionRequest = {
  regionId: string;
  playerId: string;
};

export type WorldServer = {
  app: ReturnType<typeof Fastify>;
  joinRegion: (request: JoinRegionRequest) => Promise<RegionSnapshot>;
};

export const createWorldServer = async (): Promise<WorldServer> => {
  const app = Fastify();
  const regionManager = new RegionManager();

  await app.register(websocket);

  app.get('/health', async () => ({ ok: true }));

  return {
    app,
    joinRegion: async (request: JoinRegionRequest) => regionManager.joinRegion(request),
  };
};