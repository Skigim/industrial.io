import { regionCycleMs } from './buildings';
import type { RegionState } from './model';
import { stepRegion } from './stepRegion';

export const catchUpDormantRegion = (
  region: RegionState,
  elapsedMs: number,
): RegionState => {
  const safeElapsedMs = Math.max(0, elapsedMs);
  const exhaustionMs = region.fuelUnits * regionCycleMs;

  if (exhaustionMs <= 0 || exhaustionMs >= safeElapsedMs) {
    return {
      ...stepRegion(region, safeElapsedMs),
      meta: { lastCatchUpMode: 'piecewise' },
    };
  }

  const firstPhase = stepRegion(region, exhaustionMs);

  return {
    ...firstPhase,
    power: {
      ...firstPhase.power,
      availableKw: firstPhase.fuelUnits > 0 ? firstPhase.power.availableKw : 0,
    },
    meta: { lastCatchUpMode: 'piecewise' },
  };
};