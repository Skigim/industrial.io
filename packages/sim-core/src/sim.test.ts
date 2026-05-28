import { describe, expect, it } from 'vitest';
import {
  STARTER_IRON_PATCH_NODE,
  STARTER_REPAIR_TILE,
} from './starterScenario';
import {
  catchUpDormantRegion,
  createStarterRegion,
  placeStarterRepair,
  stepRegion,
} from './index';

const beltItemAt = (region: ReturnType<typeof createStarterRegion>, x: number, y: number) => (
  region.belts.find((belt) => belt.tile.x === x && belt.tile.y === y)?.itemId
);

describe('region simulation', () => {
  it('seeds a broken starter production scenario', () => {
    const region = createStarterRegion();

    expect(region.storage['construction-part']).toBe(0);
    expect(region.storage['iron-ingot']).toBe(0);
    expect(
      region.buildings.some((building) => building.type === 'constructor'),
    ).toBe(true);
    expect(
      region.belts.some((belt) => belt.tile.x === 14 && belt.tile.y === 6),
    ).toBe(false);
    expect(region.resourceNodes).toEqual([STARTER_IRON_PATCH_NODE]);
    expect(region.resourceNodes[0]).not.toBe(STARTER_IRON_PATCH_NODE);
    expect(region.resourceNodes[0]?.tiles).not.toBe(STARTER_IRON_PATCH_NODE.tiles);
    expect(region.scenario.repair).toEqual({
      buildingType: 'belt',
      tile: { x: 14, y: 6 },
      isPlaced: false,
    });
    expect(region.scenario.repair.tile).not.toBe(STARTER_REPAIR_TILE);
    expect(region.scenario.goal).toEqual({
      current: 0,
      target: 10,
      isComplete: false,
    });
  });

  it('advances the starter line while power is available', () => {
    const region = createStarterRegion();
    const next = stepRegion(region, 4000);

    expect(beltItemAt(next, 11, 6)).toBe('iron-ore');
    expect(next.fuelUnits).toBe(25);
  });

  it('carries live sub-cycle elapsed time across repeated steps', () => {
    let region = createStarterRegion();

    for (let index = 0; index < 3; index += 1) {
      region = stepRegion(region, 1000);
    }

    expect(beltItemAt(region, 11, 6)).toBeNull();
    expect(region.fuelUnits).toBe(26);

    region = stepRegion(region, 1000);

    expect(beltItemAt(region, 11, 6)).toBe('iron-ore');
    expect(region.fuelUnits).toBe(25);
    expect(region.meta.lastCatchUpMode).toBe('live');
  });

  it('evaluates offline progress in pieces when fuel runs out', () => {
    const region = createStarterRegion({ fuelUnits: 1 });
    const next = catchUpDormantRegion(region, 20000);

    expect(next.meta.lastCatchUpMode).toBe('piecewise');
    expect(next.power.availableKw).toBe(0);
  });

  it('caps live-step production to the remaining fuel when delta spans multiple cycles', () => {
    const region = createStarterRegion({ fuelUnits: 1 });
    const next = stepRegion(region, 20000);

    expect(beltItemAt(next, 11, 6)).toBe('iron-ore');
    expect(next.fuelUnits).toBe(0);
    expect(next.meta.lastCatchUpMode).toBe('live');
  });

  it('drops available power when a live step consumes the last fuel unit', () => {
    const region = createStarterRegion({ fuelUnits: 1 });
    const next = stepRegion(region, 4000);

    expect(next.fuelUnits).toBe(0);
    expect(next.power.availableKw).toBe(0);
  });

  it('drops available power when dormant catch-up ends exactly at fuel exhaustion', () => {
    const region = createStarterRegion({ fuelUnits: 1 });
    const next = catchUpDormantRegion(region, 4000);

    expect(next.fuelUnits).toBe(0);
    expect(next.power.availableKw).toBe(0);
    expect(next.meta.lastCatchUpMode).toBe('piecewise');
  });

  it('does not run region simulation backwards for negative live elapsed time', () => {
    const region = createStarterRegion({
      fuelUnits: 1,
      storage: { 'iron-ingot': 2 },
    });
    const next = stepRegion(region, -4000);

    expect(next.storage['iron-ingot']).toBe(2);
    expect(next.fuelUnits).toBe(1);
    expect(next.power.availableKw).toBe(50);
    expect(next.meta.lastCatchUpMode).toBe('live');
  });

  it('treats zero live elapsed time as a no-op for a fuel-empty stalled region', () => {
    const region = createStarterRegion({
      fuelUnits: 0,
      power: { availableKw: 50, demandKw: 20 },
      storage: { 'iron-ingot': 2 },
    });
    const next = stepRegion(region, 0);

    expect(next.storage['iron-ingot']).toBe(2);
    expect(next.fuelUnits).toBe(0);
    expect(next.power.availableKw).toBe(50);
    expect(next.meta.lastCatchUpMode).toBe('live');
  });

  it('preserves available power during a positive live step when the region is underpowered', () => {
    const region = createStarterRegion({
      fuelUnits: 2,
      power: { availableKw: 10, demandKw: 20 },
      storage: { 'iron-ingot': 2 },
    });
    const next = stepRegion(region, 4000);

    expect(next.storage['iron-ingot']).toBe(2);
    expect(next.fuelUnits).toBe(2);
    expect(next.power.availableKw).toBe(10);
    expect(next.meta.lastCatchUpMode).toBe('live');
  });

  it('clamps negative dormant catch-up elapsed time to zero', () => {
    const region = createStarterRegion({
      fuelUnits: 1,
      storage: { 'iron-ingot': 2 },
    });
    const next = catchUpDormantRegion(region, -4000);

    expect(next.storage['iron-ingot']).toBe(2);
    expect(next.fuelUnits).toBe(1);
    expect(next.power.availableKw).toBe(50);
    expect(next.meta.lastCatchUpMode).toBe('piecewise');
  });

  it('treats negative dormant catch-up elapsed time as a no-op for an underpowered stalled region', () => {
    const region = createStarterRegion({
      fuelUnits: 2,
      power: { availableKw: 10, demandKw: 20 },
      storage: { 'iron-ingot': 2 },
    });
    const next = catchUpDormantRegion(region, -4000);

    expect(next.storage['iron-ingot']).toBe(2);
    expect(next.fuelUnits).toBe(2);
    expect(next.power.availableKw).toBe(10);
    expect(next.meta.lastCatchUpMode).toBe('piecewise');
  });

  it('preserves available power during positive dormant catch-up when the region is underpowered', () => {
    const region = createStarterRegion({
      fuelUnits: 2,
      power: { availableKw: 10, demandKw: 20 },
      storage: { 'iron-ingot': 2 },
    });
    const next = catchUpDormantRegion(region, 20000);

    expect(next.storage['iron-ingot']).toBe(2);
    expect(next.fuelUnits).toBe(2);
    expect(next.power.availableKw).toBe(10);
    expect(next.meta.lastCatchUpMode).toBe('piecewise');
  });

  it('merges nested starter-region overrides with the defaults', () => {
    const region = createStarterRegion({
      storage: { 'iron-ingot': 1 },
      power: { availableKw: 10 },
      meta: { lastCatchUpMode: 'piecewise' },
    });

    expect(region.storage.coal).toBe(26);
    expect(region.storage['iron-ingot']).toBe(1);
    expect(region.power.availableKw).toBe(10);
    expect(region.power.demandKw).toBe(20);
    expect(region.meta.lastCatchUpMode).toBe('piecewise');
  });

  it('keeps repaired live-step execution subject to remaining fuel', () => {
    const region = placeStarterRepair(createStarterRegion({ fuelUnits: 1 }), { x: 14, y: 6 });
    const next = stepRegion(region, 20000);

    expect(next.fuelUnits).toBe(0);
    expect(next.power.availableKw).toBe(0);
    expect(next.meta.lastCatchUpMode).toBe('live');
  });

  it('does not produce construction parts before the repair belt is placed', () => {
    const region = createStarterRegion();
    const next = stepRegion(region, 16000);

    expect(next.storage['construction-part']).toBe(0);
    expect(next.scenario.goal.current).toBe(0);
    expect(next.scenario.goal.isComplete).toBe(false);
  });

  it('produces construction parts after the repair belt is placed', () => {
    let region = placeStarterRepair(createStarterRegion({ fuelUnits: 12 }), { x: 14, y: 6 });

    for (let index = 0; index < 12; index += 1) {
      region = stepRegion(region, 4000);
    }

    expect(region.storage['construction-part']).toBeGreaterThan(0);
    expect(region.scenario.goal.current).toBe(region.storage['construction-part']);
  });

  it('keeps starter repair placement idempotent', () => {
    const repairedRegion = placeStarterRepair(createStarterRegion(), { x: 14, y: 6 });
    const retriedRegion = placeStarterRepair(repairedRegion, { x: 14, y: 6 });

    expect(retriedRegion).toBe(repairedRegion);
    expect(retriedRegion.belts.filter((belt) => belt.tile.x === 14 && belt.tile.y === 6)).toHaveLength(1);
  });

  it('keeps a constructor blocked while holding output when the downstream line is occupied', () => {
    const region = placeStarterRepair(createStarterRegion(), { x: 14, y: 6 });
    const blockedRegion = {
      ...region,
      belts: region.belts.map((belt) => {
        if (belt.tile.x === 16 && belt.tile.y === 6) {
          return { ...belt, itemId: 'construction-part' as const };
        }

        if (belt.tile.x === 17 && belt.tile.y === 6) {
          return { ...belt, itemId: 'iron-ingot' as const };
        }

        return belt;
      }),
      buildings: region.buildings.map((building) => (building.id === 'constructor-1'
        ? {
          ...building,
          status: 'blocked' as const,
          heldItemId: 'construction-part' as const,
          progressMs: 4000,
        }
        : building)),
    };
    const next = stepRegion(blockedRegion, 4000);
    const constructor = next.buildings.find((building) => building.id === 'constructor-1');

    expect(next.storage['construction-part']).toBe(0);
    expect(beltItemAt(next, 16, 6)).toBe('construction-part');
    expect(beltItemAt(next, 17, 6)).toBe('iron-ingot');
    expect(constructor).toMatchObject({
      status: 'blocked',
      heldItemId: 'construction-part',
      progressMs: 4000,
    });
  });

  it('advances the repaired 13-to-14 belt segment when the downstream belt is empty', () => {
    const region = placeStarterRepair(createStarterRegion({ fuelUnits: 1 }), { x: 14, y: 6 });
    const primedRegion = {
      ...region,
      belts: region.belts.map((belt) => {
        if (belt.tile.x === 13 && belt.tile.y === 6) {
          return { ...belt, itemId: 'iron-ingot' as const };
        }

        return belt;
      }),
      buildings: region.buildings.map((building) => (building.id === 'smelter-1'
        ? { ...building, status: 'idle' as const }
        : building)),
    };
    const next = stepRegion(primedRegion, 4000);

    expect(beltItemAt(next, 13, 6)).toBeNull();
    expect(beltItemAt(next, 14, 6)).toBe('iron-ingot');
  });

  it('advances the repaired 16-to-17 belt segment when the downstream belt is empty', () => {
    const region = placeStarterRepair(createStarterRegion({ fuelUnits: 1 }), { x: 14, y: 6 });
    const primedRegion = {
      ...region,
      belts: region.belts.map((belt) => {
        if (belt.tile.x === 16 && belt.tile.y === 6) {
          return { ...belt, itemId: 'construction-part' as const };
        }

        return belt;
      }),
      buildings: region.buildings.map((building) => (building.id === 'constructor-1'
        ? { ...building, status: 'idle' as const }
        : building)),
    };
    const next = stepRegion(primedRegion, 4000);

    expect(next.storage['construction-part']).toBe(0);
    expect(beltItemAt(next, 16, 6)).toBeNull();
    expect(beltItemAt(next, 17, 6)).toBe('construction-part');
  });

  it('marks the scenario complete after storing 10 construction parts', () => {
    let region = placeStarterRepair(createStarterRegion(), { x: 14, y: 6 });

    for (let index = 0; index < 26; index += 1) {
      region = stepRegion(region, 4000);
    }

    expect(region.storage['construction-part']).toBeGreaterThanOrEqual(10);
    expect(region.scenario.goal).toEqual({ current: 10, target: 10, isComplete: true });
  });
});