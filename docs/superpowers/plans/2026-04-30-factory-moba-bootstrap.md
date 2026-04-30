# Factory-MOBA Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap a browser-based 2D factory-MOBA codebase with local play and 1v1 P2P foundations using Pixi + ECS, deterministic command simulation, and checksum-based sync safety.

**Architecture:** Use a pnpm workspace with clear boundaries: apps/client for rendering/UI, apps/signaling for WebRTC signaling, packages/net-protocol for shared command schemas and serialization, and packages/sim-core for deterministic game simulation. Keep simulation pure and transport/render agnostic so P2P host logic can later migrate to server authority.

**Tech Stack:** pnpm workspaces, TypeScript, Vite, Pixi, bitecs, simple-peer, socket.io, zod, msgpackr, seedrandom, nanoid, comlink, dexie, Vitest, ESLint, Prettier.

---

### Task 1: Bootstrap Workspace and Tooling

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `.eslintrc.cjs`
- Create: `.prettierrc.json`
- Create: `.gitignore`

- [ ] **Step 1: Create workspace file and root package manifest**

```yaml
# pnpm-workspace.yaml
packages:
  - apps/*
  - packages/*
```

```json
{
  "name": "industrial-io",
  "private": true,
  "version": "0.1.0",
  "packageManager": "pnpm@10.12.4",
  "scripts": {
    "dev": "concurrently -n client,signal -c cyan,yellow \"pnpm --filter @industrial/client dev\" \"pnpm --filter @industrial/signaling dev\"",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "format": "prettier --write .",
    "clean": "rimraf node_modules apps/*/node_modules packages/*/node_modules apps/*/dist packages/*/dist"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^8.22.0",
    "@typescript-eslint/parser": "^8.22.0",
    "@vitest/coverage-v8": "^3.2.4",
    "concurrently": "^9.1.2",
    "eslint": "^9.20.1",
    "prettier": "^3.4.2",
    "rimraf": "^6.0.1",
    "typescript": "^5.7.3",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 2: Add root TypeScript, lint, format, and ignore config**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

```js
// .eslintrc.cjs
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  ignorePatterns: ["dist", "node_modules"]
};
```

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100
}
```

```gitignore
node_modules/
dist/
.vite/
coverage/
.DS_Store
*.log
```

- [ ] **Step 3: Install root dependencies**

Run: `corepack enable && corepack prepare pnpm@10.12.4 --activate && pnpm install`
Expected: install completes and creates `pnpm-lock.yaml`.

- [ ] **Step 4: Verify base tooling runs**

Run: `pnpm lint && pnpm test`
Expected: commands succeed (possibly with no tests yet).

- [ ] **Step 5: Commit**

```bash
git add pnpm-workspace.yaml package.json tsconfig.base.json .eslintrc.cjs .prettierrc.json .gitignore pnpm-lock.yaml
git commit -m "chore: bootstrap workspace tooling"
```

### Task 2: Create Shared Protocol Package (Commands and Integrity)

**Files:**
- Create: `packages/net-protocol/package.json`
- Create: `packages/net-protocol/tsconfig.json`
- Create: `packages/net-protocol/src/commands.ts`
- Create: `packages/net-protocol/src/codec.ts`
- Create: `packages/net-protocol/src/checksum.ts`
- Create: `packages/net-protocol/src/index.ts`
- Test: `packages/net-protocol/test/commands.test.ts`

- [ ] **Step 1: Create failing tests for command validation and serialization**

```ts
import { describe, expect, it } from "vitest";
import { decodeEnvelope, encodeEnvelope, JoinMatchCommandSchema } from "../src";

describe("net-protocol", () => {
  it("rejects malformed command envelopes", () => {
    expect(() => JoinMatchCommandSchema.parse({ kind: "join" })).toThrow();
  });

  it("round-trips command envelopes", () => {
    const envelope = {
      matchId: "m1",
      tick: 10,
      senderId: "p1",
      command: { kind: "set_rally", x: 5, y: 12 }
    };
    const bytes = encodeEnvelope(envelope);
    const decoded = decodeEnvelope(bytes);
    expect(decoded).toEqual(envelope);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @industrial/net-protocol test`
Expected: FAIL because source files/schemas are not defined yet.

- [ ] **Step 3: Implement protocol schemas, codec, and checksum helper**

