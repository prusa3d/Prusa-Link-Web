import { copyFileSync } from 'node:fs';
import { join } from 'node:path';

// Copies the generic build (index.html and favicon.ico) into a Buddy checkout's
// src/resources/web/. The per-printer builds (dist/<variant>/) wait until the
// firmware picks a printer's own build in src/resources/CMakeLists.txt.
const buddy = process.argv[2];
if (!buddy) {
  console.error('usage: fw-web.ts <buddy checkout>');
  process.exit(2);
}

const web = join(buddy, 'src/resources/web');
copyFileSync(join('dist', 'generic', 'index.html'), join(web, 'index.html'));
console.log(`dist/generic/index.html -> ${join(web, 'index.html')}`);
copyFileSync(join('dist', 'generic', 'favicon.ico'), join(web, 'favicon.ico'));
console.log(`dist/generic/favicon.ico -> ${join(web, 'favicon.ico')}`);
