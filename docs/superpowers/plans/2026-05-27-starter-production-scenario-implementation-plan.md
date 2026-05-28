# Starter Production Scenario Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a playable starter scenario where the player repairs one missing belt segment and then watches ore flow through smelting and construction into storage until 10 construction parts are stored.

**Architecture:** Extend content and sim-core with a fixed starter production scenario instead of a generic sandbox. The world service publishes that richer authoritative snapshot, and the client renders it, accepts the repair placement, and shows progress toward the scenario goal without simulating anything locally.

**Tech Stack:** TypeScript, React, Fastify, WebSocket, Vitest, Playwright

---

## File Structure

- Modify: `packages/content/src/items.ts` to add `iron-ingot` and `construction-part` item definitions.
- Modify: `packages/content/src/recipes.ts` to define the ore -> ingot and ingot -> construction-part recipes.
- Modify: `packages/content/src/buildings.ts` to add the prebuilt `constructor` building and repoint `smelter` to the ingot recipe.
- Modify: `packages/content/src/content.test.ts` to verify the expanded production chain.
- Modify: `packages/sim-core/src/buildings.ts` to align starter storage defaults with the new item set.
- Modify: `packages/sim-core/src/model.ts` to carry starter-scenario runtime state, belt state, and scenario goal state.
- Create: `packages/sim-core/src/starterScenario.ts` to seed the fixed starter layout, resource patch, belt path, and missing repair tile.
- Modify: `packages/sim-core/src/stepRegion.ts` to simulate the repaired line tile-by-tile.
- Modify: `packages/sim-core/src/catchUpDormantRegion.ts` to stay compatible with the new region model.
- Modify: `packages/sim-core/src/index.ts` to export the new scenario helpers.
- Modify: `packages/sim-core/src/sim.test.ts` to cover stalled, repaired, blocked, and completed scenario states.
- Modify: `services/world/src/region/bootstrapStarterRegion.ts` to derive snapshots from the richer sim-core region state.
- Modify: `services/world/src/region/RegionManager.ts` to accept only the intended repair placement and to clone belts and scenario progress into snapshots.
- Modify: `services/world/src/server.test.ts` to verify starter scenario bootstrap and repair-only placement behavior.
- Modify: `apps/client/src/game/visibleWorld.ts` to include visible belts, belt items, building status, and scenario progress.
- Modify: `apps/client/src/App.tsx` to validate and store richer snapshots and drive the HUD from `scenario` instead of `iron-plate` storage.
- Modify: `apps/client/src/ui/Hud.tsx` to show `construction-part` progress and completion.
- Modify: `apps/client/src/App.test.tsx` and `apps/client/src/App.visibleWorld.test.tsx` to cover richer snapshots and repair placement flow.
- Modify: `apps/client/src/game/GameViewport.test.tsx` to pass the richer snapshot shape through the renderer bridge.
- Modify: `apps/client/src/game/renderer/createRenderer.ts` to draw belts, belt items, building-specific colors, and the broken/completed line.
- Modify: `apps/client/src/game/renderer/createRenderer.test.ts` to verify rendering order and item markers.
- Modify: `apps/client/e2e/factory-loop.spec.ts` to repair the line and wait for `10 / 10` construction parts.

### Task 1: Expand Starter Content Definitions

**Files:**
- Modify: `packages/content/src/items.ts`
- Modify: `packages/content/src/recipes.ts`
- Modify: `packages/content/src/buildings.ts`
- Test: `packages/content/src/content.test.ts`

- [ ] **Step 1: Write the failing content test for the ore -> ingot -> parts chain**

Add this test and extend the existing key-set expectations in `packages/content/src/content.test.ts`:

```ts
it('defines the starter ore-to-parts chain', () => {
  expect(buildingsById.smelter.recipeId).toBe('iron-ingot');
  expect(buildingsById.constructor.recipeId).toBe('construction-part');
  expect(recipesById['iron-ingot']).toMatchObject({
    inputs: [{ itemId: 'iron-ore', amount: 1 }],
    outputs: [{ itemId: 'iron-ingot', amount: 1 }],
  });
  expect(recipesById['construction-part']).toMatchObject({
    inputs: [{ itemId: 'iron-ingot', amount: 1 }],
    outputs: [{ itemId: 'construction-part', amount: 1 }],
  });
});
```

