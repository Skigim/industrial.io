# Factory-MOBA Launch Design (Local + 1v1 P2P)

## 1. Product Goal
Build a browser-based, minimalist 2D factory-MOBA where players issue RTS-style production and rally commands, and autonomous minions execute those commands across lane and objective spaces.

The launch target is:
- Local sandbox match loop (single machine)
- Networked 1v1 peer-to-peer match flow

The long-term direction is a persistent 1vX world inspired by Factorio + Screeps. Launch architecture must preserve a migration path to server-authoritative persistent simulation.

## 2. Core Experience
### 2.1 Player Interaction Model
Players do not directly control individual units. Players issue command-layer actions:
- Place and configure factory structures
- Queue and prioritize production
- Set rally points and objective targets
- Manage lane pressure via composition and routing decisions

Units are autonomous actors that execute strategic intent.

### 2.2 Match Shape (Launch)
- Format: 1v1
- Runtime: Browser
- Camera: 2D top-down
- Art direction: minimalist vector style, heavy uniform black outlines, flat muted pastel fills, no gradients, no shading

### 2.3 World Shape (Future)
- Grid-based simulation
- Expand from match-scoped worlds toward persistent 1vX world segments
- Preserve deterministic/command-sim foundations for eventual always-on simulation

## 3. Technical Approach
### 3.1 Simulation Authority (Launch)
Use P2P with command-driven simulation and periodic integrity checks:
- Exchange player commands, not full world snapshots as primary transport
- Run fixed-tick simulation on both peers
- Validate periodic checksums/hash windows
- Use repair snapshots only when divergence exceeds threshold

This provides low bandwidth and a direct path to server-authoritative migration.

### 3.2 Engine and Runtime Split
Use strict separation:
- Simulation core: framework-agnostic TypeScript package
- Rendering: Pixi-only adapter layer
- Networking: transport adapter (P2P now, dedicated server later)
- Protocol: shared schemas/serialization package

No game rule logic should depend on rendering framework or transport implementation.

### 3.3 Architecture Units
- apps/client
  - UI, input, HUD, rendering, local replay/debug views
- apps/signaling
  - Session discovery, room negotiation, WebRTC signaling
- packages/sim-core
  - ECS world model, fixed tick loop, systems, grid logic, unit behavior, combat, economy
- packages/net-protocol
  - Command schema, envelope types, serializer, checksum and replay event formats

## 4. Dependency Direction
### 4.1 Required for Launch
- Render/loop: pixi.js
- Simulation data model: bitecs
- Networking transport: simple-peer, socket.io-client
- Signaling service: express, socket.io, cors
- Schema and validation: zod
- Serialization: msgpackr
- Determinism support: seedrandom
- IDs: nanoid
- Worker bridge: comlink
- Local persistence/debug artifacts: dexie
- Tooling: typescript, vite, vitest, eslint, prettier

### 4.2 Deferred Until Needed
- Heavy pathfinding frameworks
- Dedicated authoritative server runtime for gameplay simulation
- Production matchmaking stack
- Central persistence/database service

## 5. Data Flow
### 5.1 Local Match
1. Input produces validated command intents.
2. Command enters local queue with target simulation tick.
3. Fixed-tick simulator applies command at scheduled tick.
4. Renderer consumes projected world state each frame.

### 5.2 P2P Match
1. Each peer submits local commands tagged with tick index.
2. Commands are exchanged and acknowledged over P2P data channel.
3. Both peers run same fixed-tick simulation.
4. Periodic checksums compare sim integrity.
5. If mismatch persists, lightweight repair snapshot is applied and replayed from last agreed checkpoint.

## 6. Determinism and Integrity Rules
To keep peer simulation aligned:
- Fixed simulation tick rate and integer/fixed-point where practical for core combat/economy math
- Seeded deterministic RNG per match
- Stable command ordering and tie-break rules
- No renderer-time side effects in simulation state
- Protocol version pinning in match handshake

## 7. Error Handling and Failure Modes
### 7.1 Network Issues
- Late command beyond tolerance window: pause-or-drop policy with explicit telemetry event
- Packet loss/spikes: bounded input delay strategy, command resend on missing ack
- Disconnect: immediate pause and reconnect grace period; then forfeit resolution policy

### 7.2 Divergence
- Checksum mismatch once: mark warning and continue
- Repeated mismatch window: request repair state
- Repair failure: terminate match with deterministic diagnostic bundle for replay analysis

### 7.3 Validation and Security (Launch Scope)
- Validate all inbound commands with shared zod schemas
- Reject malformed/out-of-window commands
- Treat launch networking as low-trust but not cheat-proof (acceptable for early P2P release)

## 8. Testing Strategy
### 8.1 Unit Tests
- sim-core systems: production, path assignment, target selection, combat resolution, resource flow
- protocol validators and serializers

### 8.2 Determinism Tests
- Same seed + command timeline => byte-equivalent outcome snapshots
- Cross-run replay consistency tests

### 8.3 Network Robustness Tests
- Simulated packet delay/loss in headless test harness
- Command gap, duplicate, out-of-order handling

### 8.4 Integration Tests
- Local single-player match boot and step
- 1v1 P2P session setup and synchronized progression smoke test

## 9. Milestones
### Milestone A: Offline Vertical Slice
- Grid world with one lane and one objective
- Factory placement + production queue
- Autonomous minion spawn and lane movement
- Win condition based on objective damage or control

### Milestone B: P2P 1v1
- Signaling + room join flow
- Command exchange and fixed-tick sync
- Checksum and repair path

### Milestone C: Instrumentation + Replays
- Match event logging
- Replay playback for divergence debugging
- Basic telemetry around latency, divergence, and command timing

## 10. Migration Plan to Persistent 1vX
- Keep sim-core transport-agnostic so it can run in Node authoritative service
- Replace P2P host responsibilities with server process while preserving command protocol
- Introduce durable world storage and partitioning once scale and funding justify infra
- Expand from match instances to persistent region simulation without rewriting core rules

## 11. Explicit Out-of-Scope for Launch
- Full persistent shared world
- 1vX live concurrency model
- Anti-cheat hardening beyond schema validation and sync checks
- Production-grade account system and economy backend

## 12. Success Criteria for Launch
- Players can complete a full local match loop with factory commands and autonomous unit pressure
- Two players can complete a P2P 1v1 with stable sync under normal consumer network conditions
- Determinism tests and replay diagnostics catch and explain divergence incidents
