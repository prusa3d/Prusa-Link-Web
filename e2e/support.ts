import { type Page, type APIRequestContext } from '@playwright/test';

/// The mock printer's password.
export async function mockKey(page: Page) {
  const res = await page.request.get('/__mock/state');
  return ((await res.json()) as { apiKey: string }).apiKey;
}

/// What the dev panel can make the mock printer do (mock/control.ts).
export async function printer(
  request: APIRequestContext,
  patch: Record<string, unknown>,
) {
  await request.patch('/__mock/state', { data: patch });
}

/// A fresh MK4S on 8.0.1, and GitHub answering that 8.0.2 is out.
export async function freshPrinter(page: Page, request: APIRequestContext) {
  // A printer quick to pause and stop; the cases about waiting slow it down.
  await printer(request, {
    model: 'MK4S',
    reset: true,
    firmware: '8.0.1',
    transitionSeconds: 1,
  });
  await page.route(/api\.github\.com/, (route) =>
    route.fulfill({
      json: {
        tag_name: 'v8.0.2',
        html_url:
          'https://github.com/prusa3d/Prusa-Firmware-Buddy/releases/tag/v8.0.2',
        assets: [
          {
            name: 'MK4_MK4S_MK3.9_MK3.9S_firmware_8.0.2.bbf',
            browser_download_url: 'https://example.invalid/mk4.bbf',
          },
        ],
      },
    }),
  );
}

/// Signed in on the mock printer.
export async function openApp(page: Page) {
  await page.goto(`/#key=${await mockKey(page)}`);
  await page.getByTestId('printer-name').waitFor();
}

/// A person at the mock printer during a filament change: waits until the
/// printer asks for `step` on its screen, then does `action`.
export async function atPrinter(
  request: APIRequestContext,
  step: 'remove' | 'insert',
  action: 'removed' | 'inserted' | 'cancel',
) {
  for (let i = 0; i < 100; i++) {
    const res = await request.get('/__mock/state');
    const { filamentStep } = (await res.json()) as { filamentStep?: string };
    if (filamentStep === step) {
      await printer(request, { filament: action });
      return;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`the printer never asked to ${step} the filament`);
}

/// A whole PLA → other swap done by the person at the printer.
export async function swapAtPrinter(request: APIRequestContext) {
  await atPrinter(request, 'remove', 'removed');
  await atPrinter(request, 'insert', 'inserted');
}
