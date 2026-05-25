import Fastify from 'fastify';

import { registerRegionRoutes } from './routes/regions.js';
import { registerSessionRoutes } from './routes/session.js';

export const buildApiServer = () => {
  const app = Fastify();

  registerRegionRoutes(app);
  registerSessionRoutes(app);

  return app;
};

export const startApiServer = async (): Promise<void> => {
  const app = buildApiServer();
  const host = process.env.HOST ?? '127.0.0.1';
  const port = Number(process.env.PORT ?? '3001');

  await app.listen({ host, port });
};
