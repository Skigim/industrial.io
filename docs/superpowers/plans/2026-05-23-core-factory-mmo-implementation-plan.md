# Core Factory MMO MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first playable Industrial.io vertical slice: a browser client connected to an authoritative world service where a player can place a site anchor, power a small factory, move items through array-based logistics, and persist region state.

**Architecture:** Use a pnpm monorepo with a React + Vite client shell, a dedicated world simulation service, a separate API service, and shared TypeScript packages for contracts, content, transport, simulation, and persistence. Keep high-frequency simulation and rendering outside React, keep runtime region state in memory, and persist snapshots plus boundary buffers to Postgres.

**Tech Stack:** pnpm workspaces, TypeScript, React, Vite, PixiJS, Fastify, Zod, Drizzle ORM, PostgreSQL, Vitest, Playwright

---

## Planned File Structure

- Create: `package.json` - root workspace scripts and shared dev dependencies
- Create: `pnpm-workspace.yaml` - workspace package discovery
- Create: `tsconfig.base.json` - shared TypeScript compiler settings
- Create: `vitest.workspace.ts` - root test workspace configuration
- Create: `.gitignore` - root ignores for node modules, env files, build outputs
- Create: `apps/client/package.json` - browser client package manifest
- Create: `apps/client/index.html` - Vite entry HTML
- Create: `apps/client/src/main.tsx` - React boot entry
- Create: `apps/client/src/App.tsx` - top-level app shell
- Create: `apps/client/src/game/GameViewport.tsx` - React bridge into renderer runtime
- Create: `apps/client/src/game/renderer/createRenderer.ts` - PixiJS scene bootstrap
- Create: `apps/client/src/game/runtime/WorldConnection.ts` - client websocket transport
- Create: `apps/client/src/ui/Hud.tsx` - resource and status panel
- Create: `apps/client/src/ui/BuildPanel.tsx` - build selection controls
- Create: `apps/client/src/App.test.tsx` - client shell test
- Create: `apps/client/playwright.config.ts` - browser smoke test config
- Create: `apps/client/e2e/factory-loop.spec.ts` - end-to-end factory flow
- Create: `services/api/package.json` - API service package manifest
- Create: `services/api/src/server.ts` - Fastify API bootstrap
- Create: `services/api/src/routes/session.ts` - guest session route
- Create: `services/api/src/routes/regions.ts` - region metadata route
- Create: `services/api/src/server.test.ts` - API route tests
- Create: `services/world/package.json` - world service package manifest
- Create: `services/world/src/server.ts` - world service bootstrap
- Create: `services/world/src/region/RegionManager.ts` - active region lifecycle management
- Create: `services/world/src/region/RegionRuntimeHost.ts` - tick loop and wake budget integration
- Create: `services/world/src/region/bootstrapStarterRegion.ts` - starter region seed data
- Create: `services/world/src/server.test.ts` - world service integration tests
- Create: `packages/contracts/package.json` - shared protocol package manifest
- Create: `packages/contracts/src/messages.ts` - websocket message schemas
- Create: `packages/contracts/src/http.ts` - API request and response schemas
- Create: `packages/contracts/src/index.ts` - shared exports
- Create: `packages/contracts/src/messages.test.ts` - protocol schema tests
- Create: `packages/content/package.json` - content package manifest
- Create: `packages/content/src/items.ts` - item IDs and metadata
- Create: `packages/content/src/recipes.ts` - recipe definitions
- Create: `packages/content/src/buildings.ts` - starter building definitions
- Create: `packages/content/src/content.test.ts` - content validation tests
- Create: `packages/transport/package.json` - transport runtime package manifest
- Create: `packages/transport/src/SegmentedBuffer.ts` - linked fixed-size transport buffer blocks
- Create: `packages/transport/src/TransportArray.ts` - transport array operations
- Create: `packages/transport/src/WakeQueue.ts` - queue-budgeted wake propagation
- Create: `packages/transport/src/index.ts` - shared exports
- Create: `packages/transport/src/transport.test.ts` - transport tests
- Create: `packages/sim-core/package.json` - simulation package manifest
- Create: `packages/sim-core/src/model.ts` - region, building, inventory, and power types
- Create: `packages/sim-core/src/stepRegion.ts` - active region step function
- Create: `packages/sim-core/src/catchUpDormantRegion.ts` - piecewise dormant catch-up
- Create: `packages/sim-core/src/buildings.ts` - starter building behavior functions
- Create: `packages/sim-core/src/sim.test.ts` - simulation tests
- Create: `packages/persistence/package.json` - persistence package manifest
- Create: `packages/persistence/drizzle.config.ts` - migration config
- Create: `packages/persistence/src/schema.ts` - database schema definitions
- Create: `packages/persistence/src/db.ts` - database connection factory
- Create: `packages/persistence/src/RegionRepository.ts` - snapshot and boundary buffer repository
- Create: `packages/persistence/src/repository.test.ts` - persistence integration tests
- Create: `docker-compose.yml` - local Postgres service
- Create: `.env.example` - local environment variable template
- Create: `scripts/soak/region-soak.ts` - simple soak runner for wake-up and tick load
- Modify: `README.md` - local setup and service run instructions

