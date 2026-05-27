# Grid Placement UI Design

Date: 2026-05-26
Status: Draft for review

## Summary

The current playable slice proves the factory loop, but placement is still a placeholder interaction: build-panel button clicks immediately send a placement request at a fixed tile. The next slice should introduce a basic square-grid interaction model so the player can visibly target a tile in the world, preview the intended placement, and click to place buildings on the map.

This design keeps the scope intentionally narrow. The goal is to replace the fake placement interaction with a real tile-based loop without taking on later editor concerns such as drag placement, rotation, footprint-aware collision, persistent multi-place mode, or selection tooling.

## Goals

- Add a visible square grid to the world viewport.
- Let the player arm a building from the build panel instead of placing immediately.
- Show a tile-aligned hover state and simple placement preview.
- Place a building on the hovered tile with a click.
- Allow cancellation with `Esc` or right-click.
- Preserve the current end-to-end factory loop and browser smoke test.

## Non-Goals

- Persistent multi-place mode.
- Drag placement or paint placement.
- Rotation controls.
- Footprints larger than a single tile in this slice.
- Rich sprite rendering for buildings.
- Advanced collision rules or occupancy resolution UI.
- A full construction/selection/editing toolset.

## Baseline Interaction Model

The interaction model for this slice is `arm-then-click`.

1. The player clicks a building button in the build panel.
2. The client arms that building type instead of sending a placement request immediately.
3. Moving the pointer over the viewport snaps to a square tile.
4. The renderer shows a visible hover tile plus a simple building ghost.
5. Left-click places the building on the currently hovered tile.
6. A successful placement clears the armed tool and returns the client to idle.
7. `Esc` or right-click cancels the armed tool without placing.

This model is the smallest credible step from the current placeholder UX to a usable world interaction. It supports future expansion into persistent build mode or more advanced tools without forcing those choices now.

## UI And State Model

The client should expose a small placement state machine owned by the app shell:

- `idle`: no building is armed.
- `armed`: a building type has been selected from the build panel.
- `hovering`: the client has an armed building and a currently hovered tile.
- `placing`: the client is sending the placement request for the active tile.

The state machine does not need to be modeled as an explicit reducer in this slice. It only needs to behave consistently through React state and event handlers.

### Build Panel Behavior

The build panel should stop acting like an immediate action bar. Instead:

- clicking a building button arms that building type
- the currently armed building is visually distinguished in the panel
- the panel exposes a visible cancel path, either via a dedicated cancel button or clear “armed” state affordance

The build panel remains pinned in the overlay and should not take over the viewport or open a modal.

### Viewport Behavior

The viewport becomes an interactive placement surface.

- the square grid is always visible when this slice is enabled
- the hovered tile is highlighted when a placement tool is armed
- the building preview is tile-aligned
- clicking outside a valid hover tile does nothing

The viewport should continue to scroll normally. Placement interaction must coexist with the current scrollable world surface rather than replace it.

## Rendering Design

The existing renderer bridge remains intentionally lightweight. This slice should add only enough rendering behavior to support placement.

### Grid

The renderer should draw a visible square grid over the world surface. The grid should be subtle enough not to overwhelm the background, but strong enough that tile boundaries are immediately legible.

The grid should be derived from one canonical tile size. All hover, preview, and placement coordinates should align to that same tile size so there is no mismatch between interaction math and what the player sees.

### Hover Highlight

When a building is armed and the pointer is inside the viewport, the renderer should draw a brighter square highlight on the hovered tile.

### Placement Preview

The preview should stay deliberately simple in this slice:

- a translucent filled square or outlined square
- a distinct accent color from the hover highlight
- an optional short text label for the armed building type

This is enough to prove the interaction loop without introducing a full building-art system.

## Tile Rules

All buildings are treated as `1x1` for placement UI purposes in this slice, even if future content evolves toward larger footprints.

This choice is explicit scope control, not a claim about the final building system. It avoids dragging footprint math, orientation, and multi-cell previews into a slice whose main goal is simply targeting world coordinates visibly and correctly.

## Data Flow

The intended flow is:

1. `BuildPanel` arms a building type.
2. `App` stores the armed tool state.
3. `GameViewport` reports pointer movement and click/cancel events.
4. The renderer converts pointer position into a hovered tile.
5. `App` sends the selected tile coordinates through `WorldConnection.placeBuilding(...)`.
6. The world service processes the request and returns the next region snapshot.
7. The client remains on the existing snapshot-driven update path.

The existing websocket flow should stay intact. This slice should only change the placement request payload from “always use the same hardcoded tile” to “use the currently selected tile.”

## File Responsibilities

### `apps/client/src/App.tsx`

Own the placement interaction state:

- armed building type
- hovered tile
- placement and cancel actions
- any small transient placement error state

`App` remains the integration point between the overlay UI, viewport interactions, and websocket transport.

### `apps/client/src/ui/BuildPanel.tsx`

Render armable build buttons instead of immediate placement actions. Show which building is currently selected and expose a cancel/unarm affordance.

### `apps/client/src/game/GameViewport.tsx`

Bridge the viewport DOM events into placement callbacks. It should not own business logic for placement success or failure.

### `apps/client/src/game/renderer/createRenderer.ts`

Add the square grid, hover highlight, and simple placement preview while preserving the current resize and scroll behavior.

If tile math or placement preview logic starts to dominate this file, a small helper such as `tileMath.ts` or `placementOverlay.ts` is acceptable, but only if it meaningfully improves readability.

### `apps/client/src/game/runtime/WorldConnection.ts`

Send placement requests with the selected tile instead of the current fixed tile. The method signature should reflect that tile coordinates are now an input from the UI.

## Error Handling

Error handling should remain minimal and predictable.

- If no building is armed, viewport clicks do nothing.
- If placement is cancelled, clear hover and armed state cleanly.
- If the websocket is not open, do not place and keep the tool armed.
- If the server rejects placement, keep the tool armed so the player can retry another tile.
- Malformed or unexpected world messages should continue to be ignored under the current hardening rules.

The UI does not need a complex notification system for this slice. A tiny local error message or console-backed failure path is acceptable as long as the interaction state remains correct and placement intent is not silently lost.

## Testing Strategy

Testing should focus on the user interaction contract, not on pixel-perfect canvas output.

### Client Unit Tests

- selecting a building arms placement instead of sending immediately
- clicking a hovered tile sends `build.place` with the chosen tile coordinates
- cancelling with `Esc` or right-click clears the armed tool
- failed placement keeps the tool armed

### Renderer Tests

- the square grid and placement highlight stay tile-aligned
- resize behavior preserves the interaction surface and visible grid assumptions

### End-To-End Test

The browser smoke test should evolve from “click build buttons and wait for iron plate output” to “arm buildings, place them on tiles in the viewport, and still reach iron plate output.”

This preserves the value of the vertical slice while making the player interaction more realistic.

## Scope Guardrails

To keep this slice shippable, defer the following until later:

- occupancy and collision validation beyond whatever the current server already enforces
- footprints larger than `1x1`
- rotate mode
- persistent multi-place mode
- marquee selection or edit tools
- art-heavy building rendering

If any of these become necessary to make the core slice understandable, reassess the design before implementation rather than quietly absorbing more scope.

## Success Criteria

This slice is successful when:

- the viewport visibly reads as a tile grid
- the player can arm a building and see where it will be placed
- clicking a tile places the building at that tile instead of a hardcoded coordinate
- cancelling placement is predictable
- the existing playable factory loop still works end to end