import { readFileSync } from 'node:fs';

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

test.describe('cancel object', () => {
  test('the plate on the bed; an outline cancels its object after a yes', async ({
    page,
    request,
  }) => {
    await printer(request, {
      model: 'COREONE_INDX',
      reset: true,
      timeScale: 1,
    });
    await openApp(page);
    await printer(request, { startPrint: 'THREES~1.BGC' });
    const bed = page.getByTestId('bed-view');
    await expect(bed.locator('polygon')).toHaveCount(3);
    await expect(page.getByTestId('nozzle')).toBeVisible();
    await bed.getByRole('button', { name: 'Shape-Box' }).click();
    await page
      .getByRole('dialog', { name: 'Cancel Shape-Box?' })
      .getByRole('button', { name: 'Cancel object' })
      .click();
    await expect(
      bed.getByRole('button', { name: 'Shape-Box' }),
    ).toHaveAttribute('data-state', 'canceled');
    expect((await mock(request)).objects?.[2]?.canceled).toBe(true);
  });

  test('a plain G-code file has its outlines in the header', async ({
    page,
    request,
  }) => {
    await printer(request, {
      model: 'COREONE_INDX',
      reset: true,
      timeScale: 1,
    });
    await openApp(page);
    await printer(request, { startPrint: 'THREES~1.GCO' });
    await expect(page.getByTestId('bed-view').locator('polygon')).toHaveCount(
      3,
    );
  });

  test('a file uploaded from this page is read here; nothing is downloaded back', async ({
    page,
    request,
  }) => {
    await printer(request, {
      model: 'COREONE_INDX',
      reset: true,
      timeScale: 1,
    });
    await openApp(page);
    const downloads: string[] = [];
    page.on('request', (r) => {
      if (new URL(r.url()).pathname.startsWith('/usb/'))
        downloads.push(r.url());
    });
    await page
      .getByTestId('file-input')
      .first()
      .setInputFiles({
        name: 'my plate_0.4n_0.15mm_PLA_COREONEINDX4T_43m.bgcode',
        mimeType: 'application/octet-stream',
        buffer: readFileSync(
          new URL('../mock/fixtures/three-shapes.bgcode', import.meta.url),
        ),
      });
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Print now' })
      .click();
    await expect(page.getByTestId('bed-view').locator('polygon')).toHaveCount(
      3,
    );
    expect(downloads).toEqual([]);
  });
});
