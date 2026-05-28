import { buildingsById } from '@industrial/content';
import { createStarterRegion, type RegionState } from '@industrial/sim-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWorldServer } from './server';
import {
  bootstrapStarterRegion,
  STARTER_IRON_PATCH_TILES,
} from './region/bootstrapStarterRegion';
import { RegionManager } from './region/RegionManager';
import { RegionRuntimeHost } from './region/RegionRuntimeHost';

const unrepairedScenario = {
  current: 0,
  target: 10,
  isComplete: false,
  repair: {
    buildingType: 'belt',
    tile: { x: 14, y: 6 },
    isPlaced: false,
  },
};

class ControlledRuntimeHost extends RegionRuntimeHost {
  readonly calls: number[] = [];

  private readonly queuedStates: RegionState[] = [];

  queue(state: RegionState): void {
    this.queuedStates.push(state);
  }

  override tick(region: RegionState, deltaMs: number): RegionState {
    this.calls.push(deltaMs);
    return this.queuedStates.shift() ?? region;
  }
}

describe('world service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it('loads a starter scenario snapshot with belts and progress metadata', async () => {
    const server = await createWorldServer();
    const snapshot = await server.joinRegion({ regionId: 'starter-1', playerId: 'player-1' });

    expect(snapshot.buildings).toContainEqual(
      expect.objectContaining({ id: 'constructor-1', type: 'constructor', tile: { x: 15, y: 6 } }),
    );
    expect(snapshot.belts.some((belt) => belt.tile.x === 14 && belt.tile.y === 6)).toBe(false);
    expect(snapshot.scenario).toEqual(unrepairedScenario);
  });

  it('returns an isolated snapshot per join request', async () => {
    const server = await createWorldServer();

    const firstSnapshot = await server.joinRegion({ regionId: 'starter-1', playerId: 'player-1' });
    firstSnapshot.buildings.push({ id: 'tampered', type: 'belt', tile: { x: 99, y: 99 } });
    firstSnapshot.belts.push({ id: 'tampered-belt', tile: { x: 99, y: 97 }, itemId: null });
    firstSnapshot.resourceNodes[0]?.tiles.push({ x: 99, y: 98 });
    firstSnapshot.scenario.current = 99;

    const secondSnapshot = await server.joinRegion({ regionId: 'starter-1', playerId: 'player-2' });

    expect(secondSnapshot.buildings).toEqual([
      { id: 'site-anchor-1', type: 'site-anchor', tile: { x: 6, y: 6 } },
      { id: 'miner-1', type: 'miner', tile: { x: 10, y: 6 } },
      { id: 'smelter-1', type: 'smelter', tile: { x: 12, y: 6 } },
      { id: 'constructor-1', type: 'constructor', tile: { x: 15, y: 6 } },
      { id: 'storage-1', type: 'storage', tile: { x: 18, y: 6 } },
    ]);
    expect(secondSnapshot.belts).toEqual([
      { id: 'belt-1', tile: { x: 11, y: 6 }, itemId: null },
      { id: 'belt-2', tile: { x: 13, y: 6 }, itemId: null },
      { id: 'belt-3', tile: { x: 16, y: 6 }, itemId: null },
      { id: 'belt-4', tile: { x: 17, y: 6 }, itemId: null },
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
    expect(secondSnapshot.storage['construction-part']).toBe(0);
    expect(secondSnapshot.scenario).toEqual(unrepairedScenario);
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
    first.snapshot.belts[0]!.tile.x = 98;
    first.snapshot.resourceNodes[0]!.tiles.push({ x: 99, y: 98 });
    first.snapshot.scenario.current = 99;

    expect(second.snapshot.buildings[0]!.tile).toEqual({ x: 6, y: 6 });
    expect(second.snapshot.belts[0]!.tile).toEqual({ x: 11, y: 6 });
    expect(second.snapshot.resourceNodes[0]!.tiles).toEqual(STARTER_IRON_PATCH_TILES);
    expect(second.snapshot.scenario).toEqual(unrepairedScenario);
  });

  it('rejects placements outside the starter repair tile', () => {
    const regionManager = new RegionManager();

    expect(() => regionManager.placeBuilding({
      regionId: 'starter-1',
      playerId: 'player-1',
      buildingType: 'belt',
      tile: { x: 9, y: 9 },
    })).toThrowError('Only the highlighted starter gap can be repaired in this scenario');
  });

  it('accepts the starter repair tile and adds the missing belt to the snapshot', () => {
    const regionManager = new RegionManager();

    regionManager.joinRegion({ regionId: 'starter-1', playerId: 'player-1' });

    const snapshot = regionManager.placeBuilding({
      regionId: 'starter-1',
      playerId: 'player-1',
      buildingType: 'belt',
      tile: { x: 14, y: 6 },
    });

    expect(snapshot.belts).toContainEqual({ id: 'belt-repair-1', tile: { x: 14, y: 6 }, itemId: null });
  });

  it('rebuilds the snapshot from the runtime state on tick, including belts storage and scenario progress', () => {
    const runtimeHost = new ControlledRuntimeHost();
    const regionManager = new RegionManager(runtimeHost);

    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(5_000);

    regionManager.joinRegion({ regionId: 'starter-1', playerId: 'player-1' });

    runtimeHost.queue(createStarterRegion({
      id: 'starter-1',
      belts: [
        { id: 'belt-1', tile: { x: 11, y: 6 }, itemId: 'iron-ore' },
        { id: 'belt-2', tile: { x: 13, y: 6 }, itemId: null },
        { id: 'belt-repair-1', tile: { x: 14, y: 6 }, itemId: 'iron-ingot' },
        { id: 'belt-3', tile: { x: 16, y: 6 }, itemId: 'construction-part' },
        { id: 'belt-4', tile: { x: 17, y: 6 }, itemId: null },
      ],
      storage: { 'construction-part': 4, 'iron-ingot': 2 },
      scenario: {
        repair: { isPlaced: true },
        goal: { current: 4, target: 10, isComplete: false },
      },
    }));

    const snapshot = regionManager.tickRegion('starter-1');

    expect(snapshot.belts).toEqual([
      { id: 'belt-1', tile: { x: 11, y: 6 }, itemId: 'iron-ore' },
      { id: 'belt-2', tile: { x: 13, y: 6 }, itemId: null },
      { id: 'belt-repair-1', tile: { x: 14, y: 6 }, itemId: 'iron-ingot' },
      { id: 'belt-3', tile: { x: 16, y: 6 }, itemId: 'construction-part' },
      { id: 'belt-4', tile: { x: 17, y: 6 }, itemId: null },
    ]);
    expect(snapshot.storage['construction-part']).toBe(4);
    expect(snapshot.storage['iron-ingot']).toBe(2);
    expect(snapshot.scenario).toEqual({
      current: 4,
      target: 10,
      isComplete: false,
      repair: {
        buildingType: 'belt',
        tile: { x: 14, y: 6 },
        isPlaced: true,
      },
    });
  });

  it('does not replay pre-repair elapsed time on the next tick after placing the starter repair', () => {
    const runtimeHost = new ControlledRuntimeHost();
    const regionManager = new RegionManager(runtimeHost);

    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(5_000)
      .mockReturnValueOnce(6_000);

    regionManager.joinRegion({ regionId: 'starter-1', playerId: 'player-1' });

    regionManager.placeBuilding({
      regionId: 'starter-1',
      playerId: 'player-1',
      buildingType: 'belt',
      tile: { x: 14, y: 6 },
    });

    regionManager.tickRegion('starter-1');

    expect(runtimeHost.calls).toEqual([0, 1_000]);
  });

  it('lets sim-core own repeated sub-cycle live remainder accounting', () => {
    const regionManager = new RegionManager();

    regionManager.joinRegion({ regionId: 'starter-1', playerId: 'player-1' });

    for (let index = 0; index < 3; index += 1) {
      regionManager.tickRegion('starter-1', 1_000);
    }

    expect(regionManager.tickRegion('starter-1', 0).belts).toContainEqual({
      id: 'belt-1',
      tile: { x: 11, y: 6 },
      itemId: null,
    });

    expect(regionManager.tickRegion('starter-1', 1_000).belts).toContainEqual({
      id: 'belt-1',
      tile: { x: 11, y: 6 },
      itemId: 'iron-ore',
    });
  });

  it('evicts a region from memory when requested', () => {
    const regionManager = new RegionManager();

    regionManager.placeBuilding({
      regionId: 'starter-evictable',
      playerId: 'player-1',
      buildingType: 'belt',
      tile: { x: 14, y: 6 },
    });

    expect(regionManager.getActiveRegionCount()).toBe(1);

    regionManager.deleteRegion('starter-evictable');

    const snapshot = regionManager.joinRegion({ regionId: 'starter-evictable', playerId: 'player-1' });

    expect(regionManager.getActiveRegionCount()).toBe(1);
    expect(snapshot.belts.some((belt) => belt.tile.x === 14 && belt.tile.y === 6)).toBe(false);
  });

  it('rejects non-belt placements without mutating the snapshot', () => {
    const regionManager = new RegionManager();

    vi.spyOn(Date, 'now').mockReturnValue(1_000);

    const initialSnapshot = regionManager.joinRegion({ regionId: 'starter-1', playerId: 'player-1' });

    expect(() => regionManager.placeBuilding({
      regionId: 'starter-1',
      playerId: 'player-1',
      buildingType: 'miner',
      tile: STARTER_IRON_PATCH_TILES[0]!,
    })).toThrowError('Only the highlighted starter gap can be repaired in this scenario');

    const nextSnapshot = regionManager.joinRegion({ regionId: 'starter-1', playerId: 'player-1' });

    expect(nextSnapshot).toEqual(initialSnapshot);
  });
});