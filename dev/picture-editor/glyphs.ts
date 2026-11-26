import type { Heater } from './status.ts';

export interface Glyph {
  viewBox: [number, number];
  paths: { d: string; opacity?: number }[];
}

// Nozzle and bed are the app's TelemetryIcon (src/lib/ui/telemetry-icon),
// copied as path data so a status picture can carry them inline.
const NOZZLE: Glyph = {
  viewBox: [352, 512],
  paths: [
    {
      d: 'M328 288h-72v-62l25-4c4-1 7-5 6-9l-3-16c-1-4-5-7-9-6l-20 4v-40l25-4c4-1 7-5 6-9l-3-16c-1-4-5-7-9-6l-20 4V82l25-4c4-1 7-5 6-9L285 53c-1-4-5-7-9-6l-20 4V24c0-13-11-24-24-24H120c-13 0-24 11-24 24v54l-25 4c-4 1-7 5-6 9l3 16c1 4 5 7 9 6l20-4v40l-25 4c-4 1-7 5-6 9l3 16c1 4 5 7 9 6l20-4v40l-25 4c-4 1-7 5-6 9l3 16c1 4 5 7 9 6l20-4V288H24c-13 0-24 11-24 24v80c0 13 11 24 24 24h40l73 87c5 6 11 9 18 9h42c7 0 14-3 18-9l73-87h40c13 0 24-11 24-24v-80c0-13-11-24-24-24zM112 384v-64h128v64H112zM128 32h96v23l-96 17V32zm0 73l96-17v40l-96 17v-40zm0 72l96-17v40l-96 17v-40zm0 72l96-17V288h-96v-39zM32 384v-64h48v64H32zm160 96h-32l-53-64h139L192 480zm128-96h-48v-64h48v64z',
    },
  ],
};

const BED: Glyph = {
  viewBox: [24, 24],
  paths: [
    {
      d: 'm8.2,13.8c-1.6,-1.6,-1.8,-2.5,-0.4,-4.2c0.5,-0.6,0.7,-1.2,0.7,-1.8c0,-1.2,-0.9,-2.5,-2.1,-3.9l-1.9,1.8c1.8,2.1,1.6,2.3,0.3,4.1c-0.4,0.6,-0.6,1.2,-0.6,1.8c0,1.5,1.1,2.9,2.2,4l1.8,-1.7l0,0Zm11.3,0c-1.6,-1.6,-1.8,-2.5,-0.4,-4.2c0.5,-0.6,0.7,-1.2,0.7,-1.8c0,-1.2,-0.9,-2.5,-2.1,-3.9l-1.9,1.8c1.8,2.1,1.6,2.3,0.3,4.1c-0.4,0.6,-0.6,1.2,-0.6,1.8c0,1.5,1.1,2.9,2.2,4l1.8,-1.7l0,0Zm-5.7,0c-1.6,-1.6,-1.8,-2.5,-0.4,-4.2c0.5,-0.6,0.7,-1.2,0.7,-1.8c0,-1.2,-0.9,-2.5,-2.1,-3.9l-1.9,1.8c1.8,2.1,1.6,2.3,0.3,4.1c-0.4,0.6,-0.6,1.2,-0.6,1.8c0,1.5,1.1,2.9,2.2,4l1.8,-1.7l0,0Z',
      opacity: 0.6,
    },
    { d: 'm2,17.4l20,0l0,2.8l-20,0Z' },
  ],
};

// An enclosure with a wave of warm air inside.
const CHAMBER: Glyph = {
  viewBox: [24, 24],
  paths: [
    {
      d: 'M3 2h18a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Zm1 2v16h16V4Z',
    },
    {
      d: 'M7 16c-1.2-1.3-1.3-2-.3-3.3.9-1.2.6-2.1-.5-3.4l1.4-1.3c1.6 1.9 1.9 3.3.6 5-.6.8-.5 1.1.3 1.9Zm5 0c-1.2-1.3-1.3-2-.3-3.3.9-1.2.6-2.1-.5-3.4l1.4-1.3c1.6 1.9 1.9 3.3.6 5-.6.8-.5 1.1.3 1.9Zm5 0c-1.2-1.3-1.3-2-.3-3.3.9-1.2.6-2.1-.5-3.4l1.4-1.3c1.6 1.9 1.9 3.3.6 5-.6.8-.5 1.1.3 1.9Z',
      opacity: 0.6,
    },
  ],
};

export const CHEVRON_UP: Glyph = {
  viewBox: [24, 24],
  paths: [{ d: 'M12 2 24 15v7L12 9 0 22v-7Z' }],
};

export const CHEVRON_DOWN: Glyph = {
  viewBox: [24, 24],
  paths: [{ d: 'M12 22 0 9V2l12 13L24 2v7Z' }],
};

export function heaterGlyph(h: Heater): Glyph {
  if (h === 'bed') return BED;
  if (h === 'chamber') return CHAMBER;
  return NOZZLE;
}

export interface Reading {
  current: number;
  target: number | null;
}

/// Heating or cooling towards the target; steady within 2 degrees of it or
/// without one.
export function trend(r: Reading): 'up' | 'down' | null {
  if (r.target === null || Math.abs(r.target - r.current) <= 2) return null;
  return r.target > r.current ? 'up' : 'down';
}