- [ ] **Step 2: Run the content test and verify it fails**

Run: `corepack pnpm --filter @industrial/content test`
Expected: FAIL because `buildingsById.constructor` is undefined and the `iron-ingot` / `construction-part` recipes do not exist.

- [ ] **Step 3: Implement the minimal content additions**

Update `packages/content/src/items.ts` to:

```ts
export const itemsById = {
  coal: { id: 'coal', stackSize: 100 },
  'iron-ore': { id: 'iron-ore', stackSize: 100 },
  'iron-ingot': { id: 'iron-ingot', stackSize: 100 },
  'construction-part': { id: 'construction-part', stackSize: 100 },
} as const;
```

Update `packages/content/src/recipes.ts` to:

```ts
export const recipesById = {
  'iron-ingot': {
    id: 'iron-ingot',
    durationMs: 4000,
    inputs: [{ itemId: 'iron-ore', amount: 1 }],
    outputs: [{ itemId: 'iron-ingot', amount: 1 }],
  },
  'construction-part': {
    id: 'construction-part',
    durationMs: 4000,
    inputs: [{ itemId: 'iron-ingot', amount: 1 }],
    outputs: [{ itemId: 'construction-part', amount: 1 }],
  },
} as const;
```

Update `packages/content/src/buildings.ts` to:

```ts
export const buildingsById = {
  'site-anchor': { id: 'site-anchor', footprint: { w: 2, h: 2 } },
  'burner-generator': { id: 'burner-generator', fuelItemId: 'coal', powerOutputKw: 50 },
  miner: { id: 'miner', outputItemId: 'iron-ore', powerDrawKw: 8 },
  belt: { id: 'belt', throughputPerSecond: 4 },
  smelter: { id: 'smelter', recipeId: 'iron-ingot', powerDrawKw: 12 },
  constructor: { id: 'constructor', recipeId: 'construction-part', powerDrawKw: 12 },
  storage: { id: 'storage', capacity: 200 },
} as const;
```

- [ ] **Step 4: Re-run the content test and verify it passes**

Run: `corepack pnpm --filter @industrial/content test`
Expected: PASS

- [ ] **Step 5: Commit the content slice**

Run:

```bash
git add packages/content/src/items.ts packages/content/src/recipes.ts packages/content/src/buildings.ts packages/content/src/content.test.ts
git commit -m "feat: add starter production chain content"
```

### Task 2: Seed A Fixed Starter Scenario In Sim-Core

**Files:**
- Modify: `packages/sim-core/src/buildings.ts`
- Modify: `packages/sim-core/src/model.ts`
- Create: `packages/sim-core/src/starterScenario.ts`
- Modify: `packages/sim-core/src/index.ts`
- Test: `packages/sim-core/src/sim.test.ts`

- [ ] **Step 1: Write the failing sim test for the starter layout and repair target**

Replace the first live-sim test block in `packages/sim-core/src/sim.test.ts` with this scenario-seeding test:

```ts
it('seeds a broken starter production scenario', () => {
  const region = createStarterRegion();

  expect(region.storage['construction-part']).toBe(0);
  expect(region.buildings.some((building) => building.type === 'constructor')).toBe(true);
  expect(region.belts.some((belt) => belt.tile.x === 14 && belt.tile.y === 6)).toBe(false);
  expect(region.scenario.repair).toEqual({
    buildingType: 'belt',
    tile: { x: 14, y: 6 },
    isPlaced: false,
  });
  expect(region.scenario.goal).toEqual({
    current: 0,
    target: 10,
    isComplete: false,
  });
});
```

- [ ] **Step 2: Run the sim-core test and verify it fails**

Run: `corepack pnpm --filter @industrial/sim-core test -- -t "seeds a broken starter production scenario"`
Expected: FAIL because `RegionState` does not include `buildings`, `belts`, or `scenario` yet.

- [ ] **Step 3: Implement the starter scenario state model and seed data**

Update `packages/sim-core/src/buildings.ts` so the default storage matches the new chain:

```ts
export const starterStorage = {
  coal: 4,
  'iron-ore': 0,
  'iron-ingot': 0,
  'construction-part': 0,
} as const;
```

