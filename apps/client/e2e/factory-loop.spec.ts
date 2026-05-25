import { expect, test } from '@playwright/test';

test('player can place starter buildings and produce iron plate', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Site Anchor' }).click();
  await page.getByRole('button', { name: 'Burner Generator' }).click();
  await page.getByRole('button', { name: 'Miner' }).click();
  await page.getByRole('button', { name: 'Smelter' }).click();

  await expect(page.getByText(/Iron Plate: 1|Iron Plate: 2/)).toBeVisible({ timeout: 10000 });
});