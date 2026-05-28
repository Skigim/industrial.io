import type {
  BeltState,
  BuildingState,
  ResourceNodeState,
  ScenarioState,
  TileCoordinate,
} from './model.js';

export const STARTER_IRON_PATCH_TILES: TileCoordinate[] = [
  { x: 10, y: 6 },
  { x: 11, y: 6 },
  { x: 10, y: 7 },
  { x: 11, y: 7 },
];

export const STARTER_REPAIR_TILE: TileCoordinate = { x: 14, y: 6 };
export const STARTER_IRON_PATCH_NODE: ResourceNodeState = {
  id: 'starter-iron-patch',
  resourceType: 'iron-ore',
  tiles: STARTER_IRON_PATCH_TILES,
};

type StarterScenarioState = {
  buildings: BuildingState[];
  belts: BeltState[];
  resourceNodes: ResourceNodeState[];
  scenario: ScenarioState;
};

export const createStarterScenarioState = (): StarterScenarioState => ({
  buildings: [
    { id: 'site-anchor-1', type: 'site-anchor', tile: { x: 6, y: 6 } },
    { id: 'miner-1', type: 'miner', tile: { x: 10, y: 6 }, status: 'idle' },
    {
      id: 'smelter-1',
      type: 'smelter',
      tile: { x: 12, y: 6 },
      status: 'idle',
      progressMs: 0,
      heldItemId: null,
    },
    {
      id: 'constructor-1',
      type: 'constructor',
      tile: { x: 15, y: 6 },
      status: 'idle',
      progressMs: 0,
      heldItemId: null,
    },
    { id: 'storage-1', type: 'storage', tile: { x: 18, y: 6 } },
  ],
  belts: [
    { id: 'belt-1', tile: { x: 11, y: 6 }, itemId: null },
    { id: 'belt-2', tile: { x: 13, y: 6 }, itemId: null },
    { id: 'belt-3', tile: { x: 16, y: 6 }, itemId: null },
    { id: 'belt-4', tile: { x: 17, y: 6 }, itemId: null },
  ],
  resourceNodes: [STARTER_IRON_PATCH_NODE],
  scenario: {
    repair: { buildingType: 'belt', tile: STARTER_REPAIR_TILE, isPlaced: false },
    goal: { current: 0, target: 10, isComplete: false },
  },
});