Update `packages/sim-core/src/model.ts` to add tile, belt, building, and scenario types:

```ts
export const resourceTypes = ['coal', 'iron-ore', 'iron-ingot', 'construction-part'] as const;

export type TileCoordinate = { x: number; y: number };
export type MachineStatus = 'idle' | 'running' | 'blocked';

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
```

Create `packages/sim-core/src/starterScenario.ts` with explicit starter tiles:

```ts
export const STARTER_IRON_PATCH_TILES: TileCoordinate[] = [
  { x: 10, y: 6 },
  { x: 11, y: 6 },
  { x: 10, y: 7 },
  { x: 11, y: 7 },
];

export const STARTER_REPAIR_TILE: TileCoordinate = { x: 14, y: 6 };

export const createStarterScenarioState = () => ({
  buildings: [
    { id: 'site-anchor-1', type: 'site-anchor', tile: { x: 6, y: 6 } },
    { id: 'miner-1', type: 'miner', tile: { x: 10, y: 6 }, status: 'idle' },
    { id: 'smelter-1', type: 'smelter', tile: { x: 12, y: 6 }, status: 'idle', progressMs: 0, heldItemId: null },
    { id: 'constructor-1', type: 'constructor', tile: { x: 15, y: 6 }, status: 'idle', progressMs: 0, heldItemId: null },
    { id: 'storage-1', type: 'storage', tile: { x: 18, y: 6 } },
  ],
  belts: [
    { id: 'belt-1', tile: { x: 11, y: 6 }, itemId: null },
    { id: 'belt-2', tile: { x: 13, y: 6 }, itemId: null },
    { id: 'belt-3', tile: { x: 16, y: 6 }, itemId: null },
    { id: 'belt-4', tile: { x: 17, y: 6 }, itemId: null },
  ],
  resourceNodes: [{ id: 'starter-iron-patch', resourceType: 'iron-ore', tiles: STARTER_IRON_PATCH_TILES }],
  scenario: {
    repair: { buildingType: 'belt', tile: STARTER_REPAIR_TILE, isPlaced: false },
    goal: { current: 0, target: 10, isComplete: false },
  },
});
```

Then make `createStarterRegion()` merge that scenario seed into the region defaults and export the new scenario helpers from `packages/sim-core/src/index.ts`.

- [ ] **Step 4: Re-run the sim-core test and verify it passes**

Run: `corepack pnpm --filter @industrial/sim-core test -- -t "seeds a broken starter production scenario"`
Expected: PASS

- [ ] **Step 5: Commit the region-model slice**

Run:

```bash
git add packages/sim-core/src/buildings.ts packages/sim-core/src/model.ts packages/sim-core/src/starterScenario.ts packages/sim-core/src/index.ts packages/sim-core/src/sim.test.ts
git commit -m "feat: seed starter production scenario state"
```

### Task 3: Implement The Scenario Tick Loop In Sim-Core

**Files:**
- Modify: `packages/sim-core/src/stepRegion.ts`
- Modify: `packages/sim-core/src/catchUpDormantRegion.ts`
- Test: `packages/sim-core/src/sim.test.ts`

- [ ] **Step 1: Write failing sim tests for stalled, repaired, blocked, and completed flow**

Append these tests to `packages/sim-core/src/sim.test.ts`:

```ts
it('does not produce construction parts before the repair belt is placed', () => {
  const region = createStarterRegion();
  const next = stepRegion(region, 16000);

  expect(next.storage['construction-part']).toBe(0);
  expect(next.scenario.goal.current).toBe(0);
  expect(next.scenario.goal.isComplete).toBe(false);
});

it('produces construction parts after the repair belt is placed', () => {
  let region = placeStarterRepair(createStarterRegion(), { x: 14, y: 6 });

  for (let index = 0; index < 12; index += 1) {
    region = stepRegion(region, 4000);
  }

  expect(region.storage['construction-part']).toBeGreaterThan(0);
  expect(region.scenario.goal.current).toBe(region.storage['construction-part']);
});

it('does not duplicate items when the constructor output belt is blocked', () => {
  const region = placeStarterRepair(createStarterRegion(), { x: 14, y: 6 });
  const blockedRegion = {
    ...region,
    belts: region.belts.map((belt) => belt.tile.x === 16 && belt.tile.y === 6
      ? { ...belt, itemId: 'construction-part' }
      : belt),
  };
  const next = stepRegion(blockedRegion, 4000);

  expect(next.storage['construction-part']).toBe(0);
  expect(next.belts.find((belt) => belt.tile.x === 16 && belt.tile.y === 6)?.itemId).toBe('construction-part');
});

it('marks the scenario complete after storing 10 construction parts', () => {
  let region = placeStarterRepair(createStarterRegion(), { x: 14, y: 6 });

  for (let index = 0; index < 48; index += 1) {
    region = stepRegion(region, 4000);
  }

  expect(region.storage['construction-part']).toBeGreaterThanOrEqual(10);
  expect(region.scenario.goal).toEqual({ current: 10, target: 10, isComplete: true });
});
```

