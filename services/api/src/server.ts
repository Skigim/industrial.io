import Fastify from 'fastify';

import { registerRegionRoutes } from './routes/regions';
import { registerSessionRoutes } from './routes/session';

export const buildApiServer = () => {
  const app = Fastify();

  registerRegionRoutes(app);
  registerSessionRoutes(app);

  return app;
};