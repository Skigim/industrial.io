# Grid Placement UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder build-button placement flow with a visible square-grid placement UI that arms a building, previews a hovered tile, and places on click while keeping the existing end-to-end factory loop working.

**Architecture:** Keep placement state in the client shell, keep viewport interactions in the React bridge, and keep rendering concerns in the canvas renderer. Extend the existing websocket placement flow to use real tile coordinates instead of a hardcoded tile while preserving the current world snapshot update path.

**Tech Stack:** React, TypeScript, Vite, Vitest, Playwright, browser WebSocket API

---

### Task 1: Add Armed Placement State To The Shell

**Files:**
- Modify: `apps/client/src/App.tsx`
- Modify: `apps/client/src/ui/BuildPanel.tsx`
- Test: `apps/client/src/App.test.tsx`

- [ ] **Step 1: Write the failing interaction test**

```tsx
// apps/client/src/App.test.tsx
// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { App } from './App';

describe('App placement flow', () => {
  it('arms a building from the build panel and allows cancellation', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Site Anchor' }));

    expect(screen.getByRole('button', { name: 'Site Anchor' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Cancel Build Tool' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel Build Tool' }));

    expect(screen.getByRole('button', { name: 'Site Anchor' })).toHaveAttribute('aria-pressed', 'false');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails for the right reason**

Run: `corepack pnpm --filter @industrial/client test -- --runInBand src/App.test.tsx`
Expected: FAIL because the build panel does not expose armed state or a cancel action.

- [ ] **Step 3: Implement the minimal shell state and build-panel UI**

```tsx
// apps/client/src/App.tsx
type PlacementTile = { x: number; y: number };

const [armedBuildingType, setArmedBuildingType] = useState<BuildingType | null>(null);
const [hoveredTile, setHoveredTile] = useState<PlacementTile | null>(null);
const [placementError, setPlacementError] = useState<string | null>(null);

const handleArmBuild = (buildingType: BuildingType) => {
  setArmedBuildingType(buildingType);
  setPlacementError(null);
};

const handleCancelBuild = () => {
  setArmedBuildingType(null);
  setHoveredTile(null);
  setPlacementError(null);
};

<BuildPanel
  armedBuildingType={armedBuildingType}
  onArmBuild={handleArmBuild}
  onCancelBuild={handleCancelBuild}
/>
```

```tsx
// apps/client/src/ui/BuildPanel.tsx
export type BuildPanelProps = {
  armedBuildingType?: (typeof starterBuildings)[number]['id'] | null;
  onArmBuild?: (buildingType: (typeof starterBuildings)[number]['id']) => void;
  onCancelBuild?: () => void;
};

<button
  key={building.id}
  type="button"
  aria-pressed={armedBuildingType === building.id}
  onClick={() => onArmBuild?.(building.id)}
>
  {building.label}
</button>

{armedBuildingType ? (
  <button type="button" onClick={() => onCancelBuild?.()}>
    Cancel Build Tool
  </button>
) : null}
```

- [ ] **Step 4: Run the test to verify the shell behavior passes**

Run: `corepack pnpm --filter @industrial/client test -- --runInBand src/App.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit the shell-state slice**

```bash
git add apps/client/src/App.tsx apps/client/src/ui/BuildPanel.tsx apps/client/src/App.test.tsx
git commit -m "feat: add armed build tool state"
```

### Task 2: Add Tile Math And Renderer Grid/Preview Support

**Files:**
- Create: `apps/client/src/game/renderer/tileMath.ts`
- Modify: `apps/client/src/game/renderer/createRenderer.ts`
- Test: `apps/client/src/game/renderer/createRenderer.test.ts`

- [ ] **Step 1: Write the failing renderer test for tile-aligned hover support**

```tsx
// apps/client/src/game/renderer/createRenderer.test.ts
it('reports tile-aligned hover positions and draws a placement grid', () => {
  globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;

  const container = document.createElement('div');
  Object.defineProperty(container, 'clientWidth', { configurable: true, get: () => 1200 });
  Object.defineProperty(container, 'clientHeight', { configurable: true, get: () => 800 });
  document.body.appendChild(container);

  const hoveredTiles: Array<{ x: number; y: number } | null> = [];

  const cleanup = createRenderer(container, {
    armedBuildingType: 'site-anchor',
    hoveredTile: null,
    onHoverTileChange: (tile) => hoveredTiles.push(tile),
  });

  container.dispatchEvent(new PointerEvent('pointermove', { clientX: 96, clientY: 64, bubbles: true }));

  expect(hoveredTiles.at(-1)).toEqual({ x: 3, y: 2 });
  expect(container.querySelector('canvas')).toHaveAttribute('aria-label', 'Factory viewport');

  cleanup();
});
```