```ts
// src/commands.ts
import { z } from "zod";

export const JoinMatchCommandSchema = z.object({
  kind: z.literal("join_match"),
  preferredSpawn: z.object({ x: z.number().int(), y: z.number().int() }).optional()
});

export const SetRallyCommandSchema = z.object({
  kind: z.literal("set_rally"),
  x: z.number().int(),
  y: z.number().int()
});

export const QueueUnitCommandSchema = z.object({
  kind: z.literal("queue_unit"),
  factoryId: z.string(),
  unitType: z.enum(["scout", "brute", "siege"]),
  quantity: z.number().int().positive()
});

export const CommandSchema = z.discriminatedUnion("kind", [
  JoinMatchCommandSchema,
  SetRallyCommandSchema,
  QueueUnitCommandSchema
]);

export const CommandEnvelopeSchema = z.object({
  matchId: z.string(),
  tick: z.number().int().nonnegative(),
  senderId: z.string(),
  command: CommandSchema
});

export type CommandEnvelope = z.infer<typeof CommandEnvelopeSchema>;
```

```ts
// src/codec.ts
import { Packr, Unpackr } from "msgpackr";
import { CommandEnvelope, CommandEnvelopeSchema } from "./commands";

const packr = new Packr();
const unpackr = new Unpackr();

export function encodeEnvelope(envelope: CommandEnvelope): Uint8Array {
  return packr.pack(CommandEnvelopeSchema.parse(envelope));
}

export function decodeEnvelope(bytes: Uint8Array): CommandEnvelope {
  return CommandEnvelopeSchema.parse(unpackr.unpack(bytes));
}
```

```ts
// src/checksum.ts
export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }
  return hash >>> 0;
}
```

- [ ] **Step 4: Export package API and add package metadata**

```ts
// src/index.ts
export * from "./commands";
export * from "./codec";
export * from "./checksum";
```

```json
{
  "name": "@industrial/net-protocol",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "lint": "eslint src test --ext .ts"
  },
  "dependencies": {
    "msgpackr": "^1.11.2",
    "nanoid": "^5.1.5",
    "zod": "^3.24.2"
  }
}
```

- [ ] **Step 5: Run tests and commit**

Run: `pnpm --filter @industrial/net-protocol test`
Expected: PASS.

```bash
git add packages/net-protocol
git commit -m "feat: add shared command protocol package"
```

### Task 3: Create Simulation Core Package (Deterministic Tick Engine)

**Files:**
- Create: `packages/sim-core/package.json`
- Create: `packages/sim-core/tsconfig.json`
- Create: `packages/sim-core/src/types.ts`
- Create: `packages/sim-core/src/match.ts`
- Create: `packages/sim-core/src/systems/production.ts`
- Create: `packages/sim-core/src/systems/movement.ts`
- Create: `packages/sim-core/src/index.ts`
- Test: `packages/sim-core/test/determinism.test.ts`

- [ ] **Step 1: Write failing determinism test**

```ts
import { describe, expect, it } from "vitest";
import { createMatch, hashState, stepMatch } from "../src";

describe("sim-core determinism", () => {
  it("produces identical hash for same seed and commands", () => {
    const a = createMatch({ seed: "seed-1" });
    const b = createMatch({ seed: "seed-1" });

    for (let tick = 0; tick < 300; tick += 1) {
      stepMatch(a, tick, []);
      stepMatch(b, tick, []);
    }

    expect(hashState(a)).toBe(hashState(b));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @industrial/sim-core test`
Expected: FAIL because match engine does not exist yet.

- [ ] **Step 3: Implement minimal fixed-tick deterministic simulation**

```ts
// src/match.ts
import seedrandom from "seedrandom";
import { fnv1a32 } from "@industrial/net-protocol";

export type MatchState = {
  tick: number;
  seed: string;
  rng: seedrandom.PRNG;
  resources: Record<string, number>;
};

export function createMatch(input: { seed: string }): MatchState {
  return {
    tick: 0,
    seed: input.seed,
    rng: seedrandom(input.seed),
    resources: { p1: 100, p2: 100 }
  };
}

export function stepMatch(state: MatchState, tick: number): void {
  state.tick = tick;
  const gain = Math.floor(state.rng() * 2);
  state.resources.p1 += gain;
  state.resources.p2 += gain;
}

export function hashState(state: MatchState): number {
  return fnv1a32(JSON.stringify({ tick: state.tick, resources: state.resources }));
}
```

- [ ] **Step 4: Wire exports/package metadata and run tests**

Run: `pnpm --filter @industrial/sim-core test`
Expected: PASS.

```bash
git add packages/sim-core
git commit -m "feat: add deterministic simulation core skeleton"
```

### Task 4: Create Signaling Service App

**Files:**
- Create: `apps/signaling/package.json`
- Create: `apps/signaling/tsconfig.json`
- Create: `apps/signaling/src/server.ts`
- Test: `apps/signaling/test/rooms.test.ts`

- [ ] **Step 1: Write failing signaling room behavior test**

