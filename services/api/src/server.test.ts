import { describe, expect, it } from 'vitest';

import { buildApiServer } from './server';

describe('api server', () => {
  it('creates a guest session', async () => {
    const app = await buildApiServer();
    const response = await app.inject({ method: 'POST', url: '/api/session/guest' });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.playerId).toEqual(expect.any(String));
    expect(body.playerId.length).toBeGreaterThan(0);
    expect(body.sessionToken).toEqual(expect.any(String));
    expect(body.sessionToken.length).toBeGreaterThan(0);
    expect(body.regionId).toBe('starter-1');
  });

  it('lists the starter region', async () => {
    const app = await buildApiServer();
    const response = await app.inject({ method: 'GET', url: '/api/regions' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      { regionId: 'starter-1', displayName: 'Starter Basin', recommended: true },
    ]);
  });
});