import { readdirSync, readFileSync } from 'node:fs';

import { buildFeatures } from '../build/features.ts';
import { firmwareGzip } from './firmware-gzip.ts';

// The firmware embeds dist/<variant>/index.html gzipped; both sizes are budgets.
const gzipped = (html: Buffer) => firmwareGzip(html).length;
// Gzipped is what the firmware stores. The MINI has the least flash and gets
// lean one-language builds; every other printer has room for 140 KB. The
// raw size only bounds what the browser inflates: the XL's picture is most
// of it and compresses well.
const MINI = { raw: 280 * 1024, gzip: 80 * 1024 };
const OTHERS = { raw: 500 * 1024, gzip: 140 * 1024 };
const budgetOf = (variant: string) =>
  variant.startsWith('mini') ? MINI : OTHERS;

const dist = new URL('../dist/', import.meta.url);
const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;
let over = false;

for (const variant of readdirSync(dist).sort()) {
  const html = readFileSync(new URL(`${variant}/index.html`, dist));
  const raw = html.length;
  const gzip = gzipped(html);
  const budget = budgetOf(variant);
  const bad = raw > budget.raw || gzip > budget.gzip;
  over ||= bad;
  console.log(
    `${bad ? '✗' : '✓'} ${variant.padEnd(14)} ${kb(raw).padStart(9)} raw  ${kb(gzip).padStart(8)} gzip  (budget ${kb(budget.gzip)})  ${buildFeatures(variant).join(' ')}`,
  );
}
if (over) process.exit(1);