- [ ] **Step 2: Run the renderer test to verify it fails correctly**

Run: `corepack pnpm --filter @industrial/client test -- --runInBand src/game/renderer/createRenderer.test.ts`
Expected: FAIL because `createRenderer` does not accept placement state or pointer callbacks.

- [ ] **Step 3: Add tile math and minimal renderer overlay support**

```ts
// apps/client/src/game/renderer/tileMath.ts
export const tileSizePx = 32;

export type PlacementTile = { x: number; y: number };

export const getTileFromPointer = (
  container: HTMLDivElement,
  event: Pick<PointerEvent, 'clientX' | 'clientY'>,
): PlacementTile => {
  const rect = container.getBoundingClientRect();
  const x = Math.max(0, Math.floor((event.clientX - rect.left + container.scrollLeft) / tileSizePx));
  const y = Math.max(0, Math.floor((event.clientY - rect.top + container.scrollTop) / tileSizePx));
  return { x, y };
};
```

```ts
// apps/client/src/game/renderer/createRenderer.ts
type RendererPlacementState = {
  armedBuildingType: 'site-anchor' | 'burner-generator' | 'miner' | 'belt' | 'smelter' | 'storage' | null;
  hoveredTile: PlacementTile | null;
  onHoverTileChange?: (tile: PlacementTile | null) => void;
};

export const createRenderer = (
  container: HTMLDivElement,
  placementState: RendererPlacementState,
): (() => void) => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  const draw = () => {
    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);

    for (let x = 0; x < canvas.width; x += tileSizePx) {
      context.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      context.strokeRect(x, 0, tileSizePx, canvas.height);
    }

    if (placementState.hoveredTile) {
      context.fillStyle = 'rgba(111, 208, 255, 0.2)';
      context.fillRect(
        placementState.hoveredTile.x * tileSizePx,
        placementState.hoveredTile.y * tileSizePx,
        tileSizePx,
        tileSizePx,
      );
    }
  };

  const handlePointerMove = (event: PointerEvent) => {
    placementState.onHoverTileChange?.(getTileFromPointer(container, event));
    draw();
  };

  const handlePointerLeave = () => {
    placementState.onHoverTileChange?.(null);
    draw();
  };

  container.addEventListener('pointermove', handlePointerMove);
  container.addEventListener('pointerleave', handlePointerLeave);

  return () => {
    container.removeEventListener('pointermove', handlePointerMove);
    container.removeEventListener('pointerleave', handlePointerLeave);
    canvas.remove();
  };
};
```

- [ ] **Step 4: Run the renderer test to verify it passes**

