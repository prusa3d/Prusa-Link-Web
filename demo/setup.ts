import { mountDrawer } from '../dev/mount-drawer.ts';
import { MockPrinter } from '../mock/printer.ts';
import { installMockTransport } from './transport.ts';

// Runs before the app (demo/main.ts imports it first): the page's printer is
// the mock, answered in the browser, and the visitor is signed in.
const printer = new MockPrinter();
installMockTransport(printer);
setInterval(() => {
  printer.tick();
}, 1000);

const KEY_STORAGE = 'prusalink.api-key';
const REPO = 'https://github.com/prusa3d/Prusa-Link-Web/tree/version-2.x';

function hasKey() {
  try {
    return Boolean(
      localStorage.getItem(KEY_STORAGE) ?? sessionStorage.getItem(KEY_STORAGE),
    );
  } catch {
    return false;
  }
}
if (!hasKey() && !location.hash.includes('key='))
  history.replaceState(null, '', `#key=${printer.apiKey}`);

// Inline styles: Tailwind scans the whole repo into the firmware's CSS, so
// demo-only classes would cost the firmware budget.
const banner = document.createElement('div');
banner.setAttribute('role', 'note');
banner.style.cssText =
  'position:fixed;left:1rem;bottom:1rem;z-index:40;max-width:calc(100vw - 7rem);' +
  'padding:.4rem .8rem;border-radius:999px;background:#fa6831;color:#fff;' +
  'font:500 12px/1.4 system-ui,sans-serif;box-shadow:0 2px 8px rgb(0 0 0/.25)';
const link = document.createElement('a');
link.href = REPO;
link.textContent = 'source';
link.style.cssText = 'color:inherit;text-decoration:underline';
banner.append(`Demo — mock printer · password ${printer.apiKey} · `, link);
document.body.append(banner);

mountDrawer({ open: innerWidth >= 1280 });
