# Starter Production Scenario Design

Date: 2026-05-27
Status: Draft for implementation

## Summary

The current project has foundational placement and visible-world work, but it still does not produce a playable factory loop. Buildings can be placed and the client can render a world snapshot, yet production is still modeled as a region-level increment instead of a visible material chain moving through the world.

This slice turns the prototype into a minimal game. The starter region will spawn a prebuilt iron-processing line containing miners, belts, a smelter, a constructor, and storage, but one small connection will be missing. The player repairs that gap with the existing placement flow. Once repaired, the authoritative simulation moves raw iron ore through belts into a smelter, converts it into iron ingots, sends those ingots into a constructor, and stores the resulting construction parts. The scenario completes when storage reaches a small target count.

## Goals

- Ship one small but real gameplay loop.
- Replace region-level direct output with a visible ore -> ingot -> construction part chain.
- Reuse the existing placement UI so the player performs one meaningful repair action.
- Make production flow legible through visible building roles and moving belt items.
- Give the slice a concrete objective: store 10 construction parts.
- Keep the simulation authoritative on the server and render-only on the client.

## Non-Goals

- Open-ended sandbox factory building.
- Power or fuel management in this slice.
- Multi-recipe production trees.
- Generalized belt editing tools or full logistics design.
- Large-footprint or rotatable buildings.
- High-fidelity art or animation systems.

## Approaches Considered

### 1. Scenario-first repair loop

Spawn a mostly complete starter factory with one intentional gap that the player must repair.

Pros:
- Smallest slice that creates actual gameplay.
- Reuses the current placement controls instead of introducing a new interaction model.
- Gives the player a clear objective and a visible payoff once flow begins.

Cons:
- The scenario is intentionally constrained rather than sandbox-like.
- Placement rules become slightly scenario-aware.

### 2. Full sandbox build-from-scratch

Require the player to place every building and belt needed for the chain.

Pros:
- Cleaner long-term simulation fantasy.
- Avoids special-case starter layout logic.

Cons:
- Expands scope into onboarding, broader placement validation, and layout UX.
- Risks shipping more tools without first proving the loop is fun.

### 3. Scripted automated showcase

Spawn a complete line and let it run with no required player action.

Pros:
- Fastest path to proving visible production.
- Simplest scenario rules.

Cons:
- Does not provide meaningful gameplay.
- Falls short of the “actual game” goal.

## Recommended Approach

Use approach 1.

It is the smallest slice that creates an actual game state: the player sees a broken factory, makes one repair with existing controls, restores throughput, and works toward a visible win condition. It also creates a clean bridge toward future sandbox play because the same production rules can later run on fully player-built layouts.

## Gameplay Slice

The starter region should include a visible production line built near the existing iron patch. The layout contains:

- one or two miners on iron-patch tiles
- a short ore belt run
- one smelter
- a short ingot belt run
- one constructor building
- a final belt run into storage

One small connection in that route is intentionally missing. The missing piece should be legible at a glance, such as a single absent belt segment between two already visible structures. The player enters the world, arms the relevant building type from the existing build panel, places the missing segment, and starts the factory.

After repair, the line should operate continuously:

1. miners emit raw iron ore to their output tile when that tile can accept it
2. belts move discrete items one tile at a time
3. the smelter consumes ore and outputs iron ingots after a recipe delay
4. the constructor consumes ingots and outputs construction parts after a recipe delay
5. storage accepts construction parts and increments the scenario progress

The scenario is complete when stored construction parts reach 10. The client should surface that target clearly and show an obvious completion state once reached.

## Architecture

The simulation remains authoritative in the backend. This slice should extend the current monorepo structure rather than introduce a new gameplay service.

### `packages/sim-core`

`sim-core` should evolve from region-level aggregate ticking into a compact tile-based scenario simulation. It needs to understand:

- placed building instances and their tiles
- simple building state for miners, smelters, constructors, and storage
- belt segments with minimal per-segment occupancy
- recipe timers and blocked/idle/running transitions
- item movement between adjacent tiles and machine interfaces

The simulation only needs enough fidelity for the starter scenario. It does not need generalized network optimization, region-boundary transport, or arbitrary throughput tuning in this slice.

### `services/world`

The world service should seed the starter region with the scenario layout, preserve that richer runtime state, validate the intended repair placement, and publish authoritative snapshots to clients. The server remains the only source of truth for placement success, production state, and completion progress.

### `apps/client`

The client should keep acting as a controller and renderer. It sends placement requests through the existing world connection and renders the authoritative snapshot. It must not simulate production locally or invent progress.

## Data Model

The visible world snapshot should expand beyond static buildings and resource nodes so the client can render the running factory. The minimal required shape is:

- `buildings`: building instances with `id`, `type`, `tile`, and optional simple status such as `idle`, `running`, or `blocked`
- `belts`: belt segments with `id`, `tile`, and compact item occupancy for one visible slot
- `resourceNodes`: existing starter iron patch tiles
- `storage`: region-level counts including `iron-ore`, `iron-ingot`, and `construction-part`
- `scenario`: goal state including current stored parts, target parts, and completion flag

