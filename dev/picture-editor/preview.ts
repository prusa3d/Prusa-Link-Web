import tokens from '../../src/styles/tokens.css?raw';
import { STATE_TONE } from '../../src/lib/printer/state.ts';
import { fanTurn } from '../../src/lib/printer/status-picture.ts';

/// Each custom property's first value in the app's tokens: the light theme.
const values = new Map<string, string>();
for (const [, name = '', value = ''] of tokens.matchAll(
  /(--[\w-]+):\s*([^;]+);/g,
))
  if (!values.has(name)) values.set(name, value.trim());

function resolve(value: string, depth = 0): string {
  return depth > 8
    ? value
    : value.replace(/var\((--[\w-]+)\)/g, (ref, name: string) => {
        const v = values.get(name);
        return v === undefined ? ref : resolve(v, depth + 1);
      });
}

/// The colour the app fills a picture's status parts with in `state`: its
/// state badge's edge colour, in the light theme.
export function stateColor(state: keyof typeof STATE_TONE): string {
  return resolve(`var(--state-${STATE_TONE[state]}-edge)`);
}

/// Seconds per turn of a fan running at `percent` of a hotend fan's full
/// speed, as the app would turn it; none when it stands.
export function previewFanTurn(percent: number): number | undefined {
  return fanTurn(
    { kind: 'hotend' },
    { fan_hotend: (FULL_RPM * percent) / 100 },
    { offline: false, toolPicked: true, mini: false },
  );
}

/// The firmware's FANCTLHEATBREAK_RPM_MAX on the CORE One and the MK4.
const FULL_RPM = 15180;
