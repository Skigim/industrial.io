import type { FastifyInstance } from 'fastify';

export const registerSessionRoutes = (app: FastifyInstance): void => {
  app.post('/api/session/guest', async () => ({
    playerId: crypto.randomUUID(),
    sessionToken: crypto.randomUUID(),
    regionId: 'starter-1',
  }));
};