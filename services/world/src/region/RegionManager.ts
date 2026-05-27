import { buildingsById } from '@industrial/content';
import { regionCycleMs, type RegionState } from '@industrial/sim-core';

import {
  bootstrapStarterRegion,
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

  placeBuilding({ regionId, buildingType, tile }: PlaceBuildingRequest): RegionSnapshot {
    if (!validBuildingTypes.has(buildingType)) {
      throw new Error(`Unknown building type: ${buildingType}`);
    }

    const region = this.getOrCreateRegion(regionId);

    if (buildingType === 'miner' && !this.isOnIronPatch(region.snapshot, tile)) {
      throw new Error('Miners must be placed on an iron patch tile');
    }

    const nextIndex = region.snapshot.buildings.filter((building) => building.type === buildingType).length + 1;

    region.snapshot.buildings.push({ id: `${buildingType}-${nextIndex}`, type: buildingType, tile });

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

  private isOnIronPatch(snapshot: RegionSnapshot, tile: TileCoordinate): boolean {
    return snapshot.resourceNodes.some((resourceNode) => resourceNode.resourceType === 'iron-ore'
      && resourceNode.tiles.some((resourceTile) => resourceTile.x === tile.x && resourceTile.y === tile.y));
  }
}

const cloneRegionSnapshot = (snapshot: RegionSnapshot): RegionSnapshot => ({
  regionId: snapshot.regionId,
  buildings: snapshot.buildings.map((building) => ({
    ...building,
    tile: { ...building.tile },
  })),
  resourceNodes: snapshot.resourceNodes.map((resourceNode) => ({
    ...resourceNode,
    tiles: resourceNode.tiles.map((tile) => ({ ...tile })),
  })),
  storage: { ...snapshot.storage },
});