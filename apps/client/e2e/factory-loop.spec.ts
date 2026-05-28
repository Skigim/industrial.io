import { expect, test } from '@playwright/test';
import { tileSizePx } from '../src/game/renderer/tileMath';

const toViewportPosition = (tile: { x: number; y: number }) => ({
  x: tile.x * tileSizePx + tileSizePx / 2,
  y: tile.y * tileSizePx + tileSizePx / 2,
});

test('player repairs the starter line and completes the scenario', async ({ page }) => {
  await page.goto('/');

  const viewport = page.getByTestId('game-viewport');
  const beltButton = page.getByRole('button', { name: 'Belt' });
  const repairPosition = toViewportPosition({ x: 14, y: 6 });

  await expect(viewport).toBeVisible();

  await beltButton.click();
  await expect(beltButton).toHaveAttribute('aria-pressed', 'true');
  await viewport.hover({ position: repairPosition });
  await viewport.click({ position: repairPosition });
  await expect(beltButton).toHaveAttribute('aria-pressed', 'false');

  await expect(page.getByText('Construction Parts: 10 / 10')).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Starter line complete')).toBeVisible();
});