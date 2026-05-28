import type { FastifyInstance } from 'fastify';

const createSessionToken = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('');

export const registerSessionRoutes = (app: FastifyInstance): void => {
  app.post('/api/session/guest', async () => ({
    playerId: crypto.randomUUID(),
    sessionToken: createSessionToken(),
    regionId: `starter-${crypto.randomUUID()}`,
  }));
};