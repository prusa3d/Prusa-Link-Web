import { defineConfig, devices } from '@playwright/test';

// The browser-only demo build (make demo), served under the GitHub Pages path.
export default defineConfig({
  testDir: 'e2e-demo',
  use: { baseURL: 'http://127.0.0.1:5959' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm build:demo && pnpm preview:demo',
    url: 'http://127.0.0.1:5959/Prusa-Link-Web/',
    reuseExistingServer: !process.env.CI,
  },
});
