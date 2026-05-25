import type { FastifyInstance } from 'fastify';

export const registerRegionRoutes = (app: FastifyInstance): void => {
  app.get('/api/regions', async () => [
    { regionId: 'starter-1', displayName: 'Starter Basin', recommended: true },
  ]);
};