import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

import { printerImages } from './mock/printer-images.ts';
import { locales } from './mock/locales.ts';
import { devPrinter } from './mock/vite-plugin.ts';

// The production build is index.html alone, with every script and stylesheet
// inlined: the firmware embeds that one file. The mock printer and the dev
// panel are dev-server middleware and never reach the build.
// PRUSALINK_LANG makes a one-language build (the MINI's firmware ships per
// locale): its page carries that language only. A mini-<lang> variant shows
// the MINI's picture.
const VARIANT = process.env.PRUSALINK_VARIANT;
const VERSION = process.env.PRUSALINK_VERSION;

export default defineConfig(({ command, mode }) => ({
  plugins: [
    VERSION !== undefined && version(VERSION),
    printerImages(VARIANT?.startsWith('mini-') ? 'mini' : VARIANT),
    tailwindcss(),
    svelte(),
    locales(process.env.PRUSALINK_LANG),
    command === 'serve' &&
      mode !== 'test' &&
      devPrinter({ printerUrl: process.env.PRINTER_URL }),
    command === 'build' &&
      !process.env.PRUSALINK_ANALYZE &&
      viteSingleFile({ removeViteModuleLoader: true }),
  ],
  // Not Vite's 5173, which other projects on the same machine use.
  server: { port: 5957 },
  build: {
    outDir: VARIANT ? `dist/${VARIANT}` : 'dist',
    target: 'es2022',
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    reportCompressedSize: false,
    // public/ (the favicon) is for the dev server: the firmware has its own.
    copyPublicDir: false,
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
