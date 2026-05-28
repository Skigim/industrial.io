import { regionCycleMs } from './buildings.js';
import type {
  BeltState,
  BuildingState,
  MachineStatus,
  RegionState,
  ResourceType,
  TileCoordinate,
} from './model.js';

const isSameTile = (left: TileCoordinate, right: TileCoordinate): boolean => (
  left.x === right.x && left.y === right.y
);

const findBelt = (region: RegionState, tile: TileCoordinate): BeltState | undefined => (
  region.belts.find((belt) => isSameTile(belt.tile, tile))
);

const findBuilding = (
  region: RegionState,
  machineId: string,
): BuildingState | undefined => region.buildings.find((building) => building.id === machineId);

const updateBelt = (
  belts: BeltState[],
  tile: TileCoordinate,
  update: (belt: BeltState) => BeltState,
): BeltState[] => belts.map((belt) => (isSameTile(belt.tile, tile) ? update(belt) : belt));

const updateBuilding = (
  buildings: BuildingState[],
  machineId: string,
  update: (building: BuildingState) => BuildingState,
): BuildingState[] => buildings.map((building) => (building.id === machineId ? update(building) : building));

const syncScenarioGoal = (region: RegionState): RegionState => {
  const current = Math.min(
    region.storage['construction-part'] ?? 0,
    region.scenario.goal.target,
  );

  return {
    ...region,
    scenario: {
      ...region.scenario,
      goal: {
        ...region.scenario.goal,
        current,
        isComplete: current >= region.scenario.goal.target,
      },
    },
  };
};

const canAdvanceBufferItem = (
  region: RegionState,
  fromTile: TileCoordinate,
  itemId: BeltState['itemId'],
): boolean => {
  if (itemId === null) {
    return false;
  }

  if (isSameTile(fromTile, { x: 14, y: 6 })) {
    return false;
  }

  if (isSameTile(fromTile, { x: 11, y: 6 })) {
    return false;
  }

  return true;
};

const setMachineState = (
  region: RegionState,
  machineId: string,
  status: MachineStatus,
  heldItemId: BuildingState['heldItemId'],
  progressMs: number,
): RegionState => ({
  ...region,
  buildings: updateBuilding(region.buildings, machineId, (building) => ({
    ...building,
    status,
    heldItemId,
    progressMs,
  })),
});

const moveItemIntoStorage = (
  region: RegionState,
  fromTile: TileCoordinate,
  itemId: Exclude<ResourceType, 'coal'>,
): RegionState => {
  const sourceBelt = findBelt(region, fromTile);

  if (!sourceBelt || sourceBelt.itemId !== itemId) {
    return region;
  }

  const storage: RegionState['storage'] = {
    ...region.storage,
    [itemId]: (region.storage[itemId] ?? 0) + 1,
  };

  return syncScenarioGoal({
    ...region,
    storage,
    belts: updateBelt(region.belts, fromTile, (belt) => ({ ...belt, itemId: null })),
  });
};

const moveBeltItem = (
  region: RegionState,
  fromTile: TileCoordinate,
  toTile: TileCoordinate,
): RegionState => {
  const fromBelt = findBelt(region, fromTile);
  const toBelt = findBelt(region, toTile);

  if (
    !fromBelt
    || !toBelt
    || fromBelt.itemId === null
    || toBelt.itemId !== null
    || !canAdvanceBufferItem(region, fromTile, fromBelt.itemId)
  ) {
    return region;
  }

  const movingItemId = fromBelt.itemId;
  let belts = updateBelt(region.belts, fromTile, (belt) => ({ ...belt, itemId: null }));
  belts = updateBelt(belts, toTile, (belt) => ({ ...belt, itemId: movingItemId }));

  return {
    ...region,
    belts,
  };
};

const pushMachineOutput = (
  region: RegionState,
  machineId: string,
  outputTile: TileCoordinate,
  itemId: Exclude<ResourceType, 'coal'>,
): RegionState => {
  const machine = findBuilding(region, machineId);
  const outputBelt = findBelt(region, outputTile);

  if (!machine || !outputBelt || machine.heldItemId !== itemId) {
    return region;
  }

  if (outputBelt.itemId !== null) {
    return setMachineState(region, machineId, 'blocked', itemId, regionCycleMs);
  }

  const belts = updateBelt(region.belts, outputTile, (belt) => ({ ...belt, itemId }));

  return {
    ...setMachineState(region, machineId, 'running', null, 0),
    belts,
  };
};

