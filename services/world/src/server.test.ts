import { buildingsById } from '@industrial/content';
import { describe, expect, it } from 'vitest';
import { createWorldServer } from './server';
import {
  bootstrapStarterRegion,
  STARTER_IRON_PATCH_TILES,
} from './region/bootstrapStarterRegion';
import { RegionManager } from './region/RegionManager';

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
    expect(snapshot.buildings).toContainEqual({
      id: 'site-anchor-1',
      type: 'site-anchor',
      tile: { x: 6, y: 6 },
    });
    expect(snapshot.resourceNodes).toContainEqual({
      id: 'starter-iron-patch',
      resourceType: 'iron-ore',
      tiles: [
        { x: 10, y: 6 },
        { x: 11, y: 6 },
        { x: 10, y: 7 },
        { x: 11, y: 7 },
      ],
    });
  });

  it('returns an isolated snapshot per join request', async () => {
    const server = await createWorldServer();

    const firstSnapshot = await server.joinRegion({ regionId: 'starter-1', playerId: 'player-1' });
    firstSnapshot.buildings.push({ id: 'tampered', type: 'belt', tile: { x: 99, y: 99 } });
    firstSnapshot.resourceNodes[0]?.tiles.push({ x: 99, y: 98 });

    const secondSnapshot = await server.joinRegion({ regionId: 'starter-1', playerId: 'player-2' });

    expect(secondSnapshot.buildings).toEqual([
      { id: 'site-anchor-1', type: 'site-anchor', tile: { x: 6, y: 6 } },
    ]);
    expect(secondSnapshot.resourceNodes).toEqual([
      {
        id: 'starter-iron-patch',
        resourceType: 'iron-ore',
        tiles: [
          { x: 10, y: 6 },
          { x: 11, y: 6 },
          { x: 10, y: 7 },
          { x: 11, y: 7 },
        ],
      },
    ]);
    expect(secondSnapshot.storage['iron-plate']).toBe(0);
  });

  it('fails clearly when the starter site-anchor definition is missing', () => {
    const mutableBuildingsById = buildingsById as Record<string, unknown>;
    const originalSiteAnchor = mutableBuildingsById['site-anchor'];

    Reflect.deleteProperty(mutableBuildingsById, 'site-anchor');

    try {
      expect(() => bootstrapStarterRegion('starter-1')).toThrowError(
        'Missing site-anchor building definition',
      );
    } finally {
      mutableBuildingsById['site-anchor'] = originalSiteAnchor;
    }
  });

  it('boots independent starter snapshots without sharing seeded tile references', () => {
    const first = bootstrapStarterRegion('starter-1');
    const second = bootstrapStarterRegion('starter-2');

    first.snapshot.buildings[0]!.tile.x = 99;
    first.snapshot.resourceNodes[0]!.tiles.push({ x: 99, y: 98 });

    expect(second.snapshot.buildings[0]!.tile).toEqual({ x: 6, y: 6 });
    expect(second.snapshot.resourceNodes[0]!.tiles).toEqual(STARTER_IRON_PATCH_TILES);
  });

  it('persists the requested placement tile in region snapshots', () => {
    const regionManager = new RegionManager();

    regionManager.joinRegion({ regionId: 'starter-1', playerId: 'player-1' });
    const snapshot = regionManager.placeBuilding({
      regionId: 'starter-1',
      playerId: 'player-1',
      buildingType: 'belt',
      tile: { x: 8, y: 6 },
    });

    expect(snapshot.buildings).toContainEqual({
      id: 'belt-1',
      type: 'belt',
      tile: { x: 8, y: 6 },
    });
  });

  it('rejects miners on non-iron tiles without mutating the snapshot', () => {
    const regionManager = new RegionManager();

    const initialSnapshot = regionManager.joinRegion({ regionId: 'starter-1', playerId: 'player-1' });

    expect(() => regionManager.placeBuilding({
      regionId: 'starter-1',
      playerId: 'player-1',
      buildingType: 'miner',
      tile: { x: 8, y: 6 },
    })).toThrowError('Miners must be placed on an iron patch tile');

    const nextSnapshot = regionManager.joinRegion({ regionId: 'starter-1', playerId: 'player-1' });

    expect(nextSnapshot.buildings).toEqual(initialSnapshot.buildings);
  });

  it('accepts miners on iron patch tiles', () => {
    const regionManager = new RegionManager();

    regionManager.joinRegion({ regionId: 'starter-1', playerId: 'player-1' });
    const snapshot = regionManager.placeBuilding({
      regionId: 'starter-1',
      playerId: 'player-1',
      buildingType: 'miner',
      tile: STARTER_IRON_PATCH_TILES[0]!,
    });

    expect(snapshot.buildings).toContainEqual({
      id: 'miner-1',
      type: 'miner',
      tile: STARTER_IRON_PATCH_TILES[0],
    });
  });
});