Run: `corepack pnpm --filter @industrial/client test -- --runInBand src/game/renderer/createRenderer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit the renderer slice**

```bash
git add apps/client/src/game/renderer/tileMath.ts apps/client/src/game/renderer/createRenderer.ts apps/client/src/game/renderer/createRenderer.test.ts
git commit -m "feat: add tile grid renderer support"
```

### Task 3: Bridge Viewport Input Into Placement Requests

**Files:**
- Modify: `apps/client/src/game/GameViewport.tsx`
- Modify: `apps/client/src/App.tsx`
- Modify: `apps/client/src/game/runtime/WorldConnection.ts`
- Test: `apps/client/src/App.test.tsx`
- Test: `apps/client/src/game/runtime/WorldConnection.test.ts`

- [ ] **Step 1: Write the failing placement test for tile coordinates**

```tsx
// apps/client/src/App.test.tsx
it('sends the hovered tile when placing an armed building', async () => {
  const placeBuilding = vi.fn();
  vi.mock('./game/runtime/WorldConnection', () => ({
    WorldConnection: vi.fn().mockImplementation(() => ({
      connect: vi.fn(() => ({ readyState: WebSocket.OPEN, addEventListener: vi.fn(), close: vi.fn() })),
      joinRegion: vi.fn(),
      placeBuilding,
    })),
  }));

  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Site Anchor' }));
  fireEvent.pointerMove(screen.getByTestId('game-viewport'), { clientX: 96, clientY: 64 });
  fireEvent.click(screen.getByTestId('game-viewport'));

  expect(placeBuilding).toHaveBeenCalledWith(expect.anything(), expect.any(String), expect.any(String), 'site-anchor', { x: 3, y: 2 });
});
```

- [ ] **Step 2: Run the test to verify it fails because placement still uses a fixed tile**

Run: `corepack pnpm --filter @industrial/client test -- --runInBand src/App.test.tsx src/game/runtime/WorldConnection.test.ts`
Expected: FAIL because `WorldConnection.placeBuilding(...)` does not accept a tile argument and the viewport click path is missing.

- [ ] **Step 3: Implement the viewport bridge and tile-aware websocket call**

```tsx
// apps/client/src/game/GameViewport.tsx
export type GameViewportProps = {
  armedBuildingType: BuildingType | null;
  hoveredTile: PlacementTile | null;
  onHoverTileChange?: (tile: PlacementTile | null) => void;
  onPlaceTile?: (tile: PlacementTile) => void;
  onCancelBuild?: () => void;
};

return (
  <div
    data-testid="game-viewport"
    ref={viewportRef}
    style={viewportStyle}
    onClick={() => hoveredTile && onPlaceTile?.(hoveredTile)}
    onContextMenu={(event) => {
      event.preventDefault();
      onCancelBuild?.();
    }}
  />
);
```

```tsx
// apps/client/src/App.tsx
const handlePlaceTile = (tile: PlacementTile) => {
  if (!armedBuildingType || !session || !socketRef.current) {
    return;
  }

  try {
    worldConnection.placeBuilding(socketRef.current, session.regionId, session.playerId, armedBuildingType, tile);
    setArmedBuildingType(null);
    setHoveredTile(null);
    setPlacementError(null);
  } catch (error) {
    setPlacementError('Unable to place building on that tile.');
  }
};
```

```ts
// apps/client/src/game/runtime/WorldConnection.ts
placeBuilding(
  socket: WebSocket,
  regionId: string,
  playerId: string,
  buildingType: 'site-anchor' | 'burner-generator' | 'miner' | 'belt' | 'smelter' | 'storage',
  tile: { x: number; y: number },
): void {
  if (socket.readyState !== WebSocket.OPEN) {
    throw new Error('Cannot place a building while the world socket is not open.');
  }

  socket.send(JSON.stringify({ type: 'build.place', regionId, playerId, buildingType, tile }));
}
```

- [ ] **Step 4: Run the placement tests to verify they pass**

Run: `corepack pnpm --filter @industrial/client test -- --runInBand src/App.test.tsx src/game/runtime/WorldConnection.test.ts`
Expected: PASS

- [ ] **Step 5: Commit the tile-placement slice**

```bash
git add apps/client/src/App.tsx apps/client/src/game/GameViewport.tsx apps/client/src/game/runtime/WorldConnection.ts apps/client/src/App.test.tsx apps/client/src/game/runtime/WorldConnection.test.ts
git commit -m "feat: add tile-based build placement"
```

### Task 4: Add Keyboard Cancel And Placement Failure Retention

**Files:**
- Modify: `apps/client/src/App.tsx`
- Test: `apps/client/src/App.test.tsx`

- [ ] **Step 1: Write the failing cancel-and-error test**

```tsx
// apps/client/src/App.test.tsx
it('keeps the build tool armed when placement fails and clears it on Escape', () => {
  const placeBuilding = vi.fn(() => {
    throw new Error('rejected');
  });

  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Site Anchor' }));
  fireEvent.pointerMove(screen.getByTestId('game-viewport'), { clientX: 96, clientY: 64 });
  fireEvent.click(screen.getByTestId('game-viewport'));

  expect(screen.getByRole('button', { name: 'Site Anchor' })).toHaveAttribute('aria-pressed', 'true');

  fireEvent.keyDown(window, { key: 'Escape' });

  expect(screen.getByRole('button', { name: 'Site Anchor' })).toHaveAttribute('aria-pressed', 'false');
});
```

- [ ] **Step 2: Run the test to verify the failure and missing Escape support**

Run: `corepack pnpm --filter @industrial/client test -- --runInBand src/App.test.tsx`
Expected: FAIL because the armed tool clears incorrectly on failure or does not respond to `Escape`.

- [ ] **Step 3: Implement minimal cancellation and retry-safe behavior**

```tsx
// apps/client/src/App.tsx
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleCancelBuild();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);

