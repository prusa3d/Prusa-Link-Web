import {
  copyFileSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';

import { build } from 'vite';

import { printerFavicon } from '../mock/favicon.ts';
import { firmwareGzip } from './firmware-gzip.ts';
import { PRINTER_IMAGES } from '../mock/printer-images.ts';
import { flattenCssVars, pruneCssVars } from '../mock/prune-css-vars.ts';
import { releaseVersion } from './version.ts';

// One index.html per printer build: the firmware embeds the one for its
// PRINTER (dist/<variant>/index.html). The iX has no picture yet.
// The MINI has the least room: its firmware ships per locale, so it gets one
// build per language (mini-cs, …), English included, each carrying that
// language only.
const LANGS = readdirSync(new URL('../src/locales/', import.meta.url))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.slice(0, -5));
const minis = LANGS.map((lang) => `mini-${lang}`);
const variants = [
  'generic',
  ...Object.keys(PRINTER_IMAGES).filter((v) => v !== 'mini'),
  'ix',
  ...minis,
];
const only = process.argv[2];
// vite.config.ts stamps it into every page.
process.env.PRUSALINK_VERSION = releaseVersion();

rmSync(new URL('../dist', import.meta.url), { recursive: true, force: true });
for (const variant of only ? [only] : variants) {
  const miniLang = /^mini-(\w+)$/.exec(variant)?.[1];
  process.env.PRUSALINK_VARIANT = variant;
  if (miniLang) {
    process.env.PRUSALINK_LANG = miniLang;
  } else {
    delete process.env.PRUSALINK_LANG;
  }
  await build({ logLevel: 'warn' });
  const page = new URL(`../dist/${variant}/index.html`, import.meta.url);
  writeFileSync(page, pruneCssVars(flattenCssVars(readFileSync(page, 'utf8'))));
  // Each printer's own favicon from its picture; the generic build (and the
  // iX, with no picture yet) keeps PrusaLink's.
  const icon = new URL(`../dist/${variant}/favicon.ico`, import.meta.url);
  const picture =
    PRINTER_IMAGES[
      (miniLang ? 'mini' : variant) as keyof typeof PRINTER_IMAGES
    ];
  if (picture)
    writeFileSync(
      icon,
      printerFavicon(
        readFileSync(
          new URL(`../assets/printers/${picture}`, import.meta.url),
          'utf8',
        ),
      ),
    );
  else copyFileSync(new URL('../public/favicon.ico', import.meta.url), icon);
  // Ready to embed or serve as the firmware does, gzipped.
  for (const file of [page, icon])
    writeFileSync(new URL(`${file.href}.gz`), firmwareGzip(readFileSync(file)));
}
