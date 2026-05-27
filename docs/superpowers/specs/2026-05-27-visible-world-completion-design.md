# Visible World Completion Design

Date: 2026-05-27
Status: Draft for implementation

## Summary

The current placement slice works logically but is not legible to a player. Buildings can be placed and the factory loop can advance, but the world snapshot does not preserve tile positions, the client does not render placed buildings, and the starter region does not expose a visible iron source for miners.

This slice completes the previous placement work by making the world readable. It adds visible placed buildings, a visible starter iron patch, and one minimal placement rule: miners may only be placed on iron patch tiles. The goal is not to design a full map/resource system, only to make the existing starter loop visually understandable.

## Goals

- Persist building tile coordinates in region snapshots.
- Render placed buildings on the client grid.
- Expose a visible starter iron patch in the region snapshot.
- Render the iron patch in the viewport.
- Require miners to be placed on iron patch tiles.
- Preserve the existing starter factory loop and browser smoke test value.

## Non-Goals

- Full terrain generation.
- Multiple resource types or biomes.
- Belt routing simulation or directional transport logic.
- Sprite art systems.
- Large-footprint buildings.
- Rich placement validation UI beyond a minimal invalid-state guard.

## Approaches Considered

### 1. Visibility only

Render buildings and an ore patch, but keep server placement rules unchanged.

Pros:
- Smallest code change.
- Immediately makes the grid less empty.

Cons:
- Miner placement would still be semantically arbitrary.
- The player could still place a miner nowhere near the visible ore and get confusing results.

### 2. Visibility plus miner-on-iron validation

Render buildings and a single starter iron patch, and reject miner placement unless the tile is on that patch.

Pros:
- Smallest change that makes the world feel coherent.
- Keeps the current vertical slice readable without introducing a broad logistics model.
- Matches the player expectation behind “there’s no resource to put a miner on.”

Cons:
- Introduces one special-case placement rule ahead of a fuller building-system design.

### 3. Visibility plus richer logistics cues

Render buildings, iron patch, and simple belt direction/facing or link cues.

Pros:
- More readable factory layout.

Cons:
- Broadens scope into transport semantics before the snapshot model is ready.
- Not required to solve the immediate legibility problem.

## Recommended Approach

Use approach 2.

It fixes the player-facing confusion at the right abstraction level: the world becomes visible, miners have a meaningful target, and the existing starter loop still stays intentionally simple.

## Data Model

The region snapshot should grow from “list of building ids/types plus storage” into a minimal visual world state:

- `buildings`: `{ id, type, tile }[]`
- `resourceNodes`: `{ id, resourceType, tiles }[]`
- `storage`: unchanged

The starter region should include one starter iron node with a small fixed footprint near the expected starter placement area. A simple `2x2` patch is sufficient.

## Placement Rules

- All buildings remain `1x1` in this slice.
- Non-miner buildings may be placed on any tile.
- A miner may only be placed on a tile belonging to a starter iron node.
- If miner placement is invalid, the server rejects it and the client keeps the tool armed under the existing retry behavior.

No additional occupancy rules are introduced in this slice beyond whatever the current server behavior already allows.

## Client Rendering

The renderer should continue to own grid, hover, and preview behavior, and gain minimal world rendering layers:

- draw starter iron patch tiles first
- draw placed buildings above the patch
- keep hover/preview above both

Rendering may stay abstract. Colored tile fills and simple labels are enough:

- iron patch: rust/red-brown filled tiles
- buildings: distinct solid or semi-solid colored squares by type
- labels optional if they improve readability without clutter

## Client State And Flow

`App` should stop discarding most of the world snapshot. It should retain the current region snapshot data needed for rendering:

- placed buildings with tile positions
- resource nodes
- storage count for HUD

Flow:

1. Client joins region.
2. World snapshot arrives with storage, buildings, and resource nodes.
3. Renderer draws the visible world.
4. Player arms a building and hovers tiles.
5. If placing a miner on a non-resource tile, server rejects it and the client remains armed.
6. If placement succeeds, next snapshot includes the new building tile and the renderer reflects it.

## File Responsibilities

### `services/world/src/region/bootstrapStarterRegion.ts`

Define the richer starter snapshot shape and seed the visible starter iron patch.

### `services/world/src/region/RegionManager.ts`

Persist building tile positions in snapshots and enforce miner-on-iron validation.

### `apps/client/src/App.tsx`

Store the current region snapshot needed for rendering, not just storage count.

### `apps/client/src/game/renderer/createRenderer.ts`

Render resource nodes and placed buildings in addition to the existing grid and hover layers.

### `apps/client/src/game/GameViewport.tsx`

Pass the current visible world snapshot into the renderer bridge.

## Error Handling

- Invalid miner placement should not mutate the world snapshot.
- The client should keep the armed tool active on server rejection, matching current retry behavior.
- Unknown or malformed world messages should still be ignored.

No new notification system is required. A console-backed failure path remains acceptable.

## Testing Strategy

### World tests

- starter region snapshot includes a visible iron patch
- placed buildings preserve tile coordinates in snapshots
- miner placement on non-iron tiles is rejected

### Client tests

- `App` stores and passes region snapshot data needed for rendering
- failed invalid miner placement keeps the tool armed

### Renderer tests

- resource nodes and buildings draw at tile-aligned coordinates
- hover/preview still render above visible world state

### End-to-end test

- starter loop still produces iron plate
- optionally place the miner directly on the visible starter iron patch coordinates used by the starter smoke test

## Success Criteria

This slice is successful when:

- placed buildings become visible in the viewport after placement
- the viewport shows a visible starter iron patch
- miner placement feels meaningful because the visible patch is its target
- invalid miner placement is rejected without disarming the tool
- the existing starter factory loop still works end to end