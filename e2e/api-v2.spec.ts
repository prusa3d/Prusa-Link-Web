import { readFileSync } from 'node:fs';

import { expect, test, type APIRequestContext } from '@playwright/test';

import { freshPrinter, openApp, printer, swapAtPrinter } from './support';

// The printer's firmware has the PrusaLink 2 API (doc/prusalink-api-v2.md in
// Buddy): every tool, dialogs, cancel object, preheat, babysteps, filament
// and firmware commands.

test.beforeEach(async ({ page, request }) => {
  await freshPrinter(page, request);
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

  test('a two-tool XL has two rows', async ({ page, request }) => {
    await printer(request, { model: 'XL_2', reset: true });
    await openApp(page);
    await expect(page.getByTestId('tool-row')).toHaveCount(2);
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

test.describe('controls', () => {
  test('preheat for a filament when idle, then cool down', async ({
    page,
    request,
  }) => {
    await openApp(page);
    const preheat = page.getByTestId('preheat');
    await preheat.getByRole('combobox').selectOption('PETG');
    await preheat.getByRole('button', { name: 'Preheat' }).click();
    await expect.poll(async () => (await mock(request)).bed.target).toBe(85);
    await preheat.getByRole('button', { name: 'Cool down' }).click();
    await expect.poll(async () => (await mock(request)).bed.target).toBe(0);
  });

  test('babysteps while printing, and no preheat then', async ({
    page,
    request,
  }) => {
    await openApp(page);
    await printer(request, { startPrint: '3DBENC~1.BGC' });
    await expect(page.getByTestId('preheat')).toHaveCount(0);
    const babystep = page.getByTestId('babystep');
    await babystep
      .getByRole('button', { name: 'Nozzle closer to the bed' })
      .click();
    await babystep
      .getByRole('button', { name: 'Nozzle closer to the bed' })
      .click();
    await expect(babystep.getByTestId('z-offset')).toHaveText('-0.050 mm');
    expect((await mock(request)).zOffset).toBe(-0.05);
  });

  test('a tool of the XL gets its filament from the page', async ({
    page,
    request,
  }) => {
    await printer(request, { model: 'XL', reset: true });
    await openApp(page);
    await page.getByRole('button', { name: 'Filament T3' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'PETG' }).click();
    await swapAtPrinter(request);
    await expect
      .poll(async () => (await mock(request)).tools[2]?.material, {
        timeout: 15_000,
      })
      .toBe('PETG');
    await expect(page.getByTestId('tool-row').nth(2)).toContainText('PETG');
  });
});

test.describe('firmware on the USB drive', () => {
  test('lists every .bbf with its version and installs only a newer one', async ({
    page,
    request,
  }) => {
    await printer(request, { firmwareFiles: true });
    await openApp(page);
    const card = page.getByTestId('usb-firmware');
    const rows = card.getByTestId('usb-bbf');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(1)).toContainText('Older');
    await expect(rows.nth(2)).toContainText('For another printer');
    await expect(card.getByRole('button', { name: 'Install' })).toHaveCount(1);
    await expect(
      page
        .getByRole('list', { name: 'Files on the printer' })
        .getByText('_firmware_'),
    ).toHaveCount(0);
    await card.getByRole('button', { name: 'Install' }).click();
    await page
      .getByRole('dialog', { name: 'Install firmware 8.0.2?' })
      .getByRole('button', { name: 'Install' })
      .click();
    await expect(card).toContainText('restarting');
    await expect.poll(async () => (await mock(request)).firmware).toBe('8.0.2');
  });
});

test.describe('tool mapping', () => {
  async function indx(request: APIRequestContext) {
    await printer(request, { model: 'COREONE_INDX', reset: true });
    await printer(request, {
      tool: { index: 1, material: 'PETG', color: '#1F77B4' },
    });
    await printer(request, {
      tool: { index: 3, material: 'ASA', color: '#D62728' },
    });
  }
  const startedWith = async (request: APIRequestContext) =>
    (
      (await (await request.get('/__mock/state')).json()) as {
        mapping?: unknown;
      }
    ).mapping;

  test('suggests by material and colour; changing it, then printing sends it', async ({
    page,
    request,
  }) => {
    await indx(request);
    await openApp(page);
    await page.getByRole('button', { name: 'Print four colours' }).click();
    const dialog = page.getByRole('dialog');
    const filament = (n: number) =>
      dialog.locator(`[data-filament="${String(n)}"]`);
    const slot = (n: number) => dialog.locator(`[data-slot="${String(n)}"]`);
    await expect(dialog.getByTestId('mapping-row')).toHaveCount(4);
    await expect(slot(1).getByTestId('mapping-fit')).toHaveText('Exact match');
    // The second green PLA is not loaded: the blue PLA in T7 comes nearest.
    await expect(slot(7).getByTestId('mapping-fit')).toHaveText(
      'Similar colour',
    );
    // Extruder 1 takes T7: extruder 3 loses it, and printing waits.
    await filament(1).getByRole('button', { name: 'Assign slot' }).click();
    await slot(7).getByRole('button', { name: 'Replace' }).click();
    await expect(filament(3)).toContainText('Unmapped');
    await expect(
      dialog.getByRole('button', { name: 'Print now' }),
    ).toBeDisabled();
    await filament(3).getByRole('button', { name: 'Assign slot' }).click();
    await slot(1).getByRole('button', { name: 'Assign slot' }).click();
    await filament(1).getByRole('button', { name: 'Assign slot' }).click();
    await slot(6).getByRole('button', { name: 'Spool join' }).click();
    await filament(1).getByRole('button', { name: 'Cancel' }).click();
    await dialog.getByRole('button', { name: 'Print now' }).click();
    await expect
      .poll(() => startedWith(request))
      .toEqual({ '1': [7, 6], '2': [2], '3': [1], '4': [4] });
  });

  test('a filament dragged onto a slot takes it, and a slot onto a filament', async ({
    page,
    request,
  }) => {
    // Both ends of a drag on screen: the dialog does not scroll during one.
    await page.setViewportSize({ width: 1280, height: 1600 });
    await indx(request);
    await openApp(page);
    await page.getByRole('button', { name: 'Print four colours' }).click();
    const dialog = page.getByRole('dialog');
    // By the filament's name, not its Assign slot button.
    await dialog
      .locator('[data-filament="2"]')
      .dragTo(dialog.locator('[data-slot="8"]'), {
        sourcePosition: { x: 40, y: 15 },
      });
    await dialog
      .locator('[data-slot="1"]')
      .dragTo(dialog.locator('[data-filament="4"]'));
    await expect(dialog.locator('[data-filament="1"]')).toContainText(
      'Unmapped',
    );
    await dialog
      .locator('[data-filament="1"]')
      .getByRole('button', { name: 'Assign slot' })
      .click();
    await dialog
      .locator('[data-slot="5"]')
      .getByRole('button', { name: 'Assign slot' })
      .click();
    await dialog.getByRole('button', { name: 'Print now' }).click();
    await expect
      .poll(() => startedWith(request))
      .toEqual({ '1': [5], '2': [8], '3': [7], '4': [1] });
  });

  test('an MMU3 maps to its slots; a slot changes to the file’s filament', async ({
    page,
    request,
  }) => {
    await printer(request, { model: 'MK4S', reset: true, mmu: true });
    await openApp(page);
    await page.getByRole('button', { name: 'Print four colours' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByTestId('mapping-slot')).toHaveCount(5);
    await expect(dialog.locator('[data-slot="5"]')).toContainText(
      'No filament loaded',
    );
    await dialog
      .locator('[data-slot="3"]')
      .getByRole('button', { name: 'Change filament' })
      .click();
    await expect(dialog).toContainText('The printer is changing the filaments');
    await expect
      .poll(
        async () =>
          (
            (await (await request.get('/__mock/state')).json()) as {
              state: string;
            }
          ).state,
        { timeout: 15_000 },
      )
      .toBe('IDLE');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Print four colours' }).click();
    await expect(
      page
        .getByRole('dialog')
        .locator('[data-slot="3"]')
        .getByTestId('mapping-fit'),
    ).toHaveText('Exact match');
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Print now' })
      .click();
    await expect
      .poll(() => startedWith(request))
      .toEqual({ '1': [1], '2': [2], '3': [3], '4': [4] });
  });

  test('change all to match loads what the mapping needs', async ({
    page,
    request,
  }) => {
    await printer(request, { model: 'XL', reset: true });
    await printer(request, { tool: { index: 1, material: 'PLA' } });
    await openApp(page);
    await page.getByRole('button', { name: 'Print four colours' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByTestId('mapping-row')).toHaveCount(4);
    await dialog.getByRole('button', { name: 'Change all to match' }).click();
    await expect(dialog).toContainText('The printer is changing the filaments');
    await expect
      .poll(async () => (await mock(request)).tools[1]?.material, {
        timeout: 15_000,
      })
      .toBe('PETG');
  });

  test('a single-tool printer offers to change the filament before printing', async ({
    page,
  }) => {
    await openApp(page);
    await page
      .getByRole('button', { name: 'Print calibration cube' })
      .first()
      .click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Change filament' })
      .click();
    await expect(page.getByRole('dialog', { name: 'Filament' })).toBeVisible();
  });

  test('a single-tool printer set to abort on another nozzle refuses the print', async ({
    page,
    request,
  }) => {
    await printer(request, { nozzleCheck: 'abort' });
    await openApp(page);
    await page
      .getByTestId('file-input')
      .first()
      .setInputFiles({
        name: 'bracket_0.6n_0.3mm_PLA_MK4S_20m.gcode',
        mimeType: 'text/plain',
        buffer: Buffer.from('; bracket\nG28\n'),
      });
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('its nozzle check refuses the print');
    await expect(
      dialog.getByRole('button', { name: 'Print now' }),
    ).toBeDisabled();
    await printer(request, { nozzleCheck: 'warning' });
    await page.reload();
    await page.getByRole('button', { name: 'Print bracket' }).click();
    await expect(page.getByRole('dialog')).toContainText(
      'It will ask before printing',
    );
  });
});

test('the print dialog says how much filament a file takes', async ({
  page,
  request,
}) => {
  await printer(request, { model: 'XL', reset: true });
  await openApp(page);
  await page.getByRole('button', { name: 'Print four colours' }).click();
  await expect(page.getByRole('dialog').getByTestId('file-grams')).toHaveText(
    '15.6 g',
  );
});
