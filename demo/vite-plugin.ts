import type { Plugin } from 'vite';

/// The demo build's page: demo/main.ts, which installs the in-browser mock
/// printer, instead of the app's own entry.
export function demoPage(): Plugin {
  return {
    name: 'prusalink-demo-page',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) =>
        html
          .replace('/src/main.ts', '/demo/main.ts')
          .replace('<title>PrusaLink</title>', '<title>PrusaLink demo</title>'),
    },
  };
}