catch (error) {
  console.error('Failed to place building.', error);
  setPlacementError('Unable to place building on that tile.');
  // keep armedBuildingType unchanged for retry
}
```

- [ ] **Step 4: Run the test to verify cancel and failure retention pass**

Run: `corepack pnpm --filter @industrial/client test -- --runInBand src/App.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit the cancellation slice**

```bash
git add apps/client/src/App.tsx apps/client/src/App.test.tsx
git commit -m "feat: add placement cancel and retry behavior"
```

### Task 5: Update The Browser Smoke Test For Real Placement

**Files:**
- Modify: `apps/client/e2e/factory-loop.spec.ts`
- Test: `apps/client/e2e/factory-loop.spec.ts`

- [ ] **Step 1: Write the updated end-to-end assertions for tile placement**

```ts
// apps/client/e2e/factory-loop.spec.ts
test('player can place starter buildings on tiles and produce iron plate', async ({ page }) => {
  await page.goto('/');

  const viewport = page.getByTestId('game-viewport');

  await page.getByRole('button', { name: 'Site Anchor' }).click();
  await viewport.click({ position: { x: 96, y: 96 } });

  await page.getByRole('button', { name: 'Burner Generator' }).click();
  await viewport.click({ position: { x: 160, y: 96 } });

  await page.getByRole('button', { name: 'Miner' }).click();
  await viewport.click({ position: { x: 224, y: 96 } });

  await page.getByRole('button', { name: 'Smelter' }).click();
  await viewport.click({ position: { x: 288, y: 96 } });

  await expect(page.getByText(/Iron Plate: 1|Iron Plate: 2/)).toBeVisible({ timeout: 10000 });
});
```

- [ ] **Step 2: Run the browser test to verify it fails before the interaction changes are complete**

Run: `corepack pnpm --filter @industrial/client playwright test`
Expected: PASS if Tasks 1-4 are complete and the viewport click path is wired correctly. If it fails, the failure should point to either missing viewport click handling or incorrect tile-coordinate placement.

- [ ] **Step 3: Keep the viewport test target stable if the browser test needs it**

```tsx
// apps/client/src/game/GameViewport.tsx
return (
  <div
    data-testid="game-viewport"
    ref={viewportRef}
    style={viewportStyle}
    onClick={() => hoveredTile && onPlaceTile?.(hoveredTile)}
    onContextMenu={(event) => {
      event.preventDefault();
      onCancelBuild?.();
    }}
  />
);
```

- [ ] **Step 4: Run the browser test to verify the playable loop still passes**

Run: `corepack pnpm --filter @industrial/client playwright test`
Expected: PASS with `player can place starter buildings on tiles and produce iron plate`

- [ ] **Step 5: Commit the end-to-end slice**

```bash
git add apps/client/e2e/factory-loop.spec.ts
git commit -m "test: cover tile-based placement flow"
```

### Task 6: Final Verification

**Files:**
- Modify: none
- Test: `apps/client/src/App.test.tsx`
- Test: `apps/client/src/game/runtime/WorldConnection.test.ts`
- Test: `apps/client/src/game/renderer/createRenderer.test.ts`
- Test: `apps/client/e2e/factory-loop.spec.ts`

- [ ] **Step 1: Run the focused client unit tests**

Run: `corepack pnpm --filter @industrial/client test`
Expected: PASS with updated placement interaction coverage.

- [ ] **Step 2: Run the browser smoke test**

Run: `corepack pnpm --filter @industrial/client playwright test`
Expected: PASS

- [ ] **Step 3: Run full workspace typecheck**

Run: `corepack pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Run full workspace tests if the stack is available**

Run: `corepack pnpm test`
Expected: PASS

- [ ] **Step 5: Commit the verification checkpoint**

```bash
git add .
git commit -m "feat: add grid-based placement ui"
```