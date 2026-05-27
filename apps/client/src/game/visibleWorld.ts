import type { PlacementTile } from './renderer/tileMath';

export type VisibleBuilding = {
  id: string;
  type: string;
  tile: PlacementTile;
};

export type VisibleResourceNode = {
  id: string;
  resourceType: string;
  tiles: PlacementTile[];
};

export type VisibleRegionSnapshot = {
  regionId: string;
  storage: Record<string, number>;
  buildings: VisibleBuilding[];
  resourceNodes: VisibleResourceNode[];
};