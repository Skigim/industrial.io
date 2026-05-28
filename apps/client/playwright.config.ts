import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
  },
  webServer: [
    {
      command: 'corepack pnpm --filter @industrial/api dev',
      port: 3001,
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command: 'corepack pnpm --filter @industrial/sim-core build && corepack pnpm --filter @industrial/world exec tsx watch src/dev.playwright.ts',
      port: 3002,
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command: 'corepack pnpm --filter @industrial/client exec vite --host 127.0.0.1 --port 4173 --strictPort',
      port: 4173,
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],
});