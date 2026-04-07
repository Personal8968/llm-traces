import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  workers: 5,
  fullyParallel: true,
  retries: 2,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: process.env.GRAFANA_URL || 'http://localhost:3000',
    extraHTTPHeaders: {
      Authorization: `Basic ${Buffer.from('admin:admin').toString('base64')}`,
    },
    screenshot: 'only-on-failure',
    video: 'off',
    trace: 'off',
    launchOptions: {
      // Let Playwright use its own pinned Chromium by default (consistent across all envs).
      // Set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH only when you need to force a specific binary.
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-application-cache',
        '--disable-cache',
      ],
    },
  },
  snapshotDir: './tests/snapshots',
  expect: {
    toHaveScreenshot: {
      // 5% tolerance covers font sub-pixel rendering differences between
      // OrbStack (local) and Debian Bookworm (CI) with the same Chromium build.
      maxDiffPixelRatio: 0.05,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        viewport: { width: 1440, height: 900 },
        browserName: 'chromium',
      },
    },
  ],
});
