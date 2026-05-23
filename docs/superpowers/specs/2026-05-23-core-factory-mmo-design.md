# Industrial.io Core Factory MMO Design

Date: 2026-05-23
Status: Draft for review

## Summary

Industrial.io should start as a shared-world factory-building MMO with a strong local logistics and power-management loop. The first playable version should prove that building, scaling, and operating industrial sites in a persistent online world is fun before adding full player markets, territory warfare, or deep political systems.

The MVP centers on a small but meaningful factory game: players establish a site, extract raw resources, route them through a compact production graph, keep the site powered, and solve throughput problems caused by distance, congestion, and storage pressure. The world is multiplayer and persistent from the start, but the first version should emphasize coexistence, location pressure, and visible player industry rather than open conquest.

## Goals

- Prove the core factory loop in a persistent shared world.
- Make throughput and power the primary early optimization problems.
- Introduce local logistics pressure early enough that transport cost feels fundamental.
- Keep the MMO layer visible through shared map space, neighboring sites, and persistent world state.
- Keep hosting and persistence architecture inexpensive enough for an MVP without locking the project into a dead-end platform.

## Non-Goals For This MVP

- Full territory control or sovereignty warfare.
- Open PvP as the main game driver.
- Player-run trade hubs and the full market system.
- Deep faction governance or diplomacy systems.
- Large recipe trees or late-game content breadth.
- A fully scale-hardened live-service backend.

## Product Framing

The first version should feel like an online industrial frontier. Players are not building in isolated private instances. They exist on a persistent shared map where resource quality, spacing, and nearby activity matter. The primary question for the MVP is simple: is it fun to build and scale a power-constrained factory in a world where space and transport are meaningful?

Trade remains part of the long-term product direction, but it is not the first system to build. The market layer should come after the factory game is proven. The initial factory design should still preserve the future identity of the game by making movement of value through space an explicit cost.

## Core Gameplay Loop

The player loop for the first playable version is:

1. Find a viable build site near useful deposits.
2. Place a site anchor and basic industrial footprint.
3. Extract raw materials from nearby deposits.
4. Route materials through logistics links into processing buildings.
5. Convert intermediates into a small set of higher-value manufactured outputs.
6. Expand power generation and distribution as load increases.
7. Diagnose and resolve bottlenecks caused by routing distance, throughput ceilings, storage overflow, and power shortage.
8. Scale the factory through better design rather than mere machine spam.

The MVP should prove that the act of stabilizing and scaling a factory is compelling on its own.

## Core Systems

### Shared World

The game world is persistent and multiplayer from the start. Players should see evidence of other players' industry, compete for desirable locations, and feel local spatial pressure. The MMO layer in v1 comes from coexistence and persistence, not from large-scale war.

Industrial regions should allow new players to start reliably, while still making some sites more desirable than others. Site placement should matter, but the system should avoid easy griefing where players can invalidate a new site by crowding directly on top of it.

### Site Anchor

Each player or group operates from a site anchor. The site anchor defines the site's ownership, permissions, and active industrial footprint. It provides the foundation for later expansion into territory, permissions, and hub ownership without requiring those larger systems now.

The site anchor should also govern logistics ingress and egress permissions. External infrastructure should not be able to merge into, split from, or side-load directly into a site's internal transport arrays unless the owner has granted explicit group access or public trading permissions. This prevents shared-world griefing where another player can contaminate or intentionally compress a high-throughput line with unwanted inputs.

### Resource Deposits

Deposits should be fixed world resources that support planning and optimization. For the MVP, deposits should be stable enough that players can learn layout and infrastructure decisions without frequent forced relocation. Deposits may vary in quality, output, or adjacency to other resources to make location meaningful.

### Extraction

Extraction buildings convert deposits into raw material streams. These buildings should be simple enough for new players to use immediately, but still impose output rates that later systems can scale or optimize around.

### Logistics Layer

The logistics layer should include at least short-range transport systems such as belts and pipes, plus a basic means of bridging awkward gaps or separated sub-sites. The purpose is not full freight simulation in v1. The purpose is to ensure that distance, routing, and throughput already matter.