- [ ] **Step 2: Run the sim-core test and verify it fails for the right reason**

Run: `corepack pnpm --filter @industrial/sim-core test`
Expected: FAIL because `stepRegion()` still increments a region-wide counter and `placeStarterRepair()` does not exist.

- [ ] **Step 3: Implement the minimal fixed-scenario tick loop**

Add a repair helper in `packages/sim-core/src/starterScenario.ts`:

```ts
export const placeStarterRepair = (region: RegionState, tile: TileCoordinate): RegionState => {
  if (tile.x !== STARTER_REPAIR_TILE.x || tile.y !== STARTER_REPAIR_TILE.y) {
    return region;
  }

  return {
    ...region,
    belts: [...region.belts, { id: 'belt-repair-1', tile: STARTER_REPAIR_TILE, itemId: null }],
    scenario: {
      ...region.scenario,
      repair: { ...region.scenario.repair, isPlaced: true },
    },
  };
};
```

Replace `packages/sim-core/src/stepRegion.ts` with a cycle-based scenario loop that advances the fixed path from right to left, then runs machine work, then emits ore from the miner. The minimal structure should look like this:

```ts
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
```

Update `catchUpDormantRegion()` to delegate to the new `stepRegion()` and preserve the piecewise marker:

```ts
export const catchUpDormantRegion = (region: RegionState, elapsedMs: number): RegionState => ({
  ...stepRegion(region, Math.max(0, elapsedMs)),
  meta: { lastCatchUpMode: 'piecewise' },
});
```

- [ ] **Step 4: Re-run the sim-core test and verify it passes**

Run: `corepack pnpm --filter @industrial/sim-core test`
Expected: PASS

- [ ] **Step 5: Commit the scenario runtime slice**

Run:

```bash
git add packages/sim-core/src/stepRegion.ts packages/sim-core/src/catchUpDormantRegion.ts packages/sim-core/src/starterScenario.ts packages/sim-core/src/sim.test.ts
git commit -m "feat: simulate repaired starter production line"
```

### Task 4: Publish The Scenario Through The World Service

**Files:**
- Modify: `services/world/src/region/bootstrapStarterRegion.ts`
- Modify: `services/world/src/region/RegionManager.ts`
- Test: `services/world/src/server.test.ts`

- [ ] **Step 1: Write failing world tests for starter scenario snapshots and repair-only placement**

Replace the existing placement-focused world tests in `services/world/src/server.test.ts` with these assertions:

```ts
it('loads a starter scenario snapshot with belts and progress metadata', async () => {
  const server = await createWorldServer();
  const snapshot = await server.joinRegion({ regionId: 'starter-1', playerId: 'player-1' });

  expect(snapshot.buildings).toContainEqual(
    expect.objectContaining({ id: 'constructor-1', type: 'constructor', tile: { x: 15, y: 6 } }),
  );
  expect(snapshot.belts.some((belt) => belt.tile.x === 14 && belt.tile.y === 6)).toBe(false);
  expect(snapshot.scenario).toEqual({ current: 0, target: 10, isComplete: false });
});

it('rejects placements outside the starter repair tile', () => {
  const regionManager = new RegionManager();

  expect(() => regionManager.placeBuilding({
    regionId: 'starter-1',
    playerId: 'player-1',
    buildingType: 'belt',
    tile: { x: 9, y: 9 },
  })).toThrowError('Only the highlighted starter gap can be repaired in this scenario');
});

it('accepts the starter repair tile and adds the missing belt to the snapshot', () => {
  const regionManager = new RegionManager();
  regionManager.joinRegion({ regionId: 'starter-1', playerId: 'player-1' });

  const snapshot = regionManager.placeBuilding({
    regionId: 'starter-1',
    playerId: 'player-1',
    buildingType: 'belt',
    tile: { x: 14, y: 6 },
  });

  expect(snapshot.belts).toContainEqual({ id: 'belt-repair-1', tile: { x: 14, y: 6 }, itemId: null });
});
```

