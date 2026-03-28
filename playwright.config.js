import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npx serve . -l 4173',
    url: 'http://127.0.0.1:4173/demo/',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
