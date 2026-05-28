import { buildingsById } from '@industrial/content';
import {
  placeStarterRepair,
  type RegionState,
} from '@industrial/sim-core';

import {
  bootstrapStarterRegion,
  createRegionSnapshot,
  type TileCoordinate,
  type RegionSnapshot,
} from './bootstrapStarterRegion.js';
import { RegionRuntimeHost } from './RegionRuntimeHost.js';

export type JoinRegionRequest = {
  regionId: string;
  playerId: string;
};

const validBuildingTypes = new Set(Object.keys(buildingsById));

export type PlaceBuildingRequest = JoinRegionRequest & {
  buildingType: string;
  tile: TileCoordinate;
};

type ActiveRegion = {
  state: RegionState;
  snapshot: RegionSnapshot;
  lastTickAt: number;
};

export class RegionManager {
  private readonly activeRegions = new Map<string, ActiveRegion>();

  constructor(private readonly runtimeHost = new RegionRuntimeHost()) {}

  joinRegion({ regionId }: JoinRegionRequest): RegionSnapshot {
    const region = this.getOrCreateRegion(regionId);
    this.tickRegion(regionId);
    return cloneRegionSnapshot(region.snapshot);
  }

  placeBuilding({ regionId, buildingType, tile }: PlaceBuildingRequest): RegionSnapshot {
    if (!validBuildingTypes.has(buildingType)) {
      throw new Error(`Unknown building type: ${buildingType}`);
    }

    const region = this.getOrCreateRegion(regionId);

    if (
      buildingType !== 'belt'
      || tile.x !== region.state.scenario.repair.tile.x
      || tile.y !== region.state.scenario.repair.tile.y
    ) {
      throw new Error('Only the highlighted starter gap can be repaired in this scenario');
    }

    const now = Date.now();

    region.state = placeStarterRepair(region.state, tile);
    region.snapshot = createRegionSnapshot(region.state);
    region.lastTickAt = now;
    return cloneRegionSnapshot(region.snapshot);
  }

  tickRegion(regionId: string, elapsedMs?: number): RegionSnapshot {
    const region = this.getOrCreateRegion(regionId);
    const now = Date.now();
    const deltaMs = elapsedMs ?? (now - region.lastTickAt);

    region.state = this.runtimeHost.tick(region.state, deltaMs);
    region.lastTickAt = now;
    region.snapshot = createRegionSnapshot(region.state);

    return cloneRegionSnapshot(region.snapshot);
  }

  deleteRegion(regionId: string): void {
    this.activeRegions.delete(regionId);
  }

  getActiveRegionCount(): number {
    return this.activeRegions.size;
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
    };

    this.activeRegions.set(regionId, activeRegion);
    return activeRegion;
  }
}

const cloneRegionSnapshot = (snapshot: RegionSnapshot): RegionSnapshot => ({
  regionId: snapshot.regionId,
  buildings: snapshot.buildings.map((building) => ({
    ...building,
    tile: { ...building.tile },
  })),
  belts: snapshot.belts.map((belt) => ({
    ...belt,
    tile: { ...belt.tile },
  })),
  resourceNodes: snapshot.resourceNodes.map((resourceNode) => ({
    ...resourceNode,
    tiles: resourceNode.tiles.map((tile) => ({ ...tile })),
  })),
  storage: { ...snapshot.storage },
  scenario: {
    ...snapshot.scenario,
    repair: {
      ...snapshot.scenario.repair,
      tile: { ...snapshot.scenario.repair.tile },
    },
  },
});