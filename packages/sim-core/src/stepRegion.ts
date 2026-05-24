import { regionCycleMs } from './buildings';
import type { RegionState } from './model';

export const stepRegion = (region: RegionState, deltaMs: number): RegionState => {
  const safeDeltaMs = Math.max(0, deltaMs);
  const hasFuel = region.fuelUnits > 0;
  const hasEnoughPower = region.power.availableKw >= region.power.demandKw;

  if (safeDeltaMs === 0) {
    return {
      ...region,
      meta: { lastCatchUpMode: 'live' },
    };
  }

  const cycles = Math.floor(safeDeltaMs / regionCycleMs);
  const executedCycles = Math.min(cycles, region.fuelUnits);
  const remainingFuelUnits = region.fuelUnits - executedCycles;
  const canRun = hasEnoughPower && hasFuel;

  if (!canRun) {
    return {
      ...region,
      power: {
        ...region.power,
        availableKw: hasFuel ? region.power.availableKw : 0,
      },
      meta: { lastCatchUpMode: 'live' },
    };
  }

  return {
    ...region,
    storage: {
      ...region.storage,
      'iron-plate': (region.storage['iron-plate'] ?? 0) + executedCycles,
    },
    power: {
      ...region.power,
      availableKw: remainingFuelUnits > 0 ? region.power.availableKw : 0,
    },
    fuelUnits: remainingFuelUnits,
    meta: { lastCatchUpMode: 'live' },
  };
};