const progressMachine = (
  region: RegionState,
  machineId: string,
  inputItemId: Exclude<ResourceType, 'coal'>,
  outputItemId: Exclude<ResourceType, 'coal'>,
): RegionState => {
  const machine = findBuilding(region, machineId);

  if (!machine) {
    return region;
  }

  if (machine.heldItemId === outputItemId) {
    const outputTile = { x: machine.tile.x + 1, y: machine.tile.y };
    const outputBelt = findBelt(region, outputTile);

    return setMachineState(
      region,
      machineId,
      outputBelt?.itemId === null ? 'running' : 'blocked',
      outputItemId,
      regionCycleMs,
    );
  }

  const inputTile = { x: machine.tile.x - 1, y: machine.tile.y };
  const inputBelt = findBelt(region, inputTile);
  const outputTile = { x: machine.tile.x + 1, y: machine.tile.y };
  const outputBelt = findBelt(region, outputTile);

  if (outputBelt?.itemId === outputItemId) {
    return setMachineState(region, machineId, 'running', null, 0);
  }

  if (!inputBelt || inputBelt.itemId !== inputItemId) {
    return setMachineState(region, machineId, 'idle', null, 0);
  }

  return {
    ...setMachineState(
      {
        ...region,
        belts: updateBelt(region.belts, inputTile, (belt) => ({ ...belt, itemId: null })),
      },
      machineId,
      'running',
      outputItemId,
      regionCycleMs,
    ),
  };
};

const emitMinerOre = (
  region: RegionState,
  minerId: string,
  outputTile: TileCoordinate,
): RegionState => {
  const miner = findBuilding(region, minerId);
  const outputBelt = findBelt(region, outputTile);

  if (!miner || !outputBelt) {
    return region;
  }

  if (outputBelt.itemId !== null) {
    return setMachineState(region, minerId, 'blocked', null, 0);
  }

  return {
    ...setMachineState(region, minerId, 'running', null, 0),
    belts: updateBelt(region.belts, outputTile, (belt) => ({ ...belt, itemId: 'iron-ore' })),
  };
};

const runCycle = (region: RegionState): RegionState => {
  let next = moveItemIntoStorage(region, { x: 17, y: 6 }, 'construction-part');
  next = moveBeltItem(next, { x: 16, y: 6 }, { x: 17, y: 6 });
  next = pushMachineOutput(next, 'constructor-1', { x: 16, y: 6 }, 'construction-part');
  next = progressMachine(next, 'constructor-1', 'iron-ingot', 'construction-part');
  next = moveBeltItem(next, { x: 14, y: 6 }, { x: 16, y: 6 });
  next = moveBeltItem(next, { x: 13, y: 6 }, { x: 14, y: 6 });
  next = pushMachineOutput(next, 'smelter-1', { x: 13, y: 6 }, 'iron-ingot');
  next = progressMachine(next, 'smelter-1', 'iron-ore', 'iron-ingot');
  next = moveBeltItem(next, { x: 11, y: 6 }, { x: 13, y: 6 });
  return emitMinerOre(next, 'miner-1', { x: 11, y: 6 });
};

export const stepRegion = (region: RegionState, deltaMs: number): RegionState => {
  const safeDeltaMs = Math.max(0, deltaMs);
  const hasFuel = region.fuelUnits > 0;
  const hasEnoughPower = region.power.availableKw >= region.power.demandKw;
  const accumulatedDeltaMs = safeDeltaMs + region.meta.liveRemainderMs;

  if (safeDeltaMs === 0) {
    return {
      ...region,
      meta: {
        ...region.meta,
        lastCatchUpMode: 'live',
      },
    };
  }

  const cycles = Math.floor(accumulatedDeltaMs / regionCycleMs);
  const executedCycles = Math.min(cycles, region.fuelUnits);
  const remainingFuelUnits = region.fuelUnits - executedCycles;
  const canRun = hasEnoughPower && hasFuel;
  const liveRemainderMs = executedCycles < cycles
    ? 0
    : accumulatedDeltaMs - (executedCycles * regionCycleMs);

  if (!canRun) {
    return {
      ...region,
      power: {
        ...region.power,
        availableKw: hasFuel ? region.power.availableKw : 0,
      },
      meta: {
        ...region.meta,
        lastCatchUpMode: 'live',
      },
    };
  }

  let next = region;

  for (let cycleIndex = 0; cycleIndex < executedCycles; cycleIndex += 1) {
    next = runCycle(next);
  }

  return syncScenarioGoal({
    ...next,
    power: {
      ...next.power,
      availableKw: remainingFuelUnits > 0 ? region.power.availableKw : 0,
    },
    fuelUnits: remainingFuelUnits,
    meta: {
      ...next.meta,
      lastCatchUpMode: 'live',
      liveRemainderMs,
    },
  });
};