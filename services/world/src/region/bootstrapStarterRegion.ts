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

export const bootstrapStarterRegion = (regionId: string): BootstrappedRegion => {
  const state = createStarterRegion({ id: regionId });
  const siteAnchor = buildingsById['site-anchor'];

  if (!siteAnchor) {
    throw new Error('Missing site-anchor building definition');
  }

  return {
    state,
    snapshot: {
      regionId: state.id,
      buildings: [{ id: 'site-anchor-1', type: siteAnchor.id }],
    },
  };
};