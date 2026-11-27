import { describe, expect, it } from 'vitest';

import { reason } from './reason';

describe('reason', () => {
  it('reads a firmware status page', () => {
    expect(reason('409: Conflict\n\nDock position not calibrated')).toBe(
      'Dock position not calibrated',
    );
    expect(reason('404: Not Found')).toBeUndefined();
  });

  it('reads a JSON refusal', () => {
    expect(
      reason({
        reason: 'incompatible',
        tool: '0',
        check: 'Nozzle not hardened',
      }),
    ).toBe('Nozzle not hardened');
    expect(reason({ title: 'Conflict', text: 'Printer is busy' })).toBe(
      'Printer is busy',
    );
    expect(reason(undefined)).toBeUndefined();
  });
});