The exact TypeScript shape can remain compact, but the contract should preserve one clear rule: every piece of client-visible gameplay state comes from the server snapshot.

## Components And Data Flow

### Miner

The miner is a producer bound to iron-patch tiles. When its output tile is available, it emits one `iron-ore` item at a fixed cadence.

### Belt

Each belt segment is a `1x1` transport tile. For this slice, a belt only needs one visible occupancy slot and one forward movement rule: if the next destination can accept the item, the item advances; otherwise the belt remains occupied and blocks upstream flow.

### Smelter

The smelter consumes one `iron-ore` from its input side, runs a recipe timer, then emits one `iron-ingot` to its output side when space is available.

### Constructor

The constructor consumes one `iron-ingot`, runs a recipe timer, then emits one `construction-part` to its output side when space is available.

### Storage

Storage accepts `construction-part` items and increments the scenario counter. It may also retain aggregate counts for debugging and HUD display.

### Flow behavior

The system should stall naturally instead of hiding blockage:

- if a downstream belt is occupied, upstream movement stops
- if a machine has no input, it idles
- if a machine finishes work but cannot output, it becomes blocked until the output clears

These states should be visible enough in the snapshot to support rendering and tests.

## Placement Rules

Placement should stay narrow and scenario-oriented.

- the starter layout spawns with one intended missing segment
- the player uses the existing build panel to place that segment
- invalid placements outside the allowed scenario repair path should be rejected
- a successful placement updates the authoritative snapshot and starts production flow

The simplest acceptable implementation is a scenario-specific acceptance rule for the missing tile and building type. This slice does not need general freeform construction rules beyond what already exists elsewhere in the project.

## Client Rendering

The renderer should keep the current grid-based view and add enough clarity to make the factory readable.

- resource patches remain visible beneath structures
- miners, smelters, constructors, and storage each render with distinct silhouettes or colors
- belts render as explicit route tiles instead of generic buildings
- belt occupancy renders moving item markers with distinct colors by item type
- the missing connection is visually obvious because the line is broken until the player fills it

High-end visuals are not required. The goal is clarity: the player should be able to see where materials are, what each building does, and whether the line is progressing.

## HUD And Success State

The HUD should display:

- current stored construction parts
- target construction parts, fixed at 10
- a completion message or banner when the target is reached

No deeper mission system is needed. One explicit goal counter is enough to turn the slice into a game.

## Error Handling

- invalid repair placements do not mutate the world state
- rejected placement keeps the player in a recoverable placement flow
- simulation stalls are represented as normal blocked or idle states, not hidden errors
- malformed client messages or snapshots should continue to follow the existing defensive handling path

This slice does not need rich player-facing error toasts. Deterministic server behavior and readable world state are the priority.

## File Responsibilities

### `packages/sim-core/src/model.ts`

Expand the runtime model to include the item types, building instances, belt segments, scenario metadata, and machine state needed for the starter factory.

### `packages/sim-core/src/stepRegion.ts`

Replace the current aggregate `iron-plate` increment logic with the starter production chain tick behavior.

### `packages/sim-core/src/sim.test.ts`

Cover the repaired scenario, belt movement, machine processing, blocking behavior, and goal completion.

### `services/world/src/region/bootstrapStarterRegion.ts`

Seed the starter scenario layout, the missing connection, and initial visible snapshot state.

### `services/world/src/region/RegionManager.ts`

Persist the richer scenario snapshot and validate the intended repair placement.

### `apps/client/src/App.tsx`

Retain and forward the richer region snapshot, including scenario goal progress.

### `apps/client/src/game/visibleWorld.ts`

Define the visible snapshot types for buildings, belts, items, resource nodes, storage, and scenario progress.

### `apps/client/src/game/renderer/createRenderer.ts`

Render the richer world state, including broken/complete line readability and moving items on belts.

### `apps/client/src/ui/Hud.tsx`

Display progress toward the construction-part goal and show completion.

## Testing Strategy

### Simulation tests

- the starter scenario remains stalled before the missing segment is placed
- after the repair placement, ore reaches the smelter, ingots reach the constructor, and construction parts reach storage
- blocked downstream tiles stall upstream movement without item duplication
- the scenario completion flag turns true once 10 construction parts are stored

### World-service tests

- starter region bootstrap includes the intended scenario layout and missing connection
- only the intended repair placement is accepted for the scenario
- snapshots expose the richer factory state needed by the client

### Client tests

- the player can place the missing segment with the existing placement flow
- authoritative snapshots update the HUD progress counter
- completion state appears when the goal is reached

### Renderer tests

- buildings render with distinct visual treatment by type
- belt segments and occupied item positions render on tile-aligned coordinates
- the broken route is visually incomplete before repair and complete after repair

## Success Criteria

This slice is successful when:

- the world boots into a visible starter factory scenario
- the player performs one repair action using the existing build UI
- production only starts once that repair is made
- ore, ingots, and construction parts move through a real simulated chain
- finished construction parts accumulate in storage
- the HUD reaches 10/10 construction parts and marks the scenario complete
- the result feels like a minimal playable factory game rather than a placement demo