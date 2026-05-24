import { describe, expect, it } from 'vitest';
import {
  catchUpDormantRegion,
  createStarterRegion,
  stepRegion,
} from './index';

describe('region simulation', () => {
  it('produces iron plates while power is available', () => {
    const region = createStarterRegion();
    const next = stepRegion(region, 4000);

    expect(next.storage['iron-plate']).toBeGreaterThanOrEqual(1);
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

    expect(next.storage['iron-plate']).toBe(1);
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
      storage: { 'iron-plate': 2 },
    });
    const next = stepRegion(region, -4000);

    expect(next.storage['iron-plate']).toBe(2);
    expect(next.fuelUnits).toBe(1);
    expect(next.power.availableKw).toBe(50);
    expect(next.meta.lastCatchUpMode).toBe('live');
  });

  it('treats zero live elapsed time as a no-op for a fuel-empty stalled region', () => {
    const region = createStarterRegion({
      fuelUnits: 0,
      power: { availableKw: 50, demandKw: 20 },
      storage: { 'iron-plate': 2 },
    });
    const next = stepRegion(region, 0);

    expect(next.storage['iron-plate']).toBe(2);
    expect(next.fuelUnits).toBe(0);
    expect(next.power.availableKw).toBe(50);
    expect(next.meta.lastCatchUpMode).toBe('live');
  });

  it('preserves available power during a positive live step when the region is underpowered', () => {
    const region = createStarterRegion({
      fuelUnits: 2,
      power: { availableKw: 10, demandKw: 20 },
      storage: { 'iron-plate': 2 },
    });
    const next = stepRegion(region, 4000);

    expect(next.storage['iron-plate']).toBe(2);
    expect(next.fuelUnits).toBe(2);
    expect(next.power.availableKw).toBe(10);
    expect(next.meta.lastCatchUpMode).toBe('live');
  });

  it('clamps negative dormant catch-up elapsed time to zero', () => {
    const region = createStarterRegion({
      fuelUnits: 1,
      storage: { 'iron-plate': 2 },
    });
    const next = catchUpDormantRegion(region, -4000);

    expect(next.storage['iron-plate']).toBe(2);
    expect(next.fuelUnits).toBe(1);
    expect(next.power.availableKw).toBe(50);
    expect(next.meta.lastCatchUpMode).toBe('piecewise');
  });

  it('treats negative dormant catch-up elapsed time as a no-op for an underpowered stalled region', () => {
    const region = createStarterRegion({
      fuelUnits: 2,
      power: { availableKw: 10, demandKw: 20 },
      storage: { 'iron-plate': 2 },
    });
    const next = catchUpDormantRegion(region, -4000);

    expect(next.storage['iron-plate']).toBe(2);
    expect(next.fuelUnits).toBe(2);
    expect(next.power.availableKw).toBe(10);
    expect(next.meta.lastCatchUpMode).toBe('piecewise');
  });

  it('preserves available power during positive dormant catch-up when the region is underpowered', () => {
    const region = createStarterRegion({
      fuelUnits: 2,
      power: { availableKw: 10, demandKw: 20 },
      storage: { 'iron-plate': 2 },
    });
    const next = catchUpDormantRegion(region, 20000);

    expect(next.storage['iron-plate']).toBe(2);
    expect(next.fuelUnits).toBe(2);
    expect(next.power.availableKw).toBe(10);
    expect(next.meta.lastCatchUpMode).toBe('piecewise');
  });

  it('merges nested starter-region overrides with the defaults', () => {
    const region = createStarterRegion({
      storage: { 'iron-plate': 1 },
      power: { availableKw: 10 },
      meta: { lastCatchUpMode: 'piecewise' },
    });

    expect(region.storage.coal).toBe(4);
    expect(region.storage['iron-plate']).toBe(1);
    expect(region.power.availableKw).toBe(10);
    expect(region.power.demandKw).toBe(20);
    expect(region.meta.lastCatchUpMode).toBe('piecewise');
  });
});