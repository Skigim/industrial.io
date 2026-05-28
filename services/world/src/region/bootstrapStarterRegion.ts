import { buildingsById } from '@industrial/content';
import {
  createStarterRegion,
  STARTER_IRON_PATCH_TILES as starterIronPatchTiles,
  type RegionState,
} from '@industrial/sim-core';

export type TileCoordinate = {
  x: number;
  y: number;
};

export type BuildingSnapshot = {
  id: string;
  type: string;
  tile: TileCoordinate;
};

export type BeltSnapshot = {
  id: string;
  tile: TileCoordinate;
  itemId: string | null;
};

export type ResourceNodeSnapshot = {
  id: string;
  resourceType: RegionState['resourceNodes'][number]['resourceType'];
  tiles: TileCoordinate[];
};

export type ScenarioSnapshot = {
  current: number;
  target: number;
  isComplete: boolean;
  repair: {
    buildingType: string;
    tile: TileCoordinate;
    isPlaced: boolean;
  };
};

export type RegionSnapshot = {
  regionId: string;
  buildings: BuildingSnapshot[];
  belts: BeltSnapshot[];
  resourceNodes: ResourceNodeSnapshot[];
  storage: RegionState['storage'];
  scenario: ScenarioSnapshot;
};

export type BootstrappedRegion = {
  state: RegionState;
  snapshot: RegionSnapshot;
};

export const STARTER_IRON_PATCH_TILES: TileCoordinate[] = starterIronPatchTiles.map((tile) => ({ ...tile }));

const cloneTile = (tile: TileCoordinate): TileCoordinate => ({ ...tile });

export const createRegionSnapshot = (state: RegionState): RegionSnapshot => ({
  regionId: state.id,
  buildings: state.buildings.map((building) => ({
    id: building.id,
    type: building.type,
    tile: cloneTile(building.tile),
  })),
  belts: state.belts.map((belt) => ({
    id: belt.id,
    tile: cloneTile(belt.tile),
    itemId: belt.itemId,
  })),
  resourceNodes: state.resourceNodes.map((resourceNode) => ({
    id: resourceNode.id,
    resourceType: resourceNode.resourceType,
    tiles: resourceNode.tiles.map(cloneTile),
  })),
  storage: { ...state.storage },
  scenario: {
    current: state.scenario.goal.current,
    target: state.scenario.goal.target,
    isComplete: state.scenario.goal.isComplete,
    repair: {
      buildingType: state.scenario.repair.buildingType,
      tile: cloneTile(state.scenario.repair.tile),
      isPlaced: state.scenario.repair.isPlaced,
    },
  },
});

export const bootstrapStarterRegion = (regionId: string): BootstrappedRegion => {
  const siteAnchor = buildingsById['site-anchor'];

  if (!siteAnchor) {
    throw new Error('Missing site-anchor building definition');
  }

  const state = createStarterRegion({ id: regionId });

  return {
    state,
    snapshot: createRegionSnapshot(state),
  };
};