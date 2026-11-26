/// Print beds by the `printer` code of /api/version: size in mm (origin at
/// 0,0, as PrusaSlicer's printVolume in 3mf-generator) and the texture's
/// name on Prusa's CDN. The iX has no profile yet.
const BEDS: Readonly<Record<string, readonly [number, number, string]>> = {
  '1.3.5': [250, 210, 'mk35'],
  '1.3.6': [250, 210, 'mk35'],
  '1.3.9': [250, 210, 'mk39'],
  '1.3.10': [250, 210, 'mk39s'],
  '1.4.0': [250, 210, 'mk4_v2'],
  '1.4.1': [250, 210, 'mk4s_v2'],
  '2.1.0': [180, 180, 'mini'],
  '3.1.0': [360, 360, 'xl_v2'],
  '5.1.0': [360, 360, 'xl_v2'],
  '7.1.0': [250, 220, 'coreone_v2'],
  '7.2.0': [250, 220, 'coreoneoak'],
  '7.10.0': [248, 205, 'coreone_indx'],
  '8.1.0': [300, 300, 'coreonel_v2'],
  '8.10.0': [300, 300, 'coreonel_v2'],
};

export interface Bed {
  width: number;
  depth: number;
  /// The bed's artwork; it may be missing, then the bed is plain grey.
  texture?: string | undefined;
}

export function bedOf(code: string | undefined): Bed | undefined {
  const bed = code === undefined ? undefined : BEDS[code];
  return (
    bed && {
      width: bed[0],
      depth: bed[1],
      texture: `https://assets.prusa3d.com/cdn/img/beds/${bed[2]}.svg`,
    }
  );
}

/// A bed that holds `points`, for a printer the page has no size for.
export function bedAround(points: readonly (readonly [number, number])[]): Bed {
  let width = 0;
  let depth = 0;
  for (const [x, y] of points) {
    width = Math.max(width, x);
    depth = Math.max(depth, y);
  }
  return { width: Math.ceil(width + 10), depth: Math.ceil(depth + 10) };
}
