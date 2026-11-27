/// What each printer's page includes. To change what a build carries, edit
/// BUILDS below: every feature is a compile-time constant (`__NAME__`, e.g.
/// `__TOOL_MAPPING__`), so a feature that is off leaves its code and its
/// messages (MESSAGES) out of that build. scripts/check-size.ts prints the
/// features of every build next to its size.
///
/// The dev server, the tests and the demo have every feature;
/// PRUSALINK_FEATURES (comma-separated) overrides the table, to measure.

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
  /// Tune, preheat, cool down, Z offset.
  controls: 'printer controls',
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
  /// Signing in by confirming a code on the printer, besides the password.
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
  // 80 KB per language: firmware updates are the printer menu's (and
  // Connect's), cancel object waits for room. The controls stay; the red
  // screen, the dump notice and log toggle and pairing (the password
  // signs in) do not. Its picture has no fans, light or chamber.
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
    'redScreen',
    'pairing',
  ),
};

/// The features of a build variant; every feature without one (dev server,
/// tests, demo).
export function buildFeatures(variant: string | undefined): readonly Feature[] {
  const forced = process.env.PRUSALINK_FEATURES;
  if (forced !== undefined) return forced.split(',') as Feature[];
  if (!variant) return ALL;
  return BUILDS[variant.replace(/-\w+$/, '')] ?? ALL;
}

/// `nozzleBadges` → `__NOZZLE_BADGES__`.
export const flagName = (f: Feature) =>
  `__${f.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}__`;

/// Every flag's name, for `define` and the linter's globals.
export const FLAGS = (Object.keys(FEATURES) as Feature[]).map(flagName);
