import { starterPower, starterStorage } from './buildings.js';
import { createStarterScenarioState } from './starterScenario.js';

export const resourceTypes = ['coal', 'iron-ore', 'iron-ingot', 'construction-part'] as const;

export type ResourceType = (typeof resourceTypes)[number];
export type NodeResourceType = Extract<ResourceType, 'coal' | 'iron-ore'>;
export type TileCoordinate = { x: number; y: number };
export type MachineStatus = 'idle' | 'running' | 'blocked';
export type StorageState = Record<ResourceType, number> & Partial<Record<'iron-plate', number>>;

export type BuildingState = {
  id: string;
  type: 'site-anchor' | 'burner-generator' | 'miner' | 'smelter' | 'constructor' | 'storage';
  tile: TileCoordinate;
  status?: MachineStatus;
  progressMs?: number;
  heldItemId?: Exclude<ResourceType, 'coal'> | null;
};

export type BeltState = {
  id: string;
  tile: TileCoordinate;
  itemId: Exclude<ResourceType, 'coal'> | null;
};

export type ResourceNodeState = {
  id: string;
  resourceType: NodeResourceType;
  tiles: TileCoordinate[];
};

export type ScenarioState = {
  repair: {
    buildingType: 'belt';
    tile: TileCoordinate;
    isPlaced: boolean;
  };
  goal: {
    current: number;
    target: number;
    isComplete: boolean;
  };
};

export type RegionState = {
  id: string;
  storage: StorageState;
  buildings: BuildingState[];
  belts: BeltState[];
  resourceNodes: ResourceNodeState[];
  scenario: ScenarioState;
  power: { availableKw: number; demandKw: number };
  fuelUnits: number;
  meta: { lastCatchUpMode: 'live' | 'piecewise'; liveRemainderMs: number };
};

export type RegionStateOverrides = Partial<
  Omit<RegionState, 'storage' | 'power' | 'meta' | 'scenario'>
> & {
  storage?: Partial<RegionState['storage']>;
  power?: Partial<RegionState['power']>;
  meta?: Partial<RegionState['meta']>;
  scenario?: {
    repair?: Partial<RegionState['scenario']['repair']>;
    goal?: Partial<RegionState['scenario']['goal']>;
  };
};

export const createStarterRegion = (
  overrides: RegionStateOverrides = {},
): RegionState => {
  const starterScenario = createStarterScenarioState();

  return {
    id: overrides.id ?? 'starter-1',
    storage: { ...starterStorage, ...overrides.storage },
    buildings: overrides.buildings ?? starterScenario.buildings,
    belts: overrides.belts ?? starterScenario.belts,
    resourceNodes: overrides.resourceNodes ?? starterScenario.resourceNodes,
    scenario: {
      repair: {
        ...starterScenario.scenario.repair,
        ...overrides.scenario?.repair,
      },
      goal: {
        ...starterScenario.scenario.goal,
        ...overrides.scenario?.goal,
      },
    },
    power: { ...starterPower, ...overrides.power },
    fuelUnits: overrides.fuelUnits ?? 26,
    meta: { lastCatchUpMode: 'live', liveRemainderMs: 0, ...overrides.meta },
  };
};