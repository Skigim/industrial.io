import { buildingsById } from '@industrial/content';
import { createStarterRegion, type RegionState } from '@industrial/sim-core';

export type TileCoordinate = {
  x: number;
  y: number;
};

export type BuildingSnapshot = {
  id: string;
  type: string;
  tile: TileCoordinate;
};

export type ResourceNodeSnapshot = {
  id: string;
  resourceType: 'iron-ore';
  tiles: TileCoordinate[];
};

export type RegionSnapshot = {
  regionId: string;
  buildings: BuildingSnapshot[];
  resourceNodes: ResourceNodeSnapshot[];
  storage: RegionState['storage'];
};

export type BootstrappedRegion = {
  state: RegionState;
  snapshot: RegionSnapshot;
};

export const STARTER_SITE_ANCHOR_TILE: TileCoordinate = { x: 6, y: 6 };
export const STARTER_IRON_PATCH_TILES: TileCoordinate[] = [
  { x: 10, y: 6 },
  { x: 11, y: 6 },
  { x: 10, y: 7 },
  { x: 11, y: 7 },
];

const cloneTile = (tile: TileCoordinate): TileCoordinate => ({ ...tile });

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
      buildings: [{ id: 'site-anchor-1', type: siteAnchor.id, tile: cloneTile(STARTER_SITE_ANCHOR_TILE) }],
      resourceNodes: [
        {
          id: 'starter-iron-patch',
          resourceType: 'iron-ore',
          tiles: STARTER_IRON_PATCH_TILES.map(cloneTile),
        },
      ],
      storage: { ...state.storage },
    },
  };
};