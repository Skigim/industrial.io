import { afterEach, describe, expect, it } from 'vitest';

import { buildApiServer } from './server';

describe('api server', () => {
  let app: ReturnType<typeof buildApiServer> | undefined;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it('creates a guest session', async () => {
    app = buildApiServer();
    const response = await app.inject({ method: 'POST', url: '/api/session/guest' });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.playerId).toEqual(expect.any(String));
    expect(body.playerId.length).toBeGreaterThan(0);
    expect(body.sessionToken).toEqual(expect.any(String));
    expect(body.sessionToken).toMatch(/^[0-9a-f]+$/);
    expect(body.sessionToken.length).toBe(64);
    expect(body.regionId).toMatch(/^starter-[0-9a-f-]+$/);
  });

  it('creates a fresh starter region per guest session', async () => {
    app = buildApiServer();

    const firstResponse = await app.inject({ method: 'POST', url: '/api/session/guest' });
    const secondResponse = await app.inject({ method: 'POST', url: '/api/session/guest' });

    expect(firstResponse.statusCode).toBe(200);
    expect(secondResponse.statusCode).toBe(200);
    expect(firstResponse.json().regionId).not.toBe(secondResponse.json().regionId);
  });

  it('lists the starter region', async () => {
    app = buildApiServer();
    const response = await app.inject({ method: 'GET', url: '/api/regions' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      { regionId: 'starter-1', displayName: 'Starter Basin', recommended: true },
    ]);
  });
});