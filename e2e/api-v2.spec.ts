import { expect, test, type APIRequestContext } from '@playwright/test';

import { freshPrinter, openApp, printer } from './support';

// The printer's firmware has the PrusaLink 2 API (doc/prusalink-api-v2.md in
// Buddy): every tool, dialogs, cancel object, preheat, babysteps, filament
// and firmware commands.

test.beforeEach(async ({ page, request }) => {
  await freshPrinter(page, request, true);
});

interface Snapshot {
  state: string;
  dialog?: unknown;
  objects?: { canceled: boolean }[];
  bed: { target: number };
  tools: { target: number; material: string }[];
  zOffset: number;
  firmware: string;
}

async function mock(request: APIRequestContext): Promise<Snapshot> {
  return (await (await request.get('/__mock/state')).json()) as Snapshot;
}

test.describe('tools', () => {
  test('a five-tool XL shows every tool with its material, the one in use marked', async ({
    page,
    request,
  }) => {
    await printer(request, { model: 'XL', reset: true });
    await printer(request, { parked: false, tool: { index: 1, target: 215 } });
    await openApp(page);
    const rows = page.getByTestId('tool-row');
    await expect(rows).toHaveCount(5);
    await expect(rows.nth(0)).toHaveAttribute('data-active', 'true');
    await expect(rows.nth(1)).toContainText('PETG');
    await expect(rows.nth(1)).toContainText('215');
    await expect(page.getByText('Per tool, on the printer')).toHaveCount(0);
  });

  test('a two-tool XL has two rows; firmware before PrusaLink 2 falls back to the active tool', async ({
    page,
    request,
  }) => {
    await printer(request, { model: 'XL_2', reset: true });
    await openApp(page);
    await expect(page.getByTestId('tool-row')).toHaveCount(2);
    await printer(request, { apiV2: false });
    await page.reload();
    await expect(page.getByText('Per tool, on the printer')).toBeVisible();
    await expect(page.getByTestId('tool-row')).toHaveCount(0);
  });

  test('the CORE One reports its chamber, on the picture too', async ({
    page,
    request,
  }) => {
    await printer(request, { model: 'COREONE_INDX', reset: true });
    await openApp(page);
    await expect(page.getByTestId('heater-label-chamber')).toBeVisible();
    await expect(page.getByTestId('heater-label-T3')).toHaveCount(0);
  });
});

test.describe('dialogs', () => {
  test('the printer asks during a print; the answer goes from the page', async ({
    page,
    request,
  }) => {
    await openApp(page);
    await printer(request, { startPrint: '3DBENC~1.BGC' });
    await printer(request, { dialog: 'runout' });
    const alert = page.getByTestId('printer-alert');
    await expect(alert).toContainText('FILAMENT RUNOUT');
    await expect(alert.getByTestId('dialog-help')).toHaveAttribute(
      'href',
      'https://prusa.io/12301',
    );
    await alert.getByRole('button', { name: 'Continue' }).click();
    await expect(alert).toHaveCount(0);
    expect((await mock(request)).state).toBe('PRINTING');
  });

  test('a red screen shows its message and help, with nothing to press', async ({
    page,
    request,
  }) => {
    await openApp(page);
    await printer(request, { dialog: 'thermal' });
    const alert = page.getByTestId('printer-alert');
    await expect(alert).toContainText('THERMAL RUNAWAY');
    await expect(alert.getByRole('button')).toHaveCount(0);
  });
});
