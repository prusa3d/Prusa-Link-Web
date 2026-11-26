import { parseFileName } from '../src/lib/files/name.ts';

/// The colour a filament of this material usually is, for mock thumbnails.
const MATERIAL_COLOR: Record<string, string> = {
  PLA: '#fa6831',
  PETG: '#2f80ed',
  ASA: '#4f4f4f',
  TPU: '#27ae60',
  PVA: '#e0d6b8',
};

/// A stand-in for the PNG the firmware cuts out of a G-code file: a part on
/// a print sheet, in the colour of its first material.
export function mockThumbnail(displayName: string, large: boolean): string {
  const info = parseFileName(displayName);
  const color = MATERIAL_COLOR[info.materials[0] ?? 'PLA'] ?? '#fa6831';
  let seed = 0;
  for (let i = 0; i < info.name.length; i++) seed += info.name.charCodeAt(i);
  const w = 30 + (seed % 25);
  const h = 25 + ((seed >> 2) % 30);
  const size = large ? 240 : 64;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${String(size)}" height="${String(size)}" viewBox="0 0 100 100">
<rect width="100" height="100" fill="#f2f2f3"/>
<path d="M10 78 L50 92 L90 78 L50 64 Z" fill="#d7d7db"/>
<g transform="translate(${String(50 - w / 2)} ${String(72 - h)})">
<rect width="${String(w)}" height="${String(h)}" rx="4" fill="${color}"/>
<rect width="${String(w)}" height="${String(h / 3)}" rx="4" fill="#fff" opacity=".25"/>
</g></svg>`;
}