```ts
import { describe, expect, it } from "vitest";
import { createRoomStore } from "../src/server";

describe("room store", () => {
  it("creates and joins up to two peers", () => {
    const store = createRoomStore();
    const room = store.createRoom("owner");
    expect(store.joinRoom(room.id, "guest")).toBe(true);
    expect(store.joinRoom(room.id, "third")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @industrial/signaling test`
Expected: FAIL due missing implementation.

- [ ] **Step 3: Implement Express + Socket.IO signaling skeleton**

```ts
import express from "express";
import { Server } from "socket.io";
import { createServer } from "node:http";
import { nanoid } from "nanoid";

type Room = { id: string; peers: string[] };

export function createRoomStore() {
  const rooms = new Map<string, Room>();
  return {
    createRoom(ownerId: string) {
      const room = { id: nanoid(8), peers: [ownerId] };
      rooms.set(room.id, room);
      return room;
    },
    joinRoom(roomId: string, peerId: string) {
      const room = rooms.get(roomId);
      if (!room || room.peers.length >= 2) return false;
      room.peers.push(peerId);
      return true;
    }
  };
}

if (process.env.NODE_ENV !== "test") {
  const app = express();
  const server = createServer(app);
  const io = new Server(server, { cors: { origin: "*" } });
  const store = createRoomStore();

  io.on("connection", (socket) => {
    socket.on("room:create", () => socket.emit("room:created", store.createRoom(socket.id)));
    socket.on("room:join", (roomId: string) => {
      socket.emit("room:join-result", { ok: store.joinRoom(roomId, socket.id) });
    });
  });

  server.listen(8787);
}
```

- [ ] **Step 4: Run tests and commit**

Run: `pnpm --filter @industrial/signaling test`
Expected: PASS.

```bash
git add apps/signaling
git commit -m "feat: add signaling service skeleton"
```

### Task 5: Create Client App with Pixi and Sim Adapter

**Files:**
- Create: `apps/client/package.json`
- Modify: `apps/client/index.html`
- Create: `apps/client/src/main.ts`
- Create: `apps/client/src/game/bootstrap.ts`
- Create: `apps/client/src/game/render/worldRenderer.ts`
- Create: `apps/client/src/game/sim/localLoop.ts`
- Test: `apps/client/src/game/sim/localLoop.test.ts`

- [ ] **Step 1: Write failing local tick loop test**

```ts
import { describe, expect, it } from "vitest";
import { createLocalLoop } from "./localLoop";

describe("local loop", () => {
  it("advances fixed ticks", () => {
    const loop = createLocalLoop(20);
    loop.advanceMs(100);
    expect(loop.tick).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @industrial/client test`
Expected: FAIL due missing loop implementation.

- [ ] **Step 3: Implement loop and minimal Pixi bootstrap**

```ts
// src/game/sim/localLoop.ts
export function createLocalLoop(tickMs: number) {
  let accumulator = 0;
  let tick = 0;
  return {
    get tick() {
      return tick;
    },
    advanceMs(delta: number) {
      accumulator += delta;
      while (accumulator >= tickMs) {
        accumulator -= tickMs;
        tick += 1;
      }
    }
  };
}
```

```ts
// src/main.ts
import { bootstrapGame } from "./game/bootstrap";

bootstrapGame(document.getElementById("app") as HTMLDivElement);
```

```ts
// src/game/bootstrap.ts
import { Application, Graphics } from "pixi.js";

export async function bootstrapGame(container: HTMLDivElement): Promise<void> {
  const app = new Application();
  await app.init({ width: 1280, height: 720, background: "#f2eee7" });
  container.appendChild(app.canvas);

  const lane = new Graphics().rect(100, 280, 1080, 120).stroke({ color: 0x111111, width: 4 });
  app.stage.addChild(lane);
}
```

- [ ] **Step 4: Run tests and client dev server smoke test**

Run: `pnpm --filter @industrial/client test && pnpm --filter @industrial/client build`
Expected: PASS and build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/client
git commit -m "feat: add pixi client bootstrap and local loop"
```

### Task 6: Wire P2P Command Exchange and Shared Protocol

**Files:**
- Create: `apps/client/src/net/p2pSession.ts`
- Create: `apps/client/src/net/signalingClient.ts`
- Create: `apps/client/src/net/commandBuffer.ts`
- Modify: `apps/client/src/game/sim/localLoop.ts`
- Test: `apps/client/src/net/commandBuffer.test.ts`

- [ ] **Step 1: Write failing test for command ordering and dedupe**

```ts
import { describe, expect, it } from "vitest";
import { CommandBuffer } from "./commandBuffer";

