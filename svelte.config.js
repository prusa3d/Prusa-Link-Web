import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  // No `window.__svelte` version stamp: bytes the firmware budget can use.
  compilerOptions: { discloseVersion: false },
};
