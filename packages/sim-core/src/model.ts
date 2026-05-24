import { starterPower, starterStorage } from './buildings';

export type RegionState = {
  id: string;
  storage: Record<string, number>;
  power: { availableKw: number; demandKw: number };
  fuelUnits: number;
  meta: { lastCatchUpMode: 'live' | 'piecewise' };
};

export type RegionStateOverrides = Partial<
  Omit<RegionState, 'storage' | 'power' | 'meta'>
> & {
  storage?: Partial<RegionState['storage']>;
  power?: Partial<RegionState['power']>;
  meta?: Partial<RegionState['meta']>;
};

export const createStarterRegion = (
  overrides: RegionStateOverrides = {},
): RegionState => ({
  id: overrides.id ?? 'starter-1',
  storage: { ...starterStorage, ...overrides.storage },
  power: { ...starterPower, ...overrides.power },
  fuelUnits: overrides.fuelUnits ?? 4,
  meta: { lastCatchUpMode: 'live', ...overrides.meta },
});