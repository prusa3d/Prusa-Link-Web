import { applicationConfig } from '@prusa/frontend-standards/eslint/application';

import svelteConfig from './svelte.config.js';

export default [
  ...applicationConfig({ tsconfigRootDir: import.meta.dirname, svelteConfig }),
  {
    ignores: [
      'storybook-static/',
      'playwright-report/',
      'test-results/',
      '.video/',
      'share/',
      'dist-demo/',
      'src/lib/api/schema.d.ts',
    ],
  },
  // Build-time constants (vite.config.ts `define`).
  { languageOptions: { globals: { __MULTI_TOOL__: 'readonly' } } },
  // prusa-connect bans fetch because its SDK owns the transport. Here the
  // transport is src/lib/api, so fetch is allowed there, and in the firmware
  // release check, which asks GitHub rather than the printer.
  {
    files: ['src/lib/api/**', 'src/lib/firmware/**'],
    rules: { 'no-restricted-globals': 'off' },
  },
  // A Svelte component per lucide icon costs the firmware budget several times
  // over; src/ uses src/lib/ui/icon (`pnpm icons` generates its data).
  {
    files: ['src/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@lucide/svelte',
              message: 'Use src/lib/ui/icon and run `pnpm icons`.',
            },
          ],
        },
      ],
    },
  },
  // Development and test tooling never ships in index.html: no translations,
  // no primitives, and it may talk to the dev server directly.
  {
    files: [
      'dev/**',
      'demo/**',
      'mock/**',
      'e2e/**',
      'scripts/**',
      '**/*.test.ts',
    ],
    rules: {
      'frontend-standards/no-literal-text': 'off',
      'svelte/no-restricted-html-elements': 'off',
      'no-restricted-globals': 'off',
      'no-console': 'off',
    },
  },
];
