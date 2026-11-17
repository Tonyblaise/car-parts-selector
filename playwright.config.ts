import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    // Instant camera moves make angle assertions deterministic; reduced-motion.spec overrides it.
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  // A separate output dir keeps the test-hook build out of dist/, which `npm run size` measures.
  webServer: {
    command:
      'VITE_TEST_HOOKS=1 npx vite build --outDir dist-e2e && npx vite preview --outDir dist-e2e --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: ['smoke.spec.ts', 'no-webgl.spec.ts'],
    },
  ],
});
