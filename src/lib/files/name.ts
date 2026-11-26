/// Reads what PrusaSlicer puts into a file name, the way PrusaOS does
/// (modules/storage-manager displayname.py): each known output template becomes
/// a pattern, the first that matches wins, and anything the person typed after
/// the fields stays in the name. A name no template fits is shown whole.

export interface FileNameInfo {
  /// The project name: `phone-stand`, or `phone-stand_v1` with a suffix.
  name: string;
  materials: string[];
  /// Seconds.
  duration?: number;
  nozzle?: string;
  layer?: string;
  printer?: string;
}

const NUMBER = String.raw`\d+(?:\.\d*)?`;

const FIELDS: Record<string, string> = {
  nozzle_diameter: `(?<nozzle>${NUMBER})`,
  layer_height: `(?<layer>${NUMBER})`,
  print_time: String.raw`(?<time>(?:\d+[dhms])+)`,
  filament_type: String.raw`(?<materials>[\w-]+)`,
  printing_filament_types: String.raw`(?<materials>[\w-]+(?:,[\w-]+)*)`,
  printer_model: String.raw`(?<printer>[\w.-]+)`,
};

/// PrusaSlicer's templates, newest first.
const FORMATS = [
  '{input_filename_base}_{nozzle_diameter}n_{layer_height}mm_{printing_filament_types}_{printer_model}_{print_time}',
  '{input_filename_base}_{layer_height}mm_{printing_filament_types}_{printer_model}_{print_time}',
  '{input_filename_base}_{layer_height}mm_{filament_type}_{printer_model}',
];

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function pattern(format: string): RegExp {
  const body = format.replace(
    /\{(\w+)(?:\[\d+\])?\}|([^{]+)/g,
    (_, field: string | undefined, literal: string | undefined) => {
      if (field === 'input_filename_base') return '(?<base>.+)';
      if (field) return FIELDS[field] ?? '.+?';
      return escape(literal ?? '');
    },
  );
  // The firmware's 8.3 names end in .gco and .bgc.
  return new RegExp(`^${body}(?<suffix>.*?)\\.(?:b?gcode|gco|bgc)$`, 'i');
}

const PATTERNS = FORMATS.map(pattern);

const DURATION = /(\d+)([dhms])/g;
const UNIT: Record<string, number> = { d: 86_400, h: 3600, m: 60, s: 1 };

function seconds(time: string): number {
  let total = 0;
  for (const [, n, unit] of time.matchAll(DURATION))
    total += Number(n) * (UNIT[unit ?? ''] ?? 0);
  return total;
}

export function parseFileName(fileName: string): FileNameInfo {
  for (const re of PATTERNS) {
    const g = re.exec(fileName)?.groups;
    if (!g) continue;
    return {
      name: ((g.base ?? '') + (g.suffix ?? '')).replaceAll('%20', ' '),
      materials: g.materials?.split(',') ?? [],
      ...(g.time !== undefined && { duration: seconds(g.time) }),
      ...(g.nozzle !== undefined && { nozzle: g.nozzle }),
      ...(g.layer !== undefined && { layer: `${g.layer}mm` }),
      ...(g.printer !== undefined && { printer: g.printer }),
    };
  }
  const dot = fileName.lastIndexOf('.');
  return {
    name: (dot === -1 ? fileName : fileName.slice(0, dot)).replaceAll(
      '%20',
      ' ',
    ),
    materials: [],
  };
}

/// `1h 36m`, `14m`, `2d 3h`.
export function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const min = m % 60;
  return [
    d && `${String(d)}d`,
    h && `${String(h)}h`,
    (min || (!d && !h)) && `${String(min)}m`,
  ]
    .filter(Boolean)
    .join(' ');
}
