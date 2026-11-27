/// What each printer's page includes. To change what a build carries, edit
/// BUILDS below: every feature is a compile-time constant (`__NAME__`, e.g.
/// `__TOOL_MAPPING__`), so a feature that is off leaves its code and its
/// messages (MESSAGES) out of that build. scripts/check-size.ts prints the
/// features of every build next to its size.
///
/// The dev server, the tests and the demo have every feature the API
/// allows; PRUSALINK_FEATURES (comma-separated) overrides the table, to
/// measure.

export const FEATURES = {
  /// The expanded status (every tool, chamber, change counters) and the
  /// printer's dialogs, which the rest builds on.
  apiV2: 'PrusaLink 2 status and dialogs',
  /// Views per tool: tool cards, per-tool heating. Tool changers only.
  multiTool: 'per-tool views',
  /// Tool mapping and the compatibility checks in the print dialog, where
  /// the firmware has HAS_TOOL_MAPPING (a tool changer or an MMU).
  toolMapping: 'tool mapping at print start',
  /// Cancel object, with the bed map of the objects.
  cancelObject: 'cancel object',
  /// Preheat for a filament and cool down while idle; the nozzle warning
  /// of the print dialog.
  controls: 'preheat, cool down',
  /// Babysteps of the first layer (Z offset) while printing.
  babystep: 'Z offset while printing',
  /// The notice of a newer firmware release and the dialog that downloads
  /// it and puts it on the USB stick.
  firmwareUpdate: 'firmware release notice and download',
  /// Firmware files on the USB stick listed and flashed from the page.
  firmwareFlash: 'firmware flash card',
  /// Hardened / high-flow / high-temperature badges on tools.
  nozzleBadges: 'nozzle badges',
  /// The preheat dialog that picks tools and a filament per tool.
  preheatDialog: 'multi-tool preheat dialog',
  /// The change filaments dialog (the printer's change all).
  changeFilaments: 'change filaments dialog',
  /// Crash dump notice and download, log toggle.
  diagnostics: 'crash dump and logs',
  /// The printer's red screen (BSOD, fatal error) in the page.
  redScreen: 'red screen',
  /// The card of the print that ended last, to print it again.
  lastPrint: 'last print card',
  /// The printer picture's fans, status light, chamber and toolchanger
  /// carriage. A picture without them (the MINI's) needs none of it.
  pictureParts: 'picture fans, status light, chamber, carriage',
  /// Signing in by confirming a code on the printer, besides the password,
  /// where the firmware has it: an unknown code's 404 says so, firmware
  /// without it answers 401 and the page offers the password only.
  pairing: 'sign-in by pairing at the printer',
} as const;

export type Feature = keyof typeof FEATURES;

const ALL = Object.keys(FEATURES) as Feature[];
const without = (...off: Feature[]) => ALL.filter((f) => !off.includes(f));

/// An MMU printer: tool mapping over its slots, one nozzle.
const MMU = without('multiTool');
/// One tool, no MMU.
const SINGLE = without(
  'multiTool',
  'toolMapping',
  'nozzleBadges',
  'preheatDialog',
  'changeFilaments',
);

/// The firmware API a build talks to. `v1` is what the Buddy firmware serves
/// today; `v2` is PrusaLink 2 (the firmware's prusalink-api-v2 work: the
/// expanded status, /api/v1/info's tools tree, print checks, the printer
/// commands and dialogs). PRUSALINK_API overrides it. Pairing is in both:
/// the page offers it only where the firmware answers its probe.
export type Api = 'v1' | 'v2';
export const DEFAULT_API: Api = 'v1';

/// What only the PrusaLink 2 firmware API serves: left out of every build
/// for `v1`, on top of BUILDS.
export const NEEDS_API_V2: readonly Feature[] = [
  'apiV2',
  'multiTool',
  'toolMapping',
  'cancelObject',
  'controls',
  'babystep',
  'firmwareFlash',
  'nozzleBadges',
  'preheatDialog',
  'changeFilaments',
  'diagnostics',
  'redScreen',
];

/// Paths only the PrusaLink 2 firmware API serves. A `v1` build that names
/// one would call what today's firmware answers 404 (scripts/check-size.ts
/// refuses it).
export const API_V2_PATHS: readonly string[] = [
  '/api/v1/dialog',
  '/api/v1/print/checks',
  '/api/v1/printer',
  '/api/v1/filament',
  '/api/v1/tools/',
  '/api/v1/diagnostics',
  '/objects',
];

export function buildApi(): Api {
  const api = process.env.PRUSALINK_API ?? DEFAULT_API;
  if (api !== 'v1' && api !== 'v2')
    throw new Error(`PRUSALINK_API is v1 or v2, not ${api}`);
  return api;
}

/// By build variant; `mini-<lang>` builds use `mini`.
export const BUILDS: Record<string, readonly Feature[]> = {
  generic: ALL,
  // Its picture is the largest: the crash dump notice and log toggle of a
  // running printer make room (the red screen keeps its dump).
  xl: without('diagnostics'),
  coreone_indx: ALL,
  coreonel_indx: ALL,
  mk35: MMU,
  mk4: MMU,
  coreone: MMU,
  coreonel: MMU,
  ix: SINGLE,
  // One language per build: firmware updates are the printer menu's (and
  // Connect's), cancel object waits for room. Pairing, preheat and the red
  // screen stay with babysteps; the dump notice and log toggle do not. Its
  // picture has no fans, light or chamber.
  mini: without(
    'firmwareUpdate',
    'diagnostics',
    'lastPrint',
    'multiTool',
    'toolMapping',
    'nozzleBadges',
    'preheatDialog',
    'changeFilaments',
    'firmwareFlash',
    'cancelObject',
    'pictureParts',
  ),
};

/// The features of a build variant; every feature without one (dev server,
/// tests, demo). Either way only those the build's API serves.
export function buildFeatures(variant: string | undefined): readonly Feature[] {
  const forced = process.env.PRUSALINK_FEATURES;
  if (forced !== undefined) return forced.split(',') as Feature[];
  const features = variant
    ? (BUILDS[variant.replace(/-\w+$/, '')] ?? ALL)
    : ALL;
  return buildApi() === 'v2'
    ? features
    : features.filter((f) => !NEEDS_API_V2.includes(f));
}

/// `nozzleBadges` → `__NOZZLE_BADGES__`.
export const flagName = (f: Feature) =>
  `__${f.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}__`;

/// Every flag's name, for `define` and the linter's globals.
export const FLAGS = (Object.keys(FEATURES) as Feature[]).map(flagName);
