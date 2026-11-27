import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

import { printerImages } from './mock/printer-images.ts';
import { locales } from './mock/locales.ts';
import { devPrinter } from './mock/vite-plugin.ts';
import { demoPage } from './demo/vite-plugin.ts';
import {
  buildFeatures,
  type Feature,
  FEATURES,
  flagName,
} from './build/features.ts';
import { pictureEditor } from './dev/picture-editor/vite-plugin.ts';

// The production build is index.html alone, with every script and stylesheet
// inlined: the firmware embeds that one file. The mock printer and the dev
// panel are dev-server middleware and never reach the build.
// PRUSALINK_LANG makes a one-language build (the MINI's firmware ships per
// locale): its page carries that language only. A mini-<lang> variant shows
// the MINI's picture.
// `--mode demo` builds the browser-only demo instead (demo/, dist-demo/):
// the app, the mock printer and its panel, for a static host such as GitHub
// Pages. Never embedded in firmware, so neither one file nor budgeted.
const VARIANT = process.env.PRUSALINK_VARIANT;
/// The messages only some features use, by key prefix: dropped from a build
/// with none of them. What each build includes: build/features.ts.
const MESSAGES: Record<string, Feature[]> = {
  'dialog.': ['apiV2'],
  'status.chamber': ['apiV2'],
  'tools.': ['multiTool', 'toolMapping'],
  'mapping.': ['toolMapping'],
  'print.check.': ['toolMapping'],
  'objects.': ['cancelObject'],
  'controls.': ['controls'],
  'flash.': ['firmwareFlash'],
  'firmware.': ['firmwareUpdate'],
  'redScreen.': ['redScreen', 'diagnostics'],
  'dump.': ['diagnostics'],
  'log.': ['diagnostics'],
};
const VERSION = process.env.PRUSALINK_VERSION;

export default defineConfig(({ command, mode }) => ({
  ...(mode === 'demo' && {
    base: process.env.DEMO_BASE ?? '/Prusa-Link-Web/',
  }),
  define: Object.fromEntries(
    (Object.keys(FEATURES) as Feature[]).map((f) => [
      flagName(f),
      JSON.stringify(buildFeatures(VARIANT).includes(f)),
    ]),
  ),
  plugins: [
    mode === 'demo' && demoPage(),
    VERSION !== undefined && version(VERSION),
    printerImages(VARIANT?.startsWith('mini-') ? 'mini' : VARIANT),
    tailwindcss(),
    svelte(),
    locales(
      process.env.PRUSALINK_LANG,
      Object.entries(MESSAGES)
        .filter(([, by]) => !by.some((f) => buildFeatures(VARIANT).includes(f)))
        .map(([prefix]) => prefix),
    ),
    command === 'serve' &&
      mode !== 'test' &&
      devPrinter({ printerUrl: process.env.PRINTER_URL }),
    command === 'serve' && mode !== 'test' && pictureEditor(),
    command === 'build' &&
      mode !== 'demo' &&
      !process.env.PRUSALINK_ANALYZE &&
      viteSingleFile({ removeViteModuleLoader: true }),
  ],
  // Not Vite's 5173, which other projects on the same machine use.
  server: { port: 5957 },
  build: {
    outDir: mode === 'demo' ? 'dist-demo' : `dist/${VARIANT ?? ''}`,
    target: 'es2022',
    assetsInlineLimit: mode === 'demo' ? 4096 : Number.MAX_SAFE_INTEGER,
    reportCompressedSize: false,
    // A component or store a build's feature flags leave unused is dropped,
    // though its module registers event handlers or creates its store: the
    // app's modules do nothing at import that a used one would miss.
    rollupOptions: {
      treeshake: {
        moduleSideEffects: (id: string) =>
          !/\/src\/(?!main\.ts).*\.(ts|svelte)$/.test(id),
      },
    },
    chunkSizeWarningLimit: mode === 'demo' ? 1024 : 500,
    // public/ (the favicon) is for the dev server: the firmware has its own.
    copyPublicDir: mode === 'demo',
  },
}));

/// `<meta name="prusalink-version">`, so a page on a printer says which
/// release it is.
function version(value: string): Plugin {
  return {
    name: 'prusalink-version',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { name: 'prusalink-version', content: value },
        injectTo: 'head',
      },
    ],
  };
}
