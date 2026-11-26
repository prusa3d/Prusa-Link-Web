import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

import { printerImages } from './mock/printer-images.ts';
import { locales } from './mock/locales.ts';
import { devPrinter } from './mock/vite-plugin.ts';
import { demoPage } from './demo/vite-plugin.ts';
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
// apiV2: the expanded status (every tool, chamber, change counters) and the
// printer's dialogs, which the rest builds on.
// PrusaLink 2 features each firmware build has room for (scripts/check-size.ts
// budgets). The dev server, tests and the demo have all of them;
// PRUSALINK_FEATURES (comma-separated) overrides the table, to measure.
// multiTool: only printers with several tools need the per-tool views.
const FEATURES = [
  'apiV2',
  'multiTool',
  'toolMapping',
  'cancelObject',
  'controls',
  'firmwareFlash',
] as const;
type Feature = (typeof FEATURES)[number];
// Wanted per printer: every feature; toolMapping where the firmware has
// HAS_TOOL_MAPPING (a tool changer or an MMU: not the MINI and the iX);
// multiTool on the tool changers.
// What fits each build's budget today, added in that order while the build
// stays within scripts/check-size.ts: the rest waits for room. MK4 carries
// two full pictures (with and without the MMU3) and has none left.
const BUILD_FEATURES: Record<string, readonly Feature[]> = {
  generic: ['apiV2', 'multiTool'],
  xl: ['apiV2', 'multiTool'],
  coreone_indx: ['apiV2', 'multiTool'],
  coreonel_indx: ['apiV2', 'multiTool'],
  mk35: ['apiV2', 'controls'],
  mk4: [],
  coreone: ['apiV2', 'controls'],
  coreonel: ['apiV2', 'controls'],
  ix: ['apiV2', 'cancelObject', 'controls'],
  mini: ['apiV2', 'controls', 'firmwareFlash'],
};
/// The messages only a feature uses, by key prefix.
const MESSAGES: Record<Feature, string[]> = {
  apiV2: ['dialog.', 'status.chamber'],
  multiTool: ['tools.'],
  toolMapping: ['mapping.'],
  cancelObject: ['objects.'],
  controls: ['controls.'],
  firmwareFlash: ['flash.'],
};
const buildFeatures = (variant: string | undefined): readonly string[] => {
  const forced = process.env.PRUSALINK_FEATURES;
  if (forced !== undefined) return forced.split(',');
  if (!variant) return FEATURES;
  return BUILD_FEATURES[variant.replace(/-\w+$/, '')] ?? FEATURES;
};
const VERSION = process.env.PRUSALINK_VERSION;

export default defineConfig(({ command, mode }) => ({
  ...(mode === 'demo' && {
    base: process.env.DEMO_BASE ?? '/Prusa-Link-Web/',
  }),
  define: Object.fromEntries(
    FEATURES.map((f) => [
      `__${f.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}__`,
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
        .filter(([f]) => !buildFeatures(VARIANT).includes(f))
        .flatMap(([, prefixes]) => prefixes),
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