Transport should be constrained enough that players face meaningful decisions around centralization versus distributed outposts. Distance should carry a cost in complexity, power use, capacity, or maintenance.

Transport simulation should be implemented around unified memory arrays for active transport networks rather than per-entity O(N) iteration across every belt, pipe, or hauling component each tick. In practice, loaded regions should organize transport state into contiguous buffers or structure-of-arrays style data for flow, occupancy, throughput, and connectivity so the simulation can process only the active network slices it needs. This keeps the logistics layer compatible with the low-cost hosting goal and gives the game room to scale up active factories before transport updates become the dominant server cost.

Continuous transport arrays should not straddle region boundaries. If a belt line, pipe line, or similar network crosses from one simulation region into another, the crossing must terminate at an explicit hand-off buffer or gate inventory on the border. Region A deposits into that boundary object and Region B pulls from it as a separate transport array. This keeps rollback, recovery, and persistence concerns isolated to a transactional inventory point instead of creating a single logical array that can desynchronize across regions.

Boundary hand-off buffers are bounded inventories, not infinite mailboxes. For the MVP, each boundary object should have a documented default capacity, for example 256 item units, and a configurable hard maximum, for example 4096 item units. The default overflow behavior should be producer backpressure: if the buffer is full, the producing side stalls further deposits until capacity is available. Lossy drop policies or explicit overflow rejection can exist as later configurable modes, but the baseline contract for this slice is no silent item loss.

Rollback and desync recovery should preserve one invariant: committed cross-region transfers are never lost or duplicated. Boundary buffers should therefore persist a simple monotonically increasing hand-off sequence with their committed contents, and any replay or re-pull after one-sided rollback must be idempotent against that committed history until both sides converge on the same checkpoint.

Performance risk in this model shifts away from raw per-item iteration and toward topology changes and wake-up cascades. Sleeping arrays should remain cheap, but large factory restarts must not cause unbounded same-tick activation spikes. The runtime should therefore support lightweight wake-up throttling or staged reactivation of neighboring arrays, and transport memory layouts should avoid frequent whole-array reallocation during player edits by using stable segmented buffers or other deque-like storage patterns where appropriate.

Factory edits should not require full memory copies of active transport arrays. Transport storage should use segmented buffers composed of linked, fixed-size memory blocks so belts, pipes, and similar lines can grow, shrink, split, or merge with minimal copying and without frequent array reallocation.

Wake-up propagation should be mediated by a region-level wake-up queue rather than immediate recursive activation. When one array wakes an upstream or downstream neighbor, the neighbor should be enqueued for evaluation by the main simulation loop. The region should process wake-ups against a configurable per-tick budget, for example 50 array wake-up evaluations per frame, so a large bottleneck release cannot force an unbounded cascade on a single tick.

### Processing And Assembly

The initial production graph should stay intentionally small:

- one raw extraction tier
- one processing tier
- one assembly tier
- one supporting power tier

This is enough complexity to expose bottlenecks without drowning the player in recipe sprawl. Higher-value outputs should require a stable chain rather than a single-step conversion.

### Storage Buffers

Containers and tanks should absorb temporary imbalances, surface bottlenecks, and create visible industrial pressure points. Storage is important because it makes problems legible: backed-up belts, empty buffers, and starved assemblers all help players understand why their factory is underperforming.

### Power Network

Power is a first-class design constraint in the MVP. Factories should not run at full performance if generation, distribution, or supply is insufficient. Brownouts, stalls, or efficiency loss should be understandable outcomes of poor power planning.

This keeps factory expansion from collapsing into pure machine count. It also gives the player a second major optimization axis alongside throughput.

## Shared-World Interaction Model

Players should matter to one another in the MVP even before formal markets or warfare exist. That interaction comes through site competition, visible neighboring infrastructure, local crowding, and the social reality of building in a shared world.

The first version should avoid making the shared world feel toothless, but it should also avoid collapsing into destructive interference. Other players should affect your choices through geography and opportunity cost more often than through direct destruction.

## Logistics Pressure And Future PvP Hooks

