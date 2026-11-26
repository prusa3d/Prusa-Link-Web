import { describe, expect, it } from 'vitest';

import { IdentityStore } from './identity.svelte';

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
