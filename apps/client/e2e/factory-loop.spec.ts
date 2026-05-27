import { expect, test } from '@playwright/test';
import { tileSizePx } from '../src/game/renderer/tileMath';

const toViewportPosition = (tile: { x: number; y: number }) => ({
  x: tile.x * tileSizePx + tileSizePx / 2,
  y: tile.y * tileSizePx + tileSizePx / 2,
});

test('player can place starter buildings on tiles and produce iron plate', async ({ page }) => {
  await page.goto('/');

  const viewport = page.getByTestId('game-viewport');
  const starterPlacements = [
    { name: 'Burner Generator', tile: { x: 8, y: 7 } },
    { name: 'Miner', tile: { x: 10, y: 6 } },
    { name: 'Smelter', tile: { x: 12, y: 7 } },
  ] as const;

  await expect(viewport).toBeVisible();

  for (const placement of starterPlacements) {
    const position = toViewportPosition(placement.tile);

    await page.getByRole('button', { name: placement.name }).click();
    await viewport.hover({ position });
    await viewport.click({ position });
  }

  await expect(page.getByText(/Iron Plate: 1|Iron Plate: 2/)).toBeVisible({ timeout: 10000 });
});