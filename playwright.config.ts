import { defineConfig, devices } from '@playwright/test';

// End-to-end against the dev server and its mock printer. Point PRINTER_URL at
// a MINI404 simulator to run the same specs against real firmware.
// E2E_PORT runs a second checkout's suite beside one already on 5958.
const PORT = process.env.E2E_PORT ?? '5958';

export default defineConfig({
  testDir: 'e2e',
  // One mock printer serves every test, so tests take turns with it.
  workers: 1,
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm dev --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
