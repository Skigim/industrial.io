# Visible World Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing placement slice legible by rendering placed buildings and a visible starter iron patch, while enforcing miner placement on iron tiles.

**Architecture:** Extend the world snapshot shape so it includes building tile positions and starter resource nodes, preserve that snapshot in the client shell, and render the visible world through the existing canvas renderer. Keep the runtime simulation unchanged except for miner placement validation.

**Tech Stack:** React, TypeScript, Fastify, WebSocket, Vitest, Playwright

---

### Task 1: Extend The World Snapshot Shape

**Files:**
- Modify: `services/world/src/region/bootstrapStarterRegion.ts`
- Modify: `services/world/src/region/RegionManager.ts`
- Test: `services/world/src/server.test.ts`

- [ ] **Step 1: Write a failing world test for visible snapshot data**

Add a test that expects the starter region snapshot to include:
- building entries with `tile`
- one starter iron resource node with explicit `tiles`

- [ ] **Step 2: Run the narrow world test and verify it fails**

Run: `corepack pnpm --filter @industrial/world test -- --runInBand`
Expected: FAIL because snapshots do not include tile/resource data yet.

- [ ] **Step 3: Implement the richer snapshot shape in bootstrap and cloning**

Add snapshot-level types for:
- `BuildingSnapshot = { id: string; type: string; tile: { x: number; y: number } }`
- `ResourceNodeSnapshot = { id: string; resourceType: 'iron-ore'; tiles: Array<{ x: number; y: number }> }`

Seed a fixed starter iron patch in `bootstrapStarterRegion.ts` and ensure snapshot cloning preserves it.

- [ ] **Step 4: Re-run the narrow world test and verify it passes**

Run: `corepack pnpm --filter @industrial/world test -- --runInBand`
Expected: PASS

### Task 2: Persist Building Tiles And Enforce Miner-On-Iron Validation

**Files:**
- Modify: `services/world/src/region/RegionManager.ts`
- Test: `services/world/src/server.test.ts`

- [ ] **Step 1: Write failing tests for placement tile persistence and invalid miner placement**

Add tests that verify:
- `build.place` stores the requested tile in the snapshot
- miner placement on a non-iron tile throws
- miner placement on an iron tile succeeds

- [ ] **Step 2: Run the narrow world test and verify it fails for the right reason**

Run: `corepack pnpm --filter @industrial/world test -- --runInBand`
Expected: FAIL because `RegionManager.placeBuilding(...)` ignores tiles and accepts all miner placements.

- [ ] **Step 3: Implement minimal validation and tile persistence**

Update `PlaceBuildingRequest` to carry `tile`, preserve that tile in the snapshot, and validate miner placement against starter iron patch tiles before mutating the snapshot.

- [ ] **Step 4: Re-run the world tests and verify they pass**

Run: `corepack pnpm --filter @industrial/world test -- --runInBand`
Expected: PASS

### Task 3: Preserve Visible World Snapshot In The Client Shell

**Files:**
- Modify: `apps/client/src/App.tsx`
- Test: `apps/client/src/App.test.tsx`

- [ ] **Step 1: Write a failing App test for snapshot retention and invalid miner retry behavior**

Add tests that verify:
- region snapshots with `buildings` and `resourceNodes` are stored in App state for rendering
- invalid placement failure keeps the miner armed

- [ ] **Step 2: Run the narrow App test and verify it fails**

Run: `corepack pnpm --filter @industrial/client test -- --runInBand src/App.test.tsx`
Expected: FAIL because App only stores storage count and not visible world state.

- [ ] **Step 3: Implement minimal App snapshot state**

Add App-owned state for the current visible region snapshot and update world-message parsing so it retains:
- `buildings`
- `resourceNodes`
- `storage`

Pass the visible world snapshot into `GameViewport`.

- [ ] **Step 4: Re-run the App test and verify it passes**

Run: `corepack pnpm --filter @industrial/client test -- --runInBand src/App.test.tsx`
Expected: PASS

### Task 4: Render Buildings And Resource Nodes In The Viewport

**Files:**
- Modify: `apps/client/src/game/GameViewport.tsx`
- Modify: `apps/client/src/game/renderer/createRenderer.ts`
- Test: `apps/client/src/game/renderer/createRenderer.test.ts`

- [ ] **Step 1: Write a failing renderer test for visible world layers**

Add a test that verifies:
- resource node tiles draw at tile-aligned coordinates
- building tiles draw above them
- hover preview remains present

- [ ] **Step 2: Run the narrow renderer test and verify it fails**

Run: `corepack pnpm --filter @industrial/client test -- --runInBand src/game/renderer/createRenderer.test.ts`
Expected: FAIL because the renderer only draws grid and hover layers.

- [ ] **Step 3: Implement minimal world rendering**

Update `GameViewport` to pass visible world data into the renderer and update `createRenderer.ts` to draw:
- iron patch tiles
- placed building tiles
- existing hover preview on top

- [ ] **Step 4: Re-run the renderer test and verify it passes**

Run: `corepack pnpm --filter @industrial/client test -- --runInBand src/game/renderer/createRenderer.test.ts`
Expected: PASS

### Task 5: Update End-To-End Starter Placement Coverage

**Files:**
- Modify: `apps/client/e2e/factory-loop.spec.ts`

- [ ] **Step 1: Update the browser smoke test to place the miner on the visible starter iron patch**

Use placement coordinates that correspond to the seeded starter iron patch tiles.

- [ ] **Step 2: Run Playwright and verify the updated loop passes**

Run: `corepack pnpm --filter @industrial/client playwright test`
Expected: PASS

### Task 6: Final Verification

**Files:**
- Modify: none

- [ ] **Step 1: Run focused world tests**

Run: `corepack pnpm --filter @industrial/world test -- --runInBand`
Expected: PASS

- [ ] **Step 2: Run focused client tests**

Run: `corepack pnpm --filter @industrial/client test`
Expected: PASS

- [ ] **Step 3: Run Playwright smoke test**

Run: `corepack pnpm --filter @industrial/client playwright test`
Expected: PASS

- [ ] **Step 4: Run full workspace typecheck**

Run: `corepack pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Run full workspace tests**

Run: `corepack pnpm test`
Expected: PASS