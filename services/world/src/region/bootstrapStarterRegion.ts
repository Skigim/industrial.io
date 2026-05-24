import { buildingsById } from '@industrial/content';
import { createStarterRegion, type RegionState } from '@industrial/sim-core';

export type RegionSnapshot = {
  regionId: string;
  buildings: Array<{ id: string; type: string }>;
};

export type BootstrappedRegion = {
  state: RegionState;
  snapshot: RegionSnapshot;
};

export const bootstrapStarterRegion = (regionId: string): BootstrappedRegion => ({
  state: createStarterRegion({ id: regionId }),
  snapshot: {
    regionId,
    buildings: [{ id: 'site-anchor-1', type: buildingsById['site-anchor'].id }],
  },
});