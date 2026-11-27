import { describe, expect, it } from 'vitest';

import { IdentityStore, toolsOf } from './identity.svelte';

describe('IdentityStore', () => {
  it('names the printer from its model code and hostname', async () => {
    const identity = new IdentityStore(() =>
      Promise.resolve({ code: '3.1.0', hostname: 'prusa-xl' }),
    );
    await identity.refresh();
    expect(identity.model?.variant).toBe('xl');
    expect(identity.title).toBe('prusa-xl · Original Prusa XL');
  });

  it('treats an empty hostname as none', async () => {
    const identity = new IdentityStore(() =>
      Promise.resolve({ code: '7.1.0', hostname: '' }),
    );
    await identity.refresh();
    expect(identity.hostname).toBeUndefined();
    expect(identity.title).toBe('Prusa CORE One');
  });

  it('keeps what it knew when the printer does not answer', async () => {
    let fail = false;
    const identity = new IdentityStore(() =>
      fail
        ? Promise.reject(new Error('down'))
        : Promise.resolve({ code: '1.4.1', hostname: 'mk4s' }),
    );
    await identity.refresh();
    fail = true;
    await identity.refresh();
    expect(identity.title).toBe('mk4s · Original Prusa MK4S');
  });
});

describe('tools and enclosure', () => {
  it('count the tools /api/v1/info lists, MMU slots left out', () => {
    expect(
      toolsOf({
        tool_count: 3,
        tools: { '0': { type: 'FFF_PRINT_HEAD' }, '0.1': {}, '2': null },
      }),
    ).toHaveLength(3);
    expect(toolsOf(undefined)).toEqual([]);
  });

  it('keep the enclosure the printer reports', async () => {
    const identity = new IdentityStore(() =>
      Promise.resolve({ code: '3.1.0', tools: [{}, {}], enclosure: true }),
    );
    expect(identity.enclosure).toBe(false);
    await identity.refresh();
    expect(identity.tools).toHaveLength(2);
    expect(identity.enclosure).toBe(true);
  });
});
