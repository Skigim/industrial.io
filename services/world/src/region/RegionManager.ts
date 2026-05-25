import { regionCycleMs, type RegionState } from '@industrial/sim-core';

import {
  bootstrapStarterRegion,
  type RegionSnapshot,
} from './bootstrapStarterRegion.js';
import { RegionRuntimeHost } from './RegionRuntimeHost.js';

export type JoinRegionRequest = {
  regionId: string;
  playerId: string;
};

export type PlaceBuildingRequest = JoinRegionRequest & {
  buildingType: string;
};

type ActiveRegion = {
  state: RegionState;
  snapshot: RegionSnapshot;
  lastTickAt: number;
  pendingDeltaMs: number;
};

export class RegionManager {
  private readonly activeRegions = new Map<string, ActiveRegion>();

  constructor(private readonly runtimeHost = new RegionRuntimeHost()) {}

  joinRegion({ regionId }: JoinRegionRequest): RegionSnapshot {
    const region = this.getOrCreateRegion(regionId);
    this.tickRegion(regionId);
    return cloneRegionSnapshot(region.snapshot);
  }

  placeBuilding({ regionId, buildingType }: PlaceBuildingRequest): RegionSnapshot {
    const region = this.getOrCreateRegion(regionId);
    const nextIndex = region.snapshot.buildings.filter((building) => building.type === buildingType).length + 1;

    region.snapshot.buildings.push({ id: `${buildingType}-${nextIndex}`, type: buildingType });

    this.tickRegion(regionId);
    return cloneRegionSnapshot(region.snapshot);
  }

  tickRegion(regionId: string): RegionSnapshot {
    const region = this.getOrCreateRegion(regionId);
    const now = Date.now();
    const deltaMs = now - region.lastTickAt;
    const hasStarterFactory = this.hasStarterFactory(region);

    region.pendingDeltaMs = hasStarterFactory ? region.pendingDeltaMs + deltaMs : 0;
    region.state = this.runtimeHost.tick(region.state, region.pendingDeltaMs);
    region.lastTickAt = now;
    region.pendingDeltaMs %= regionCycleMs;
    region.snapshot.storage = { ...region.state.storage };

    return cloneRegionSnapshot(region.snapshot);
  }

  private getOrCreateRegion(regionId: string): ActiveRegion {
    const existingRegion = this.activeRegions.get(regionId);

    if (existingRegion) {
      return existingRegion;
    }

    const bootstrappedRegion = bootstrapStarterRegion(regionId);
    const activeRegion = {
      ...bootstrappedRegion,
      lastTickAt: Date.now(),
      pendingDeltaMs: 0,
    };

    this.activeRegions.set(regionId, activeRegion);
    return activeRegion;
  }

  private hasStarterFactory(region: ActiveRegion): boolean {
    const buildingTypes = new Set(region.snapshot.buildings.map((building) => building.type));

    return buildingTypes.has('site-anchor')
      && buildingTypes.has('burner-generator')
      && buildingTypes.has('miner')
      && buildingTypes.has('smelter');
  }
}

const cloneRegionSnapshot = (snapshot: RegionSnapshot): RegionSnapshot => ({
  regionId: snapshot.regionId,
  buildings: snapshot.buildings.map((building) => ({ ...building })),
  storage: { ...snapshot.storage },
});