- [ ] **Step 2: Run the world test and verify it fails**

Run: `corepack pnpm --filter @industrial/world test`
Expected: FAIL because `RegionSnapshot` has no `belts` or `scenario` fields and `RegionManager.placeBuilding()` still appends every building to `snapshot.buildings`.

- [ ] **Step 3: Implement snapshot mapping and repair-only placement**

Update `services/world/src/region/bootstrapStarterRegion.ts` so snapshots derive from the sim-core state instead of duplicating the starter layout manually:

```ts
export type BeltSnapshot = {
  id: string;
  tile: TileCoordinate;
  itemId: string | null;
};

export type ScenarioSnapshot = {
  current: number;
  target: number;
  isComplete: boolean;
};

export type RegionSnapshot = {
  regionId: string;
  buildings: BuildingSnapshot[];
  belts: BeltSnapshot[];
  resourceNodes: ResourceNodeSnapshot[];
  storage: RegionState['storage'];
  scenario: ScenarioSnapshot;
};
```

Update `services/world/src/region/RegionManager.ts` so `tickRegion()` always ticks the region and `placeBuilding()` only accepts the one allowed repair:

```ts
if (buildingType !== 'belt' || tile.x !== region.state.scenario.repair.tile.x || tile.y !== region.state.scenario.repair.tile.y) {
  throw new Error('Only the highlighted starter gap can be repaired in this scenario');
}

region.state = placeStarterRepair(region.state, tile);
region.snapshot = createRegionSnapshot(region.state);
```

Also update the snapshot clone helper to deep-clone `belts` and `scenario`.

- [ ] **Step 4: Re-run the world test and verify it passes**

Run: `corepack pnpm --filter @industrial/world test`
Expected: PASS

- [ ] **Step 5: Commit the world-service slice**

Run:

```bash
git add services/world/src/region/bootstrapStarterRegion.ts services/world/src/region/RegionManager.ts services/world/src/server.test.ts
git commit -m "feat: expose starter production scenario snapshots"
```

### Task 5: Parse Richer Snapshots And Show Goal Progress In The Client

**Files:**
- Modify: `apps/client/src/game/visibleWorld.ts`
- Modify: `apps/client/src/App.tsx`
- Modify: `apps/client/src/ui/Hud.tsx`
- Test: `apps/client/src/App.test.tsx`
- Test: `apps/client/src/App.visibleWorld.test.tsx`
- Test: `apps/client/src/game/GameViewport.test.tsx`

- [ ] **Step 1: Write failing client tests for belts, scenario progress, and completion UI**

Update `apps/client/src/App.visibleWorld.test.tsx` so the incoming snapshot includes belts and scenario data, then assert both the forwarded snapshot and the HUD text:

```ts
expect(gameViewportRenderSpy).toHaveBeenLastCalledWith(
  expect.objectContaining({
    regionSnapshot: {
      regionId: 'region-1',
      storage: { 'construction-part': 3, 'iron-ingot': 0, 'iron-ore': 0, coal: 4 },
      buildings: [{ id: 'constructor-1', type: 'constructor', tile: { x: 15, y: 6 }, status: 'running' }],
      belts: [{ id: 'belt-3', tile: { x: 16, y: 6 }, itemId: 'construction-part' }],
      resourceNodes: [{ id: 'starter-iron-patch', resourceType: 'iron-ore', tiles: [{ x: 10, y: 6 }] }],
      scenario: { current: 3, target: 10, isComplete: false },
    },
  }),
);
expect(screen.getByText('Construction Parts: 3 / 10')).toBeInTheDocument();
```

Update `apps/client/src/App.test.tsx` snapshot payloads so they include `belts` and `scenario`, and add a completion assertion:

