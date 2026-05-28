import type { RegionState } from './model.js';
import { stepRegion } from './stepRegion.js';

export const catchUpDormantRegion = (
  region: RegionState,
  elapsedMs: number,
): RegionState => {
  const next = stepRegion(region, Math.max(0, elapsedMs));

  return {
    ...next,
    meta: {
      ...next.meta,
      lastCatchUpMode: 'piecewise',
    },
  };
};