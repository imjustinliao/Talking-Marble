import { defineConfig, devices } from '@playwright/test';

// Main uses 5174; parallel sessions set E2E_PORT (docs/parallel-plan.md).
const port = Number(process.env.E2E_PORT ?? 5174);

export default defineConfig({
  testDir: 'e2e',
  // Many specs run several live WebGL marbles; more than 4 in parallel starves the GPU and makes
  // timing-sensitive specs flaky (seen at 7 workers on 14 cores, 2026-11-23). 4 finishes as fast.
  workers: 4,
  reporter: 'list',
  use: { baseURL: `http://127.0.0.1:${port}` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Its own port, so it never collides with the owner's live preview on 5173.
  webServer: {
    command: `pnpm --filter talking-marble gen && pnpm --filter site exec vite --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});