```ts
await waitFor(() => {
  expect(screen.getByText('Construction Parts: 10 / 10')).toBeInTheDocument();
  expect(screen.getByText('Starter line complete')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused client tests and verify they fail**

Run: `corepack pnpm --filter @industrial/client test -- src/App.test.tsx src/App.visibleWorld.test.tsx src/game/GameViewport.test.tsx`
Expected: FAIL because `VisibleRegionSnapshot` and the App message guard do not accept `belts` or `scenario`, and `Hud` still renders `Iron Plate`.

- [ ] **Step 3: Implement the richer visible-world shape and HUD state**

Update `apps/client/src/game/visibleWorld.ts` to:

```ts
export type VisibleBuilding = {
  id: string;
  type: string;
  tile: PlacementTile;
  status?: 'idle' | 'running' | 'blocked';
};

export type VisibleBelt = {
  id: string;
  tile: PlacementTile;
  itemId: string | null;
};

export type VisibleScenario = {
  current: number;
  target: number;
  isComplete: boolean;
};
```

Update `apps/client/src/App.tsx` so the snapshot validator requires `belts` and `scenario`, then set state like this:

```ts
setRegionSnapshot({
  regionId: message.regionId,
  storage: message.storage,
  buildings: message.buildings,
  belts: message.belts,
  resourceNodes: message.resourceNodes,
  scenario: message.scenario,
});
setScenarioProgress(message.scenario);
```

Update `apps/client/src/ui/Hud.tsx` to:

```tsx
export type HudProps = {
  currentParts?: number;
  targetParts?: number;
  isComplete?: boolean;
};

export const Hud = ({ currentParts = 0, targetParts = 10, isComplete = false }: HudProps) => (
  <section>
    <h1>Industrial.io</h1>
    <p>Starter region online</p>
    <p>Construction Parts: {currentParts} / {targetParts}</p>
    {isComplete ? <p>Starter line complete</p> : null}
  </section>
);
```

- [ ] **Step 4: Re-run the focused client tests and verify they pass**

Run: `corepack pnpm --filter @industrial/client test -- src/App.test.tsx src/App.visibleWorld.test.tsx src/game/GameViewport.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit the client-state slice**

Run:

```bash
git add apps/client/src/game/visibleWorld.ts apps/client/src/App.tsx apps/client/src/ui/Hud.tsx apps/client/src/App.test.tsx apps/client/src/App.visibleWorld.test.tsx apps/client/src/game/GameViewport.test.tsx
git commit -m "feat: surface starter scenario progress in client state"
```

### Task 6: Render The Broken And Repaired Line

**Files:**
- Modify: `apps/client/src/game/renderer/createRenderer.ts`
- Test: `apps/client/src/game/renderer/createRenderer.test.ts`

- [ ] **Step 1: Write a failing renderer test for belts, item markers, and type-specific buildings**

Replace the last renderer test with this richer expectation:

```ts
const cleanup = createRenderer(
  container,
  { hoveredTile: { x: 14, y: 6 } },
  {
    regionId: 'region-1',
    storage: { coal: 4, 'iron-ore': 0, 'iron-ingot': 0, 'construction-part': 3 },
    buildings: [
      { id: 'smelter-1', type: 'smelter', tile: { x: 12, y: 6 }, status: 'running' },
      { id: 'constructor-1', type: 'constructor', tile: { x: 15, y: 6 }, status: 'blocked' },
    ],
    belts: [{ id: 'belt-3', tile: { x: 16, y: 6 }, itemId: 'construction-part' }],
    resourceNodes: [{ id: 'starter-iron-patch', resourceType: 'iron-ore', tiles: [{ x: 10, y: 6 }] }],
    scenario: { current: 3, target: 10, isComplete: false },
  },
);

expect(context.fillRect).toHaveBeenNthCalledWith(1, 320, 192, 32, 32);
expect(context.fillRect).toHaveBeenNthCalledWith(2, 512, 192, 32, 32);
expect(context.fillRect).toHaveBeenNthCalledWith(3, 384, 192, 32, 32);
expect(context.fillRect).toHaveBeenNthCalledWith(4, 488, 200, 16, 16);
expect(context.fillRect).toHaveBeenNthCalledWith(5, 448, 192, 32, 32);
```

