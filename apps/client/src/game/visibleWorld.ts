import type { PlacementTile } from './renderer/tileMath';

export type VisibleBuilding = {
  id: string;
  type: string;
  tile: PlacementTile;
  status?: string;
};

export type VisibleBelt = {
  id: string;
  tile: PlacementTile;
  itemId: string | null;
};

export type VisibleResourceNode = {
  id: string;
  resourceType: string;
  tiles: PlacementTile[];
};

export type VisibleScenario = {
  current: number;
  target: number;
  isComplete: boolean;
  repair?: {
    buildingType: string;
    tile: PlacementTile;
    isPlaced: boolean;
  };
};

export type VisibleRegionSnapshot = {
  regionId: string;
  storage: Record<string, number>;
  buildings: VisibleBuilding[];
  belts: VisibleBelt[];
  resourceNodes: VisibleResourceNode[];
  scenario: VisibleScenario;
};