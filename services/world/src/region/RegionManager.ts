import type { RegionState } from '@industrial/sim-core';

import {
  bootstrapStarterRegion,
  type RegionSnapshot,
} from './bootstrapStarterRegion.js';
import { RegionRuntimeHost } from './RegionRuntimeHost.js';

export type JoinRegionRequest = {
  regionId: string;
  playerId: string;
};

type ActiveRegion = {
  state: RegionState;
  snapshot: RegionSnapshot;
};

export class RegionManager {
  private readonly activeRegions = new Map<string, ActiveRegion>();

  constructor(private readonly runtimeHost = new RegionRuntimeHost()) {}

  joinRegion({ regionId }: JoinRegionRequest): RegionSnapshot {
    const region = this.getOrCreateRegion(regionId);
    region.state = this.runtimeHost.tick(region.state, 0);
    return cloneRegionSnapshot(region.snapshot);
  }

  private getOrCreateRegion(regionId: string): ActiveRegion {
    const existingRegion = this.activeRegions.get(regionId);

    if (existingRegion) {
      return existingRegion;
    }

    const bootstrappedRegion = bootstrapStarterRegion(regionId);
    this.activeRegions.set(regionId, bootstrappedRegion);
    return bootstrappedRegion;
  }
}

const cloneRegionSnapshot = (snapshot: RegionSnapshot): RegionSnapshot => ({
  regionId: snapshot.regionId,
  buildings: snapshot.buildings.map((building) => ({ ...building })),
});