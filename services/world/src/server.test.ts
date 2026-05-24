import { describe, expect, it } from 'vitest';
import { createWorldServer } from './server';

describe('world service', () => {
  it('reports healthy over HTTP', async () => {
    const server = await createWorldServer();

    const response = await server.app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });

  it('loads a starter region and returns an initial snapshot', async () => {
    const server = await createWorldServer();
    const snapshot = await server.joinRegion({ regionId: 'starter-1', playerId: 'player-1' });

    expect(snapshot.regionId).toBe('starter-1');
    expect(
      snapshot.buildings.some((building: { type: string }) => building.type === 'site-anchor'),
    ).toBe(true);
  });

  it('returns an isolated snapshot per join request', async () => {
    const server = await createWorldServer();

    const firstSnapshot = await server.joinRegion({ regionId: 'starter-1', playerId: 'player-1' });
    firstSnapshot.buildings.push({ id: 'tampered', type: 'belt' });

    const secondSnapshot = await server.joinRegion({ regionId: 'starter-1', playerId: 'player-2' });

    expect(secondSnapshot.buildings).toEqual([{ id: 'site-anchor-1', type: 'site-anchor' }]);
  });
});