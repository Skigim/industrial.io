import Fastify from 'fastify';

import { registerRegionRoutes } from './routes/regions.js';
import { registerSessionRoutes } from './routes/session.js';

export const buildApiServer = () => {
  const app = Fastify();

  registerRegionRoutes(app);
  registerSessionRoutes(app);

  return app;
};