The MVP should include moderate logistics pressure. Materials should not teleport freely across the factory or across nearby outposts. Players should feel that moving value through space costs something.

This decision is important because later trade and PvP systems will build on it. Trade hubs, hauling contracts, chokepoints, raids, and territorial control all make more sense if the factory game already teaches that location and transport matter.

In the MVP, that pressure should be strong enough to shape design but not so punishing that the player spends all their time manually shuttling goods instead of building.

## Future Economy Direction

The long-term economy direction is player-to-player trade only: useful goods are produced by players, not spawned by NPC vendors. Standard market trades will use a shared currency, while barter can exist through explicit contract systems later.

When implemented, the intended market shape is:

- globally visible listings
- local pickup at the selling hub
- player-owned hubs acting as sovereign vending machines
- system-maintained public hubs for open access
- hub outage or destruction immediately delists goods while leaving stored inventory as reclaimable or lootable physical stock

This is explicitly future scope, not MVP scope, but the factory and logistics design should preserve it as the natural next step.

## Data Shape

The MVP creates three broad categories of data.

### Durable Relational State

Persistent world entities belong in a relational store:

- players and authentication identities
- organizations or groups
- site anchors and permissions
- map regions and deposits
- building instances and their configuration
- logistics links and storage inventories
- recipe definitions and item definitions
- ownership and placement metadata

This data should be modeled canonically in Postgres.

### Hot Runtime Simulation State

Active simulation should run in memory for loaded regions. This includes:

- machine working state and timers
- power generation, load, and outages
- inventory transfer between connected entities
- short-lived throughput calculations
- active player interactions inside loaded regions

Transport-heavy subsystems should prefer unified memory arrays over scattered entity-object iteration. Belt lanes, pipe segments, and similar flow systems should be represented in region-local runtime buffers that can be processed in tight passes, ideally over active network partitions rather than all placed entities.

Cross-region transport exchange should resolve through explicit boundary buffers whose contents are durable and independently reconcilable. Runtime state inside a region can be aggressive and in-memory, but boundary inventories must be simple enough to recover cleanly if one neighboring region rolls back or reloads independently.

This data should not be written to the database on every tick.

### Operational History

The system should retain append-only operational records for debugging and recovery support, such as region save events, major state transitions, and important inventory or placement events. This does not need to be full event sourcing in v1.

Operational records should be sufficient to reconcile boundary hand-off buffers and other cross-region inventory transfer points after crashes or partial rollbacks.

### Dormant Region Catch-Up

Dormant regions should not require frame-by-frame replay on reload. For self-contained production networks, the simulation should be able to advance state in larger deterministic steps using known machine rates, transport speeds, current buffer contents, and elapsed time.

Catch-up logic should support piecewise linear evaluation when a factory's operating conditions change during the offline window. For example, if a generator or machine fuel buffer will exhaust at time $t_{exhaustion}$ and $t_{exhaustion} < \Delta t$, the server should resolve the network at the current full-rate regime up to $t_{exhaustion}$, recompute the resulting constrained throughput or stall state, and then apply the remaining time under the degraded regime. The same general approach should apply to other predictable threshold crossings such as buffer fill, input starvation, or power collapse.

Closed-form or piecewise catch-up should only be applied within a bounded offline window. The MVP should define a configurable maximum offline duration, for example 24 hours during development testing, beyond which the loader falls back to chunked replay or an operator-reviewed recovery path rather than unbounded extrapolation.

Elapsed time for catch-up should come from monotonic runtime measurements rather than naive wall-clock assumptions. Negative deltas should be clamped to zero, large discontinuities should be capped to the configured offline window, and those discontinuities should be logged for review.

Snapshots must also carry simulation/content version metadata for recipe rates, power rules, and transport behavior. If a dormant region loads under a mismatched version, the runtime should either apply a deterministic migration or fall back to replay from the stored snapshot; if neither path is available, the region should remain unloaded rather than applying ambiguous catch-up.

This is most reliable when transport state is represented in explicit arrays and all cross-region exchange is isolated through hand-off buffers. Under those conditions, the server can often compute offline progress in closed-form or batched passes instead of replaying every tick. The design should not assume arbitrary live cross-region dependencies can always be resolved this way; deterministic catch-up is a goal for isolated regions and explicit boundary inventories, not a blanket promise for every future system.

