import { playwright } from '@vitest/browser-playwright';
import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config.ts';

// prusa-connect's split: a component or rune test (`.svelte.test.ts`) runs in
// real Chromium, everything else under Node.
export default mergeConfig(
  viteConfig({ command: 'serve', mode: 'test' }),
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: 'browser',
            include: ['src/**/*.svelte.test.ts'],
            browser: {
              enabled: true,
              headless: true,
              provider: playwright(),
              instances: [{ browser: 'chromium' }],
              screenshotFailures: false,
            },
          },
        },
        {
          extends: true,
          test: {
            name: 'node',
            include: [
              'src/**/*.test.ts',
              'mock/**/*.test.ts',
              'scripts/**/*.test.ts',
            ],
            exclude: ['src/**/*.svelte.test.ts'],
            environment: 'node',
          },
        },
      ],
    },
  }),
);