describe("command buffer", () => {
  it("returns stable ordered commands per tick", () => {
    const b = new CommandBuffer();
    b.push({ matchId: "m", tick: 5, senderId: "b", command: { kind: "set_rally", x: 1, y: 1 } });
    b.push({ matchId: "m", tick: 5, senderId: "a", command: { kind: "set_rally", x: 0, y: 0 } });
    const out = b.takeForTick(5);
    expect(out.map((c) => c.senderId)).toEqual(["a", "b"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @industrial/client test`
Expected: FAIL due missing command buffer.

- [ ] **Step 3: Implement command buffer and protocol-driven exchange stubs**

```ts
// src/net/commandBuffer.ts
import type { CommandEnvelope } from "@industrial/net-protocol";

export class CommandBuffer {
  private byTick = new Map<number, Map<string, CommandEnvelope>>();

  push(envelope: CommandEnvelope): void {
    if (!this.byTick.has(envelope.tick)) this.byTick.set(envelope.tick, new Map());
    this.byTick.get(envelope.tick)!.set(envelope.senderId, envelope);
  }

  takeForTick(tick: number): CommandEnvelope[] {
    const bucket = this.byTick.get(tick);
    if (!bucket) return [];
    this.byTick.delete(tick);
    return [...bucket.values()].sort((a, b) => a.senderId.localeCompare(b.senderId));
  }
}
```

- [ ] **Step 4: Run tests and commit**

Run: `pnpm --filter @industrial/client test`
Expected: PASS.

```bash
git add apps/client/src/net apps/client/src/game/sim/localLoop.ts apps/client/src/net/commandBuffer.test.ts
git commit -m "feat: add p2p command buffering primitives"
```

### Task 7: Add Checksum Window and Repair Trigger Logic

**Files:**
- Create: `packages/sim-core/src/integrity.ts`
- Create: `apps/client/src/net/integrityMonitor.ts`
- Test: `packages/sim-core/test/integrity.test.ts`
- Test: `apps/client/src/net/integrityMonitor.test.ts`

- [ ] **Step 1: Write failing test for mismatch threshold behavior**

```ts
import { describe, expect, it } from "vitest";
import { IntegrityMonitor } from "../src/net/integrityMonitor";

describe("IntegrityMonitor", () => {
  it("requests repair after repeated mismatches", () => {
    const monitor = new IntegrityMonitor(3);
    expect(monitor.note(false)).toBe("ok");
    expect(monitor.note(false)).toBe("ok");
    expect(monitor.note(false)).toBe("repair");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL for missing monitor/integrity modules.

- [ ] **Step 3: Implement checksum window monitor and event outcomes**

```ts
// apps/client/src/net/integrityMonitor.ts
export class IntegrityMonitor {
  private mismatches = 0;

  constructor(private readonly threshold: number) {}

  note(match: boolean): "ok" | "repair" {
    if (match) {
      this.mismatches = 0;
      return "ok";
    }
    this.mismatches += 1;
    if (this.mismatches >= this.threshold) {
      this.mismatches = 0;
      return "repair";
    }
    return "ok";
  }
}
```

- [ ] **Step 4: Run tests and commit**

Run: `pnpm test`
Expected: PASS across all packages.

```bash
git add packages/sim-core/src/integrity.ts packages/sim-core/test/integrity.test.ts apps/client/src/net/integrityMonitor.ts apps/client/src/net/integrityMonitor.test.ts
git commit -m "feat: add checksum mismatch monitoring"
```

### Task 8: Verify End-to-End Dev Flow and Document Runbook

**Files:**
- Create: `docs/superpowers/runbooks/bootstrap-playtest.md`
- Modify: `README.md`

- [ ] **Step 1: Add runbook for local and 1v1 P2P smoke tests**

```md
# Bootstrap Playtest Runbook

## Local loop
1. `pnpm install`
2. `pnpm --filter @industrial/client dev`
3. Confirm lane scene renders and local tick counter advances.

## Signaling + client
1. `pnpm --filter @industrial/signaling dev`
2. `pnpm --filter @industrial/client dev`
3. Open two browser tabs, create/join room, confirm command exchange logs.

## Validation
- `pnpm lint`
- `pnpm test`
- `pnpm build`
```

- [ ] **Step 2: Update root README quickstart**

```md
## Development Quickstart

```bash
corepack enable
corepack prepare pnpm@10.12.4 --activate
pnpm install
pnpm dev
```

See `docs/superpowers/runbooks/bootstrap-playtest.md` for local and P2P smoke testing.
```

- [ ] **Step 3: Run full verification command set**

Run: `pnpm lint && pnpm test && pnpm build`
Expected: all commands PASS.

- [ ] **Step 4: Commit and request review**

```bash
git add README.md docs/superpowers/runbooks/bootstrap-playtest.md
git commit -m "docs: add bootstrap runbook and quickstart"
```
