import { afterEach, describe, expect, it } from 'vitest';

import { BUILDS, buildFeatures, NEEDS_API_V2 } from './features.ts';

describe('buildFeatures', () => {
  const api = process.env.PRUSALINK_API;
  afterEach(() => {
    if (api === undefined) delete process.env.PRUSALINK_API;
    else process.env.PRUSALINK_API = api;
  });

  it('leaves out every PrusaLink 2 feature for today’s firmware', () => {
    process.env.PRUSALINK_API = 'v1';
    for (const variant of [undefined, ...Object.keys(BUILDS), 'mini-cs'])
      expect(
        buildFeatures(variant).filter((f) => NEEDS_API_V2.includes(f)),
      ).toEqual([]);
    expect(buildFeatures('xl')).toContain('pictureParts');
    expect(buildFeatures('mini-en')).toContain('pairing');
  });

  it('keeps the table for PrusaLink 2', () => {
    process.env.PRUSALINK_API = 'v2';
    expect(buildFeatures('xl')).toEqual(BUILDS.xl);
    expect(buildFeatures(undefined)).toContain('apiV2');
  });

  it('refuses an API it does not know', () => {
    process.env.PRUSALINK_API = 'v3';
    expect(() => buildFeatures('xl')).toThrow(/v1 or v2/);
  });
});
