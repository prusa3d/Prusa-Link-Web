import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test';

import { freshPrinter, mockKey, printer } from './support';

// Signing in with the PrusaLink password, and pairing at the printer: the
// page shows a code, the person at the printer presses Yes or Cancel (the
// dev panel's patch plays them), and the printer hands over the password.

test.beforeEach(async ({ page, request }) => {
  await freshPrinter(page, request);
  await printer(request, { pairingSupported: true });
});

const pairButton = (page: Page) =>
  page.getByRole('button', { name: "I'm at the printer" });
const passwordButton = (page: Page) =>
  page.getByRole('button', { name: 'I have the password' });

/// The code the printer's pairing dialog shows, once it shows one.
async function printerScreen(request: APIRequestContext) {
  for (let i = 0; i < 50; i++) {
    const res = await request.get('/__mock/state');
    const { pairing } = (await res.json()) as {
      pairing: { dialog?: { code: string } };
    };
    if (pairing.dialog) return pairing.dialog.code;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('the printer never showed a pairing dialog');
}

test.describe('password', () => {
  test('a password manager finds the user and the password', async ({
    page,
  }) => {
    await page.goto('/');
    await passwordButton(page).click();
    const user = page.locator('input[autocomplete="username"]');
    await expect(user).toHaveValue('maker');
    await expect(user).toBeHidden();
    const password = page.getByLabel('PrusaLink password');
    await expect(password).toHaveAttribute('type', 'password');
    await expect(password).toHaveAttribute('autocomplete', 'current-password');
    await password.fill('abc');
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(password).toHaveAttribute('type', 'text');
  });

  test('a wrong one is refused, the right one signs in', async ({ page }) => {
    await page.goto('/');
    await passwordButton(page).click();
    const password = page.getByLabel('PrusaLink password');
    await password.fill('wrongpassword12');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Wrong password.')).toBeVisible();
    await password.fill(await mockKey(page));
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByTestId('printer-name')).toBeVisible();
  });

  test('the choice is remembered, so a password manager finds the field at once', async ({
    page,
  }) => {
    await page.goto('/');
    await passwordButton(page).click();
    await expect(
      page.getByRole('link', { name: 'From Prusa Connect' }),
    ).toHaveAttribute('href', 'https://connect.prusa3d.com');
    await page.reload();
    await expect(page.getByLabel('PrusaLink password')).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(pairButton(page)).toBeVisible();
    await page.reload();
    await expect(pairButton(page)).toBeVisible();
  });
});

test.describe('pairing', () => {
  test('the printer shows the same code; Yes signs in and keeps the password', async ({
    page,
    request,
  }) => {
    const keyless: string[] = [];
    page.on('request', (req) => {
      if (
        new URL(req.url()).pathname.startsWith('/api/') &&
        !req.headers()['x-api-key']
      )
        keyless.push(req.url());
    });
    await page.goto('/');
    await pairButton(page).click();
    const code = page.getByTestId('pairing-code');
    await expect(code).toHaveText(
      /^[2-9A-HJKMNP-TV-Z]{4}-[2-9A-HJKMNP-TV-Z]{4}$/,
    );
    expect(await printerScreen(request)).toBe(await code.textContent());
    await expect(
      page.getByText('Check the code on the printer and press YES.'),
    ).toBeVisible();
    await printer(request, { pairing: 'pair' });
    await expect(page.getByTestId('printer-name')).toBeVisible();
    expect(
      await page.evaluate(() => localStorage.getItem('prusalink.api-key')),
    ).toBe(await mockKey(page));
    // A request without a key would make a browser show its own login.
    expect(keyless).toEqual([]);
  });

  test('Cancel on the printer says so; the password is one click away', async ({
    page,
    request,
  }) => {
    await page.goto('/');
    await pairButton(page).click();
    await printerScreen(request);
    await printer(request, { pairing: 'cancel' });
    await expect(page.getByText('Cancelled on the printer.')).toBeVisible();
    await passwordButton(page).click();
    await expect(page.getByLabel('PrusaLink password')).toBeVisible();
  });

  test('nobody at the printer: the dialog times out', async ({
    page,
    request,
  }) => {
    await page.goto('/');
    await pairButton(page).click();
    await printerScreen(request);
    await printer(request, { pairing: 'timeout' });
    await expect(page.getByText('Not confirmed in time.')).toBeVisible();
  });

  test('a printing printer does not pair', async ({ page, request }) => {
    await page.goto('/');
    await printer(request, { state: 'PRINTING' });
    await pairButton(page).click();
    await expect(
      page.getByText('The printer pairs only when idle, one device at a time.'),
    ).toBeVisible();
  });

  test('after too many tries the printer locks pairing out', async ({
    page,
    request,
  }) => {
    await page.goto('/');
    await printer(request, { pairing: 'lock' });
    await pairButton(page).click();
    await expect(page.getByText('Too many tries. Try later.')).toBeVisible();
  });

  test('cancelling on the page goes back to the choice', async ({
    page,
    request,
  }) => {
    await page.goto('/');
    await pairButton(page).click();
    await printerScreen(request);
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(pairButton(page)).toBeVisible();
    await expect(page.getByTestId('pairing-code')).toHaveCount(0);
    // Withdrawn: the printer's dialog closes.
    await expect
      .poll(async () => {
        const res = await request.get('/__mock/state');
        return ((await res.json()) as { pairing: { dialog?: unknown } }).pairing
          .dialog;
      })
      .toBeUndefined();
  });

  test('firmware without pairing: only the password is offered', async ({
    page,
    request,
  }) => {
    await printer(request, { pairingSupported: false });
    let probed = false;
    page.on('response', (res) => {
      if (res.url().includes('/api/v1/pairing/')) probed = true;
    });
    await page.goto('/');
    await expect.poll(() => probed).toBe(true);
    await expect(page.getByLabel('PrusaLink password')).toBeVisible();
    await expect(pairButton(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Back' })).toHaveCount(0);
  });
});