- [ ] **Step 2: Run the renderer test and verify it fails**

Run: `corepack pnpm --filter @industrial/client test -- src/game/renderer/createRenderer.test.ts`
Expected: FAIL because the renderer does not draw belts or inset item markers and does not style buildings by type.

- [ ] **Step 3: Implement minimal readable rendering for the scenario**

Update `apps/client/src/game/renderer/createRenderer.ts` with explicit belt and item layers:

```ts
const buildingColors: Record<string, string> = {
  'site-anchor': 'rgba(111, 208, 255, 0.85)',
  miner: 'rgba(116, 201, 123, 0.85)',
  smelter: 'rgba(231, 145, 92, 0.85)',
  constructor: 'rgba(245, 210, 103, 0.85)',
  storage: 'rgba(166, 189, 214, 0.85)',
};

const itemColors: Record<string, string> = {
  'iron-ore': 'rgba(170, 92, 56, 0.95)',
  'iron-ingot': 'rgba(194, 199, 204, 0.95)',
  'construction-part': 'rgba(255, 215, 102, 0.95)',
};

const drawBelts = (context: CanvasRenderingContext2D, regionSnapshot: VisibleRegionSnapshot | null | undefined) => {
  for (const belt of regionSnapshot?.belts ?? []) {
    context.fillStyle = 'rgba(99, 125, 153, 0.75)';
    context.fillRect(belt.tile.x * tileSizePx, belt.tile.y * tileSizePx, tileSizePx, tileSizePx);

    if (belt.itemId) {
      context.fillStyle = itemColors[belt.itemId] ?? 'rgba(255, 255, 255, 0.9)';
      context.fillRect(belt.tile.x * tileSizePx + 8, belt.tile.y * tileSizePx + 8, 16, 16);
    }
  }
};
```

Then render in this order: grid -> resource nodes -> buildings -> belts -> hover preview.

- [ ] **Step 4: Re-run the renderer test and verify it passes**

Run: `corepack pnpm --filter @industrial/client test -- src/game/renderer/createRenderer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit the renderer slice**

Run:

```bash
git add apps/client/src/game/renderer/createRenderer.ts apps/client/src/game/renderer/createRenderer.test.ts
git commit -m "feat: render starter production belts and items"
```

### Task 7: Update The End-To-End Scenario And Run Full Verification

**Files:**
- Modify: `apps/client/e2e/factory-loop.spec.ts`

- [ ] **Step 1: Rewrite the Playwright scenario around the missing belt repair**

Update `apps/client/e2e/factory-loop.spec.ts` to:

```ts
test('player repairs the starter line and completes the scenario', async ({ page }) => {
  await page.goto('/');

  const viewport = page.getByTestId('game-viewport');
  const repairPosition = toViewportPosition({ x: 14, y: 6 });

  await expect(viewport).toBeVisible();
  await page.getByRole('button', { name: 'Belt' }).click();
  await viewport.hover({ position: repairPosition });
  await viewport.click({ position: repairPosition });

  await expect(page.getByText('Construction Parts: 10 / 10')).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Starter line complete')).toBeVisible();
});
```

- [ ] **Step 2: Run the browser scenario and verify it fails before implementation is fully wired**

Run: `corepack pnpm --filter @industrial/client playwright test e2e/factory-loop.spec.ts`
Expected: FAIL until the world snapshot, client UI, and renderer all agree on the new scenario.

- [ ] **Step 3: Run the full focused verification set after all tasks above are green**

Run these commands in order:

```bash
corepack pnpm --filter @industrial/content test
corepack pnpm --filter @industrial/sim-core test
corepack pnpm --filter @industrial/world test
corepack pnpm --filter @industrial/client test
corepack pnpm --filter @industrial/client playwright test e2e/factory-loop.spec.ts
corepack pnpm typecheck
corepack pnpm test
```

Expected:
- each package test command reports PASS
- the Playwright scenario reports PASS
- `corepack pnpm typecheck` reports PASS
- `corepack pnpm test` reports PASS

- [ ] **Step 4: Commit the end-to-end slice**

Run:

```bash
git add apps/client/e2e/factory-loop.spec.ts
git commit -m "test: cover starter production scenario"
```