## Service Architecture

The recommended MVP architecture is a small number of long-lived services:

- one API service for account, session, metadata, and administrative endpoints
- one authoritative world simulation service for region state and gameplay rules
- one Postgres database for durable world state
- object storage for snapshots, backups, and logs

The simulation service should keep active regions in memory and persist snapshots or important state changes on an interval. Postgres is the durable system of record, but it should not be the component that processes simulation ticks.

Region boundaries should be treated as recovery boundaries as well as simulation boundaries. The architecture should prefer region-local simulation with explicit, durable hand-off points at borders so one region can restart or roll back without corrupting a neighbor's transport state.

Redis should be optional rather than mandatory in v1. It can be added later if queues, caching, or coordination pressure actually justify it.

## Hosting And Vendor Guidance

The hosting goal is a balanced MVP: keep costs low, but do not choose a platform that guarantees a rewrite after the first bit of traction.

Recommended baseline:

- long-lived backend processes on a low-cost VM provider such as Hetzner or OVHcloud
- managed Postgres through Neon or Supabase for low-ops persistence
- Cloudflare for DNS, TLS, and edge protection
- Cloudflare R2 or similar low-cost object storage for backups, snapshots, and logs

Avoid Kubernetes for the MVP. Avoid a serverless-first simulation architecture. Persistent factory simulation is a better fit for always-on processes than for function-based infrastructure.

## Cost-Conscious Design Implications

To keep hosting costs under control, the simulation model should prefer:

- region-based activation rather than simulating the entire world at full fidelity at all times
- in-memory ticking with batched persistence
- unified memory arrays for transport and other high-frequency simulation paths
- explicit boundary buffers instead of cross-region continuous transport arrays
- wake-up throttling or staged activation for sleeping transport networks
- compact production graphs in the MVP
- limited active entity counts per region
- deterministic simulation rules that are easy to test and profile

These constraints are not merely technical. They should influence feature scope so the product does not accidentally require expensive infrastructure before the core loop is validated.

## MVP Success Criteria

The MVP is successful if:

- a new player can establish a site and run a basic production chain
- factories fail for understandable reasons such as power shortage or routing congestion
- scaling output requires better layout and systems thinking
- multiple players can coexist in the same persistent world and visibly influence location choices
- transport distance changes design decisions even before markets exist
- the backend persists world state reliably enough to survive restarts without manual recovery
- hosting remains affordable for early development and small-scale live testing

## Testing Strategy

Testing should focus on correctness and operational stability, not just API coverage.

### Simulation Tests

Deterministic tests should cover:

- recipe execution
- inventory movement
- power behavior
- machine state transitions
- bottleneck and starvation edge cases
- piecewise offline catch-up across fuel exhaustion, buffer fill, and power-loss thresholds
- parity checks between bounded piecewise catch-up and tick-by-tick replay for representative factory scenarios

### Persistence And Region Tests

Integration tests should verify:

- region load and unload behavior
- snapshot save and restore
- inventory and machine recovery after restart
- boundary hand-off buffer reconciliation after one-sided region rollback or reload, with no lost or duplicated committed items and configured backpressure behavior preserved
- correct ownership and placement persistence

### Multiplayer Soak Tests

Small-scale multiplayer testing should focus on:

- several active sites in one shared world
- region activation and memory usage
- tick cost under typical player activity
- wake-up spikes after large bottleneck releases or factory restarts
- wake-up queue budget behavior under bursty array activation
- desync risk between runtime state and persisted state

## Open Follow-On Work

After this design is implemented and validated, the next design and planning steps should likely be:

1. player trade hubs and market rules
2. hauling and contract systems
3. regional scarcity and economic specialization
4. territory control and PvP pressure

## Scope Check

This specification intentionally covers only the first factory-focused slice of Industrial.io. It does not attempt to solve the entire long-term MMO design in one pass. The spec is narrow enough to support a separate implementation plan focused on proving the factory loop, the shared-world persistence model, and the low-cost hosting approach.