import { mount } from 'svelte';

import Drawer from './drawer.svelte';

export function mountDrawer(props: { open?: boolean } = {}) {
  const host = document.createElement('div');
  document.body.append(host);
  mount(Drawer, { target: host, props });

  // A modal <dialog> makes the rest of the page inert, the mock printer's panel
  // included, yet a person at the printer must be able to act while the app's
  // dialog waits (take the filament out, cancel). While a modal dialog is open
  // the panel lives inside it; it is fixed to the viewport either way.
  new MutationObserver(() => {
    const open =
      document.querySelector<HTMLDialogElement>('dialog[open]:modal');
    const parent = open ?? document.body;
    if (host.parentElement !== parent) parent.append(host);
  }).observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ['open'],
  });
}