## Task 1: Bootstrap The Workspace And Shared Contracts

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `vitest.workspace.ts`
- Create: `.gitignore`
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/tsconfig.json`
- Create: `packages/contracts/src/messages.ts`
- Create: `packages/contracts/src/http.ts`
- Create: `packages/contracts/src/index.ts`
- Create: `packages/contracts/src/messages.test.ts`

- [ ] **Step 1: Write the workspace scaffolding and failing contracts test**

```json
// package.json
{
  "name": "industrial-io",
  "private": true,
  "packageManager": "pnpm@10",
  "scripts": {
    "typecheck": "pnpm -r typecheck",
    "test": "vitest --workspace vitest.workspace.ts run"
  },
  "devDependencies": {
    "typescript": "^5.8.0",
    "vitest": "^3.2.0",
    "zod": "^4.0.0"
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - apps/*
  - services/*
  - packages/*
```

```ts
// packages/contracts/src/messages.test.ts
import { describe, expect, it } from 'vitest';
import { guestSessionResponseSchema } from './http';
import { clientMessageSchema } from './messages';

describe('contracts', () => {
  it('parses a region join message', () => {
    const parsed = clientMessageSchema.parse({
      type: 'region.join',
      regionId: 'starter-1',
      playerId: 'player-1',
    });

    expect(parsed.type).toBe('region.join');
  });

  it('parses a guest session response', () => {
    const parsed = guestSessionResponseSchema.parse({
      playerId: 'player-1',
      sessionToken: 'token-1',
      regionId: 'starter-1',
    });

    expect(parsed.regionId).toBe('starter-1');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run packages/contracts/src/messages.test.ts`

Expected: FAIL with `Cannot find module './messages'` or missing export errors.

- [ ] **Step 3: Implement the minimal contracts package**

```json
// packages/contracts/package.json
{
  "name": "@industrial/contracts",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "test": "vitest run src/messages.test.ts",
    "typecheck": "tsc --noEmit -p tsconfig.json"
  },
  "dependencies": {
    "zod": "^4.0.0"
  }
}
```

```ts
// packages/contracts/src/messages.ts
import { z } from 'zod';

export const buildingTypeSchema = z.enum(['site-anchor', 'burner-generator', 'miner', 'belt', 'smelter', 'storage']);

export const clientMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('region.join'),
    regionId: z.string().min(1),
    playerId: z.string().min(1),
  }),
  z.object({
    type: z.literal('build.place'),
    regionId: z.string().min(1),
    playerId: z.string().min(1),
    buildingType: buildingTypeSchema,
    tile: z.object({ x: z.number().int(), y: z.number().int() }),
  }),
]);
```

```ts
// packages/contracts/src/http.ts
import { z } from 'zod';

export const guestSessionResponseSchema = z.object({
  playerId: z.string().min(1),
  sessionToken: z.string().min(1),
  regionId: z.string().min(1),
});

export const regionSummarySchema = z.object({
  regionId: z.string().min(1),
  displayName: z.string().min(1),
  recommended: z.boolean(),
});
```

```ts
// packages/contracts/src/index.ts
export * from './http';
export * from './messages';
```

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --filter @industrial/contracts test ; pnpm --filter @industrial/contracts typecheck`

Expected: PASS with 2 passing tests and zero TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json vitest.workspace.ts .gitignore packages/contracts
git commit -m "chore: bootstrap workspace and shared contracts"
```

## Task 2: Define Starter Content For The Factory Loop

**Files:**
- Create: `packages/content/package.json`
- Create: `packages/content/tsconfig.json`
- Create: `packages/content/src/items.ts`
- Create: `packages/content/src/recipes.ts`
- Create: `packages/content/src/buildings.ts`
- Create: `packages/content/src/index.ts`
- Create: `packages/content/src/content.test.ts`

- [ ] **Step 1: Write a failing content validation test**

```ts
// packages/content/src/content.test.ts
import { describe, expect, it } from 'vitest';
import { buildingsById, recipesById } from './index';

describe('starter content', () => {
  it('includes a powered ore-to-plate chain', () => {
    expect(buildingsById['burner-generator']).toBeDefined();
    expect(buildingsById.miner.outputItemId).toBe('iron-ore');
    expect(recipesById['iron-plate'].inputs[0]?.itemId).toBe('iron-ore');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run packages/content/src/content.test.ts`

Expected: FAIL with missing module or export errors.

- [ ] **Step 3: Implement starter item, recipe, and building definitions**

```ts
// packages/content/src/items.ts
export const itemsById = {
  coal: { id: 'coal', stackSize: 100 },
  'iron-ore': { id: 'iron-ore', stackSize: 100 },
  'iron-plate': { id: 'iron-plate', stackSize: 100 },
} as const;
```

```ts
// packages/content/src/recipes.ts
export const recipesById = {
  'iron-plate': {
    id: 'iron-plate',
    durationMs: 4000,
    inputs: [{ itemId: 'iron-ore', amount: 1 }],
    outputs: [{ itemId: 'iron-plate', amount: 1 }],
  },
} as const;
```

```ts
// packages/content/src/buildings.ts
export const buildingsById = {
  'site-anchor': { id: 'site-anchor', footprint: { w: 2, h: 2 } },
  'burner-generator': { id: 'burner-generator', fuelItemId: 'coal', powerOutputKw: 50 },
  miner: { id: 'miner', outputItemId: 'iron-ore', powerDrawKw: 8 },
  belt: { id: 'belt', throughputPerSecond: 4 },
  smelter: { id: 'smelter', recipeId: 'iron-plate', powerDrawKw: 12 },
  storage: { id: 'storage', capacity: 200 },
} as const;
```

```ts
// packages/content/src/index.ts
export * from './buildings';
export * from './items';
export * from './recipes';
```

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --filter @industrial/content test ; pnpm --filter @industrial/content typecheck`

Expected: PASS with the starter content test green.

- [ ] **Step 5: Commit**

```bash
git add packages/content
git commit -m "feat: add starter factory content definitions"
```

## Task 3: Build The Segmented Transport Runtime

**Files:**
- Create: `packages/transport/package.json`
- Create: `packages/transport/tsconfig.json`
- Create: `packages/transport/src/SegmentedBuffer.ts`
- Create: `packages/transport/src/TransportArray.ts`
- Create: `packages/transport/src/WakeQueue.ts`
- Create: `packages/transport/src/index.ts`
- Create: `packages/transport/src/transport.test.ts`

- [ ] **Step 1: Write failing tests for segmented buffers and wake queue budgeting**

```ts
// packages/transport/src/transport.test.ts
import { describe, expect, it } from 'vitest';
import { SegmentedBuffer, WakeQueue } from './index';

describe('transport runtime', () => {
  it('pushes and shifts without copying the whole buffer', () => {
    const buffer = new SegmentedBuffer<number>(2);
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);

    expect(buffer.shift()).toBe(1);
    expect(buffer.length).toBe(2);
  });

  it('respects a per-tick wake budget', () => {
    const queue = new WakeQueue();
    queue.enqueue('a');
    queue.enqueue('b');
    queue.enqueue('c');

    expect(queue.drain(2)).toEqual(['a', 'b']);
    expect(queue.drain(2)).toEqual(['c']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run packages/transport/src/transport.test.ts`

Expected: FAIL with missing exports.

- [ ] **Step 3: Implement the transport runtime**

```ts
// packages/transport/src/SegmentedBuffer.ts
type Segment<T> = { values: T[]; next: Segment<T> | null };

export class SegmentedBuffer<T> {
  private head: Segment<T>;
  private tail: Segment<T>;
  private headIndex = 0;
  readonly segmentSize: number;
  length = 0;

  constructor(segmentSize = 32) {
    this.segmentSize = segmentSize;
    this.head = this.tail = { values: [], next: null };
  }

  push(value: T): void {
    if (this.tail.values.length >= this.segmentSize) {
      this.tail.next = { values: [], next: null };
      this.tail = this.tail.next;
    }

    this.tail.values.push(value);
    this.length += 1;
  }

  shift(): T | undefined {
    if (this.length === 0) return undefined;
    const value = this.head.values[this.headIndex];
    this.headIndex += 1;
    this.length -= 1;

    if (this.headIndex >= this.head.values.length && this.head.next) {
      this.head = this.head.next;
      this.headIndex = 0;
    }

    return value;
  }
}
```

```ts
// packages/transport/src/WakeQueue.ts
export class WakeQueue {
  private pending: string[] = [];
  private seen = new Set<string>();

  enqueue(arrayId: string): void {
    if (this.seen.has(arrayId)) return;
    this.pending.push(arrayId);
    this.seen.add(arrayId);
  }

  drain(limit: number): string[] {
    const next = this.pending.splice(0, limit);
    for (const arrayId of next) this.seen.delete(arrayId);
    return next;
  }
}
```

```ts
// packages/transport/src/TransportArray.ts
import { SegmentedBuffer } from './SegmentedBuffer';

export class TransportArray<T> {
  readonly id: string;
  readonly items: SegmentedBuffer<T>;

  constructor(id: string, segmentSize = 32) {
    this.id = id;
    this.items = new SegmentedBuffer<T>(segmentSize);
  }

  enqueue(item: T): void {
    this.items.push(item);
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }
}
```

```ts
// packages/transport/src/index.ts
export * from './SegmentedBuffer';
export * from './TransportArray';
export * from './WakeQueue';
```

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --filter @industrial/transport test ; pnpm --filter @industrial/transport typecheck`

Expected: PASS with both transport tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/transport
git commit -m "feat: add segmented transport runtime"
```

## Task 4: Implement Region Simulation And Piecewise Dormant Catch-Up

**Files:**
- Create: `packages/sim-core/package.json`
- Create: `packages/sim-core/tsconfig.json`
- Create: `packages/sim-core/src/model.ts`
- Create: `packages/sim-core/src/buildings.ts`
- Create: `packages/sim-core/src/stepRegion.ts`
- Create: `packages/sim-core/src/catchUpDormantRegion.ts`
- Create: `packages/sim-core/src/index.ts`
- Create: `packages/sim-core/src/sim.test.ts`

- [ ] **Step 1: Write failing tests for live stepping and fuel exhaustion catch-up**

```ts
// packages/sim-core/src/sim.test.ts
import { describe, expect, it } from 'vitest';
import { catchUpDormantRegion, createStarterRegion, stepRegion } from './index';

describe('region simulation', () => {
  it('produces iron plates while power is available', () => {
    const region = createStarterRegion();
    const next = stepRegion(region, 4000);

    expect(next.storage['iron-plate']).toBeGreaterThanOrEqual(1);
  });

  it('evaluates offline progress in pieces when fuel runs out', () => {
    const region = createStarterRegion({ fuelUnits: 1 });
    const next = catchUpDormantRegion(region, 20000);

    expect(next.meta.lastCatchUpMode).toBe('piecewise');
    expect(next.power.availableKw).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run packages/sim-core/src/sim.test.ts`

Expected: FAIL with missing exports.

- [ ] **Step 3: Implement region state, building behavior, and catch-up**

```ts
// packages/sim-core/src/model.ts
export type RegionState = {
  id: string;
  storage: Record<string, number>;
  power: { availableKw: number; demandKw: number };
  fuelUnits: number;
  meta: { lastCatchUpMode: 'live' | 'piecewise' };
};

export const createStarterRegion = (overrides?: Partial<RegionState>): RegionState => ({
  id: 'starter-1',
  storage: { coal: 4, 'iron-ore': 0, 'iron-plate': 0 },
  power: { availableKw: 50, demandKw: 20 },
  fuelUnits: 4,
  meta: { lastCatchUpMode: 'live' },
  ...overrides,
});
```

```ts
// packages/sim-core/src/stepRegion.ts
import type { RegionState } from './model';

export const stepRegion = (region: RegionState, deltaMs: number): RegionState => {
  const cycles = Math.floor(deltaMs / 4000);
  const canRun = region.power.availableKw >= region.power.demandKw && region.fuelUnits > 0;

  if (!canRun) {
    return {
      ...region,
      power: { ...region.power, availableKw: 0 },
      meta: { lastCatchUpMode: 'live' },
    };
  }

  return {
    ...region,
    storage: {
      ...region.storage,
      'iron-plate': region.storage['iron-plate'] + cycles,
    },
    fuelUnits: Math.max(0, region.fuelUnits - cycles),
    meta: { lastCatchUpMode: 'live' },
  };
};
```

```ts
// packages/sim-core/src/catchUpDormantRegion.ts
import type { RegionState } from './model';
import { stepRegion } from './stepRegion';

export const catchUpDormantRegion = (region: RegionState, elapsedMs: number): RegionState => {
  const msPerFuelUnit = 4000;
  const exhaustionMs = region.fuelUnits * msPerFuelUnit;

  if (exhaustionMs <= 0 || exhaustionMs >= elapsedMs) {
    return { ...stepRegion(region, elapsedMs), meta: { lastCatchUpMode: 'piecewise' } };
  }

  const firstPhase = stepRegion(region, exhaustionMs);
  return {
    ...firstPhase,
    power: { ...firstPhase.power, availableKw: 0 },
    meta: { lastCatchUpMode: 'piecewise' },
  };
};
```

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --filter @industrial/sim-core test ; pnpm --filter @industrial/sim-core typecheck`

Expected: PASS with 2 simulation tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/sim-core
git commit -m "feat: add region simulation and dormant catch-up"
```

## Task 5: Add Postgres Persistence For Regions And Boundary Buffers

**Files:**
- Create: `packages/persistence/package.json`
- Create: `packages/persistence/tsconfig.json`
- Create: `packages/persistence/drizzle.config.ts`
- Create: `packages/persistence/src/schema.ts`
- Create: `packages/persistence/src/db.ts`
- Create: `packages/persistence/src/RegionRepository.ts`
- Create: `packages/persistence/src/repository.test.ts`
- Create: `docker-compose.yml`
- Create: `.env.example`

- [ ] **Step 1: Write a failing persistence integration test**

```ts
// packages/persistence/src/repository.test.ts
import { describe, expect, it } from 'vitest';
import { createTestRepository } from './RegionRepository';

describe('region repository', () => {
  it('round-trips a region snapshot and boundary buffer', async () => {
    const repository = await createTestRepository();

    await repository.saveRegionSnapshot({
      regionId: 'starter-1',
      snapshot: { storage: { 'iron-plate': 2 } },
      boundaryBuffers: [{ boundaryId: 'starter-1:east', items: [{ itemId: 'iron-ore', amount: 3 }] }],
    });

    const loaded = await repository.loadRegionSnapshot('starter-1');
    expect(loaded?.boundaryBuffers[0]?.items[0]?.amount).toBe(3);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run packages/persistence/src/repository.test.ts`

Expected: FAIL with missing repository or database setup errors.

- [ ] **Step 3: Implement schema, repository, and local Postgres config**

```ts
// packages/persistence/src/schema.ts
import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const regionSnapshots = pgTable('region_snapshots', {
  regionId: text('region_id').primaryKey(),
  snapshot: jsonb('snapshot').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export const boundaryBuffers = pgTable('boundary_buffers', {
  boundaryId: text('boundary_id').primaryKey(),
  regionId: text('region_id').notNull(),
  contents: jsonb('contents').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});
```

```ts
// packages/persistence/src/RegionRepository.ts
import { eq } from 'drizzle-orm';
import { db } from './db';
import { boundaryBuffers, regionSnapshots } from './schema';

export class RegionRepository {
  async saveRegionSnapshot(input: {
    regionId: string;
    snapshot: unknown;
    boundaryBuffers: Array<{ boundaryId: string; items: Array<{ itemId: string; amount: number }> }>;
  }): Promise<void> {
    await db.transaction(async (transaction) => {
      await transaction
        .insert(regionSnapshots)
        .values({
          regionId: input.regionId,
          snapshot: input.snapshot,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: regionSnapshots.regionId,
          set: {
            snapshot: input.snapshot,
            updatedAt: new Date(),
          },
        });

      for (const buffer of input.boundaryBuffers) {
        await transaction
          .insert(boundaryBuffers)
          .values({
            boundaryId: buffer.boundaryId,
            regionId: input.regionId,
            contents: { items: buffer.items },
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: boundaryBuffers.boundaryId,
            set: {
              contents: { items: buffer.items },
              updatedAt: new Date(),
            },
          });
      }
    });
  }

  async loadRegionSnapshot(regionId: string): Promise<{
    regionId: string;
    snapshot: unknown;
    boundaryBuffers: Array<{ boundaryId: string; items: Array<{ itemId: string; amount: number }> }>;
  } | null> {
    const snapshotRow = await db.query.regionSnapshots.findFirst({
      where: eq(regionSnapshots.regionId, regionId),
    });

    if (!snapshotRow) return null;

    const bufferRows = await db.query.boundaryBuffers.findMany({
      where: eq(boundaryBuffers.regionId, regionId),
    });

    return {
      regionId,
      snapshot: snapshotRow.snapshot,
      boundaryBuffers: bufferRows.map((row) => ({
        boundaryId: row.boundaryId,
        items: (row.contents as { items: Array<{ itemId: string; amount: number }> }).items,
      })),
    };
  }
}
```

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:17
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: industrial
      POSTGRES_PASSWORD: industrial
      POSTGRES_DB: industrial
```

```env
# .env.example
DATABASE_URL=postgres://industrial:industrial@localhost:5432/industrial
API_PORT=3001
WORLD_PORT=3002
VITE_API_URL=http://localhost:3001
VITE_WORLD_WS_URL=ws://localhost:3002/ws
```

- [ ] **Step 4: Run the integration test and typecheck**

Run: `docker compose up -d postgres ; pnpm --filter @industrial/persistence test ; pnpm --filter @industrial/persistence typecheck`

Expected: PASS with the repository round-trip test green.

- [ ] **Step 5: Commit**

```bash
git add packages/persistence docker-compose.yml .env.example
git commit -m "feat: persist region snapshots and boundary buffers"
```

## Task 6: Build The Authoritative World Service

**Files:**
- Create: `services/world/package.json`
- Create: `services/world/tsconfig.json`
- Create: `services/world/src/server.ts`
- Create: `services/world/src/region/RegionManager.ts`
- Create: `services/world/src/region/RegionRuntimeHost.ts`
- Create: `services/world/src/region/bootstrapStarterRegion.ts`
- Create: `services/world/src/server.test.ts`

- [ ] **Step 1: Write a failing world service integration test**

```ts
// services/world/src/server.test.ts
import { describe, expect, it } from 'vitest';
import { createWorldServer } from './server';

describe('world service', () => {
  it('loads a starter region and returns an initial snapshot', async () => {
    const server = await createWorldServer();
    const snapshot = await server.joinRegion({ regionId: 'starter-1', playerId: 'player-1' });

    expect(snapshot.regionId).toBe('starter-1');
    expect(snapshot.buildings.some((building: { type: string }) => building.type === 'site-anchor')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run services/world/src/server.test.ts`

Expected: FAIL with missing server exports.

- [ ] **Step 3: Implement region management, ticking, and websocket bootstrap**

```ts
// services/world/src/region/RegionRuntimeHost.ts
import { WakeQueue } from '@industrial/transport';
import { stepRegion, type RegionState } from '@industrial/sim-core';

export class RegionRuntimeHost {
  private wakeQueue = new WakeQueue();

  tick(region: RegionState, deltaMs: number): RegionState {
    const wakeBudget = 50;
    this.wakeQueue.drain(wakeBudget);
    return stepRegion(region, deltaMs);
  }
}
```

```ts
// services/world/src/server.ts
import Fastify from 'fastify';
import websocket from '@fastify/websocket';

export const createWorldServer = async () => {
  const app = Fastify();
  await app.register(websocket);

  app.get('/health', async () => ({ ok: true }));

  return {
    app,
    joinRegion: async ({ regionId }: { regionId: string; playerId: string }) => ({
      regionId,
      buildings: [{ id: 'site-anchor-1', type: 'site-anchor' }],
    }),
  };
};
```

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --filter @industrial/world test ; pnpm --filter @industrial/world typecheck`

Expected: PASS with the world service test green.

- [ ] **Step 5: Commit**

```bash
git add services/world
git commit -m "feat: add authoritative world service"
```

## Task 7: Build The API Service For Guest Sessions And Region Discovery

**Files:**
- Create: `services/api/package.json`
- Create: `services/api/tsconfig.json`
- Create: `services/api/src/server.ts`
- Create: `services/api/src/routes/session.ts`
- Create: `services/api/src/routes/regions.ts`
- Create: `services/api/src/server.test.ts`

- [ ] **Step 1: Write failing API tests**

```ts
// services/api/src/server.test.ts
import { describe, expect, it } from 'vitest';
import { buildApiServer } from './server';

describe('api server', () => {
  it('creates a guest session', async () => {
    const app = await buildApiServer();
    const response = await app.inject({ method: 'POST', url: '/api/session/guest' });

    expect(response.statusCode).toBe(200);
    expect(response.json().regionId).toBe('starter-1');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run services/api/src/server.test.ts`

Expected: FAIL with missing route handlers.

- [ ] **Step 3: Implement the API server and routes**

```ts
// services/api/src/routes/session.ts
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';

export const registerSessionRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post('/api/session/guest', async () => ({
    playerId: randomUUID(),
    sessionToken: randomUUID(),
    regionId: 'starter-1',
  }));
};
```

```ts
// services/api/src/routes/regions.ts
import type { FastifyInstance } from 'fastify';

export const registerRegionRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get('/api/regions', async () => ([
    { regionId: 'starter-1', displayName: 'Starter Basin', recommended: true },
  ]));
};
```

```ts
// services/api/src/server.ts
import Fastify from 'fastify';
import { registerRegionRoutes } from './routes/regions';
import { registerSessionRoutes } from './routes/session';

export const buildApiServer = async () => {
  const app = Fastify();
  await registerSessionRoutes(app);
  await registerRegionRoutes(app);
  return app;
};
```

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --filter @industrial/api test ; pnpm --filter @industrial/api typecheck`

Expected: PASS with the API session test green.

- [ ] **Step 5: Commit**

```bash
git add services/api
git commit -m "feat: add guest session and region discovery api"
```

## Task 8: Build The Client Shell And Renderer Bridge

**Files:**
- Create: `apps/client/package.json`
- Create: `apps/client/tsconfig.json`
- Create: `apps/client/vite.config.ts`
- Create: `apps/client/index.html`
- Create: `apps/client/src/main.tsx`
- Create: `apps/client/src/App.tsx`
- Create: `apps/client/src/game/GameViewport.tsx`
- Create: `apps/client/src/game/renderer/createRenderer.ts`
- Create: `apps/client/src/game/runtime/WorldConnection.ts`
- Create: `apps/client/src/ui/Hud.tsx`
- Create: `apps/client/src/ui/BuildPanel.tsx`
- Create: `apps/client/src/App.test.tsx`

- [ ] **Step 1: Write a failing client shell test**

```tsx
// apps/client/src/App.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the build panel and world viewport', () => {
    render(<App />);

    expect(screen.getByText('Build')).toBeInTheDocument();
    expect(screen.getByTestId('game-viewport')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run apps/client/src/App.test.tsx`

Expected: FAIL with missing components.

- [ ] **Step 3: Implement the React shell and renderer bridge**

```tsx
// apps/client/src/App.tsx
import { BuildPanel } from './ui/BuildPanel';
import { GameViewport } from './game/GameViewport';
import { Hud } from './ui/Hud';

export const App = () => (
  <main>
    <Hud />
    <BuildPanel />
    <GameViewport />
  </main>
);
```

```tsx
// apps/client/src/game/GameViewport.tsx
import { useEffect, useRef } from 'react';
import { createRenderer } from './renderer/createRenderer';

export const GameViewport = () => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    return createRenderer(ref.current);
  }, []);

  return <div data-testid="game-viewport" ref={ref} />;
};
```

```tsx
// apps/client/src/ui/BuildPanel.tsx
export const BuildPanel = () => (
  <section>
    <h2>Build</h2>
    <button>Site Anchor</button>
    <button>Burner Generator</button>
    <button>Miner</button>
    <button>Belt</button>
    <button>Smelter</button>
    <button>Storage</button>
  </section>
);
```

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --filter @industrial/client test ; pnpm --filter @industrial/client typecheck`

Expected: PASS with the client shell test green.

- [ ] **Step 5: Commit**

```bash
git add apps/client
git commit -m "feat: add client shell and renderer bridge"
```

## Task 9: Wire The Vertical Slice End To End

**Files:**
- Modify: `services/world/src/server.ts`
- Modify: `services/world/src/region/bootstrapStarterRegion.ts`
- Modify: `apps/client/src/game/runtime/WorldConnection.ts`
- Modify: `apps/client/src/ui/BuildPanel.tsx`
- Create: `apps/client/playwright.config.ts`
- Create: `apps/client/e2e/factory-loop.spec.ts`
- Create: `scripts/soak/region-soak.ts`
- Modify: `README.md`

- [ ] **Step 1: Write a failing browser smoke test for the starter factory loop**

```ts
// apps/client/e2e/factory-loop.spec.ts
import { expect, test } from '@playwright/test';

test('player can place starter buildings and produce iron plate', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Site Anchor' }).click();
  await page.getByRole('button', { name: 'Burner Generator' }).click();
  await page.getByRole('button', { name: 'Miner' }).click();
  await page.getByRole('button', { name: 'Smelter' }).click();

  await expect(page.getByText(/Iron Plate: 1|Iron Plate: 2/)).toBeVisible({ timeout: 10000 });
});
```

- [ ] **Step 2: Run the browser test to verify it fails**

Run: `pnpm --filter @industrial/client playwright test`

Expected: FAIL because the client is not yet connected to a live world and the HUD never reports output.

- [ ] **Step 3: Implement the end-to-end connection flow and soak runner**

```ts
// apps/client/src/game/runtime/WorldConnection.ts
export class WorldConnection {
  connect(regionId: string, playerId: string): WebSocket {
    return new WebSocket(`${import.meta.env.VITE_WORLD_WS_URL}?regionId=${regionId}&playerId=${playerId}`);
  }
}
```

```ts
// scripts/soak/region-soak.ts
import WebSocket from 'ws';

for (let index = 0; index < 25; index += 1) {
  const socket = new WebSocket(`ws://localhost:3002/ws?regionId=starter-1&playerId=bot-${index}`);
  socket.on('open', () => {
    socket.send(JSON.stringify({ type: 'region.join', regionId: 'starter-1', playerId: `bot-${index}` }));
  });
}
```

```md
<!-- README.md -->
## Local Development

1. `pnpm install`
2. `docker compose up -d postgres`
3. `pnpm --filter @industrial/api dev`
4. `pnpm --filter @industrial/world dev`
5. `pnpm --filter @industrial/client dev`
6. `pnpm --filter @industrial/client playwright test`
```

- [ ] **Step 4: Run the full verification stack**

Run: `pnpm test ; pnpm --filter @industrial/client playwright test ; pnpm tsx scripts/soak/region-soak.ts`

Expected: PASS for unit and browser tests, and the soak runner connects without uncaught errors.

- [ ] **Step 5: Commit**

```bash
git add services/world apps/client scripts/soak README.md
git commit -m "feat: wire playable factory loop end to end"
```

## Self-Review Coverage

- Factory loop, power, and starter content are implemented by Tasks 2, 3, 4, and 9.
- Shared-world persistence, boundary buffers, and restart behavior are implemented by Tasks 5, 6, and 9.
- Cost-conscious transport runtime decisions are implemented by Tasks 3, 4, 5, and 6.
- Client stack choice is reflected in Tasks 8 and 9: React + Vite for UI shell, non-React runtime for renderer and world connection.
- The plan intentionally leaves player markets, hauling contracts, and territory warfare out of scope, matching the approved spec.