import { readFileSync } from 'node:fs';

import {
  expect,
  test,
  type APIRequestContext,
  type Locator,
} from '@playwright/test';

import {
  freshPrinter,
  mockKey,
  openApp,
  printer,
  swapAtPrinter,
} from './support';

// The printer's firmware has the PrusaLink 2 API (doc/prusalink-api-v2.md in
// Buddy): every tool, dialogs, cancel object, preheat, babysteps, filament
// and firmware commands.

test.beforeEach(async ({ page, request }) => {
  await freshPrinter(page, request);
});

interface Snapshot {
  state: string;
  crashDump?: { exported: boolean };
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
    // Temperatures are on the picture, not the cards.
    await expect(rows.nth(1)).not.toContainText('215');
  });

  test('an XL with an empty dock keeps its tools’ numbers', async ({
    page,
    request,
  }) => {
    await printer(request, { model: 'XL_GAP', reset: true });
    await openApp(page);
    const cards = page.getByTestId('tool-row');
    await expect(cards).toHaveCount(4);
    await expect(cards.nth(2)).toContainText('Tool 4');
    await page.getByRole('button', { name: 'Print four colours' }).click();
    const dialog = page.getByRole('dialog');
    const row = dialog.locator('[data-filament="1"]');
    await row.getByTestId('slot-picker').first().click();
    const options = row.getByRole('listbox').getByRole('option');
    // Docks 1, 2, 4, 5 and the empty choice; no dock 3.
    await expect(options).toHaveCount(5);
    await expect(row.locator('[data-slot="3"]')).toHaveCount(0);
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
});

test.describe('cancel object', () => {
  test('the plate on the bed; an outline cancels its object once the printer confirms', async ({
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
    const card = page.getByTestId('objects');
    // One row until opened: the object being printed, and its place.
    await expect(card.getByTestId('current-object')).toContainText('of 3');
    await expect(card.getByTestId('bed-view')).toHaveCount(0);
    await card.getByRole('button', { name: 'Cancel objects' }).click();
    const bed = card.getByTestId('bed-view');
    await expect(bed.locator('polygon')).toHaveCount(3);
    await expect(card.getByTestId('nozzle')).toBeVisible();
    // Closing the dialog leaves no outline looking picked.
    await bed.getByRole('button', { name: 'Shape-Box' }).click();
    const dialog = page.getByRole('dialog', { name: 'Cancel Shape-Box?' });
    await expect(dialog.locator('polygon[data-highlight="true"]')).toHaveCount(
      1,
    );
    // Only that one: not the object being printed too.
    await expect(dialog.locator('polygon[data-state="current"]')).toHaveCount(
      0,
    );
    await page.keyboard.press('Escape');
    await expect(
      bed.getByRole('button', { name: 'Shape-Box' }),
    ).not.toBeFocused();
    await bed.getByRole('button', { name: 'Shape-Box' }).click();
    await dialog.getByRole('button', { name: 'Cancel object' }).click();
    await expect(dialog).toHaveCount(0, { timeout: 10_000 });
    await expect(
      bed.getByRole('button', { name: 'Shape-Box' }),
    ).toHaveAttribute('data-state', 'canceled');
    expect((await mock(request)).objects?.[2]?.canceled).toBe(true);
    // And back.
    await card
      .getByTestId('object')
      .filter({ hasText: 'Shape-Box' })
      .getByRole('button', { name: 'Undo' })
      .click();
    await expect
      .poll(async () => (await mock(request)).objects?.[2]?.canceled)
      .toBe(false);
    // The card stays open on the next visit.
    await page.reload();
    await expect(page.getByTestId('bed-view')).toBeVisible();
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
    await page.getByRole('button', { name: 'Cancel objects' }).click();
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
    await page.getByRole('button', { name: 'Cancel objects' }).click();
    await expect(page.getByTestId('bed-view').locator('polygon')).toHaveCount(
      3,
    );
    expect(downloads).toEqual([]);
  });
});

test.describe('controls', () => {
  test('preheat heats for the loaded filament; with none, for the one picked', async ({
    page,
    request,
  }) => {
    await openApp(page);
    const preheat = page.getByTestId('preheat');
    await expect(preheat.getByRole('combobox')).toHaveCount(0);
    await preheat.getByRole('button', { name: 'Preheat for PLA' }).click();
    await expect.poll(async () => (await mock(request)).bed.target).toBe(60);
    await preheat.getByRole('button', { name: 'Cool down' }).click();
    await expect.poll(async () => (await mock(request)).bed.target).toBe(0);
    await printer(request, { tool: { index: 0, material: '---' } });
    await page.reload();
    await preheat.getByRole('combobox').selectOption('PETG');
    await preheat.getByRole('button', { name: 'Preheat' }).click();
    await expect.poll(async () => (await mock(request)).bed.target).toBe(85);
  });

  test('an INDX preheats the picked tool only', async ({ page, request }) => {
    await printer(request, { model: 'COREONE_INDX', reset: true });
    await printer(request, { pick: 2 });
    await openApp(page);
    await page
      .getByTestId('preheat')
      .getByRole('button', { name: 'Preheat' })
      .click();
    const dialog = page.getByRole('dialog', { name: 'Preheat' });
    await expect(dialog.getByRole('checkbox')).toHaveCount(1);
    await dialog.getByRole('button', { name: 'Preheat' }).click();
    await expect
      .poll(async () => (await mock(request)).tools[2]?.target)
      .toBeGreaterThan(0);
    expect((await mock(request)).tools[0]?.target).toBe(0);
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
    await page.getByRole('button', { name: 'Edit Tool 3' }).click();
    await page.getByRole('menuitem', { name: 'Change filament' }).click();
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

test.describe('print dialog', () => {
  async function indx(request: APIRequestContext) {
    await printer(request, { model: 'COREONE_INDX', reset: true });
    await printer(request, {
      tool: { index: 1, material: 'PETG', color: '#1F77B4' },
    });
    await printer(request, {
      tool: { index: 3, material: 'ASA', color: '#D62728' },
    });
  }
  const started = async (request: APIRequestContext) => {
    const m = (await (await request.get('/__mock/state')).json()) as {
      mapping?: unknown;
      state: string;
    };
    return m.state === 'PRINTING' ? m.mapping : undefined;
  };
  const row = (dialog: Locator, n: number) =>
    dialog.locator(`[data-filament="${String(n)}"]`);
  const slotOf = (dialog: Locator, n: number) =>
    row(dialog, n).getByTestId('slot-picker').first();
  async function choose(dialog: Locator, n: number, slot?: number) {
    await slotOf(dialog, n).click();
    const list = row(dialog, n).getByRole('listbox');
    await (
      slot === undefined
        ? list.getByRole('option').first()
        : list.locator(`[data-slot="${String(slot)}"]`)
    ).click();
  }
  const accept = (dialog: Locator) =>
    dialog.getByText('I know; print anyway').click();

  test('suggests by material and colour; an override is what the print gets', async ({
    page,
    request,
  }) => {
    await indx(request);
    await openApp(page);
    await page.getByRole('button', { name: 'Print four colours' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByTestId('mapping-row')).toHaveCount(4);
    await expect(slotOf(dialog, 1)).toHaveAttribute('data-value', '1');
    await expect(slotOf(dialog, 2)).toHaveAttribute('data-value', '2');
    // The second green PLA is not loaded: the blue PLA in T7 comes nearest.
    await expect(slotOf(dialog, 3)).toHaveAttribute('data-value', '7');
    await expect(row(dialog, 3).getByTestId('row-status')).toHaveText(
      '~ Other colour',
    );
    await expect(row(dialog, 1).getByTestId('row-status')).toHaveText(
      '✓ Matches',
    );
    // Filament 1 takes T7: filament 3 gets T1 in exchange, and says so.
    await choose(dialog, 1, 7);
    await expect(slotOf(dialog, 3)).toHaveAttribute('data-value', '1');
    await expect(row(dialog, 3).getByTestId('row-moved')).toHaveText(
      'Swapped with filament 1',
    );
    // Unmapping one blocks the print.
    await choose(dialog, 4);
    await expect(dialog.getByTestId('print-issues')).toContainText(
      'Filament 4 has no slot',
    );
    await expect(
      dialog.getByRole('button', { name: 'Print now' }),
    ).toBeDisabled();
    await choose(dialog, 4, 4);
    await dialog.getByRole('button', { name: 'Print now' }).click();
    await expect
      .poll(() => started(request))
      .toEqual({ '1': [7], '2': [2], '3': [1], '4': [4] });
  });

  test('reset to suggestion and 1:1', async ({ page, request }) => {
    await indx(request);
    await openApp(page);
    await page.getByRole('button', { name: 'Print four colours' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: '1:1' }).click();
    await expect(slotOf(dialog, 3)).toHaveAttribute('data-value', '3');
    await dialog.getByRole('button', { name: 'Reset to suggestion' }).click();
    await expect(slotOf(dialog, 3)).toHaveAttribute('data-value', '7');
  });

  test('a backup spool goes with the mapping', async ({ page, request }) => {
    await printer(request, { model: 'XL', reset: true });
    await openApp(page);
    await page.getByRole('button', { name: 'Print four colours' }).click();
    const dialog = page.getByRole('dialog');
    const add = row(dialog, 1).getByRole('button', { name: '+ Backup spool' });
    await add.click();
    const option = row(dialog, 1)
      .getByRole('listbox')
      .locator('[role=option]:not([aria-disabled=true])')
      .first();
    const slot = Number(await option.getAttribute('data-slot'));
    await option.click();
    await expect(row(dialog, 1).getByTestId('mapping-backup')).toHaveCount(1);
    const anyway = dialog.getByText('I know; print anyway');
    if (await anyway.isVisible()) await anyway.click();
    await dialog.getByRole('button', { name: /^Print (now|anyway)$/ }).click();
    await expect
      .poll(
        async () =>
          ((await started(request)) as Record<string, number[]> | undefined)?.[
            '1'
          ],
      )
      .toEqual([1, slot]);
  });

  test('change filaments, then print: the printer changes, the person starts', async ({
    page,
    request,
  }) => {
    await printer(request, { model: 'XL', reset: true });
    await printer(request, { tool: { index: 1, material: 'PLA' } });
    await openApp(page);
    await page.getByRole('button', { name: 'Print four colours' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByTestId('print-changes')).toContainText(
      'T2 PLA → PETG',
    );
    await expect(dialog.getByTestId('print-issues')).toContainText(
      'Filament 2 → T2: PLA loaded, PETG needed',
    );
    // Print anyway waits for the tick.
    await expect(
      dialog.getByRole('button', { name: 'Print anyway' }),
    ).toBeDisabled();
    await dialog.getByRole('button', { name: 'Change filaments' }).click();
    await expect(dialog.getByTestId('change-done')).toBeVisible({
      timeout: 20_000,
    });
    expect((await mock(request)).tools[1]?.material).toBe('PETG');
    expect((await mock(request)).state).not.toBe('PRINTING');
    // Sliced for the INDX: the model warning stays.
    await accept(dialog);
    await dialog.getByRole('button', { name: 'Print anyway' }).click();
    await expect
      .poll(() => started(request))
      .toEqual({ '1': [1], '2': [2], '3': [3], '4': [4] });
  });

  test('a single-tool printer with a four-filament file: print anyway', async ({
    page,
    request,
  }) => {
    await printer(request, { model: 'MK4S', reset: true });
    await openApp(page);
    await page.getByRole('button', { name: 'Print four colours' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByTestId('print-issues')).toContainText(
      'The file uses 4 filaments; the printer has 1 tools',
    );
    await expect(dialog.getByTestId('mapping-row')).toHaveCount(0);
    await accept(dialog);
    await dialog.getByRole('button', { name: 'Print anyway' }).click();
    // The printer previews it with the same warnings, and the page answers.
    await expect.poll(async () => (await mock(request)).state).toBe('PRINTING');
  });

  test('a file for another printer: the printer’s model check decides', async ({
    page,
    request,
  }) => {
    await printer(request, { model: 'MK4S', reset: true, modelCheck: 'abort' });
    await openApp(page);
    await page
      .getByRole('button', { name: 'Print three shapes' })
      .first()
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByTestId('print-issues')).toContainText(
      'Incompatible printer model',
    );
    await expect(
      dialog.getByRole('button', { name: /Print/ }).last(),
    ).toBeDisabled();
    await page.keyboard.press('Escape');
    await printer(request, { modelCheck: 'warning' });
    await page.reload();
    await page
      .getByRole('button', { name: 'Print three shapes' })
      .first()
      .click();
    await accept(page.getByRole('dialog'));
    await expect(
      page.getByRole('dialog').getByRole('button', { name: 'Print anyway' }),
    ).toBeEnabled();
  });

  test('an MMU3 maps to its five slots, an empty one offered as a load', async ({
    page,
    request,
  }) => {
    await printer(request, { model: 'MK4S', reset: true, mmu: true });
    await openApp(page);
    await page.getByRole('button', { name: 'Print four colours' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByTestId('mapping-row')).toHaveCount(4);
    await slotOf(dialog, 1).click();
    const list = row(dialog, 1).getByRole('listbox');
    await expect(list.getByRole('option')).toHaveCount(6);
    await expect(list.locator('[data-slot="5"]')).toContainText('Load');
    await page.keyboard.press('Escape');
    await expect(list).toBeHidden();
    await expect(dialog).toBeVisible();
    // Sliced for the INDX's high-flow nozzles; the MK4S has a standard one.
    await expect(dialog.getByTestId('print-issues')).toContainText(
      'sliced for a high-flow nozzle',
    );
    await expect(dialog.getByTestId('print-issues')).toContainText(
      'Incompatible printer model',
    );
    await accept(dialog);
    await dialog.getByRole('button', { name: 'Print anyway' }).click();
    await expect
      .poll(() => started(request))
      .toEqual({ '1': [1], '2': [2], '3': [3], '4': [4] });
  });

  test('the printer’s own question in its preview is answered in the dialog', async ({
    page,
    request,
  }) => {
    await indx(request);
    await printer(request, {
      previewQuestion: true,
      extraCheck: {
        check: 'Dock position not calibrated',
        level: 'abort',
        tool: '0',
      },
    });
    await openApp(page);
    await page.getByRole('button', { name: 'Print four colours' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Print now' }).click();
    const question = dialog.getByTestId('printer-question');
    await expect(question).toContainText('Please complete Calibrations');
    await expect(dialog.getByTestId('printer-report')).toContainText(
      'Dock position not calibrated · T1',
    );
    await question.getByRole('button', { name: 'Ignore' }).click();
    await expect(question).toBeHidden();
    // The printer refuses: Print stays off; Close leaves its preview.
    await expect(
      dialog.getByRole('button', { name: /^Print/ }).last(),
    ).toBeDisabled();
    await dialog.getByRole('button', { name: 'Close' }).last().click();
    await expect.poll(async () => (await mock(request)).state).toBe('IDLE');
  });

  test('a warning only the printer knows is shown before it prints', async ({
    page,
    request,
  }) => {
    await indx(request);
    await openApp(page);
    await page.getByRole('button', { name: 'Print four colours' }).click();
    const dialog = page.getByRole('dialog');
    await printer(request, {
      extraCheck: { check: 'Dock position not calibrated', level: 'warning' },
    });
    await dialog.getByRole('button', { name: 'Print now' }).click();
    await expect(dialog.getByTestId('printer-report')).toContainText(
      'Dock position not calibrated',
    );
    expect((await mock(request)).state).toBe('ATTENTION');
    await expect(
      dialog.getByRole('button', { name: 'Print anyway' }),
    ).toBeDisabled();
    await accept(dialog);
    await dialog.getByRole('button', { name: 'Print anyway' }).click();
    // Printing: the dialog gives way to the printer's status.
    await expect(dialog).toBeHidden();
    expect((await mock(request)).state).not.toBe('IDLE');
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

test('a file uploaded here shows what it says about itself, also from the list', async ({
  page,
  request,
}) => {
  await printer(request, { model: 'COREONE_INDX', reset: true });
  await openApp(page);
  await page
    .getByTestId('file-input')
    .first()
    .setInputFiles({
      name: 'simple core one indx 3 shapes.bgcode',
      mimeType: 'application/octet-stream',
      buffer: readFileSync(
        new URL('../mock/fixtures/three-shapes.bgcode', import.meta.url),
      ),
    });
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Not now' })
    .click();
  const list = page.getByRole('list', { name: 'Files on the printer' });
  const row = list.getByRole('listitem').filter({ hasText: 'simple core one' });
  await expect(row).toContainText('PLA');
  await expect(row).toContainText('43m');
  await page
    .getByRole('button', { name: 'Print simple core one indx 3 shapes' })
    .click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('43m');
  await expect(dialog.getByTestId('file-grams')).toHaveText('18.6 g');
  await expect(dialog.locator('img').first()).toHaveAttribute('src', /^blob:/);
});

test.describe('diagnostics', () => {
  test('the red screen: what the printer says, the dump, a restart', async ({
    page,
    request,
  }) => {
    await printer(request, { model: 'MK4S', reset: true });
    await printer(request, {
      redScreen: {
        code: '12201',
        title: 'THERMAL RUNAWAY',
        text: 'Check the heater.',
      },
    });
    // Error mode: no /api/v1/info, so no printer name to wait for.
    await page.goto(`/#key=${await mockKey(page)}`);
    const red = page.getByTestId('red-screen');
    await expect(red).toContainText('THERMAL RUNAWAY');
    await expect(
      red.getByRole('link', { name: /Help · 12201/ }),
    ).toHaveAttribute('href', 'https://prusa.io/12201');
    // Nothing else of the page: the printer answers nothing else.
    await expect(page.getByRole('heading', { name: 'Storage' })).toHaveCount(0);
    const download = page.waitForEvent('download');
    await red.getByRole('button', { name: 'Download crash dump' }).click();
    expect((await download).suggestedFilename()).toMatch(/^dump_MOCK_.*\.bin$/);
    await red.getByRole('button', { name: 'Restart printer' }).click();
    await expect(red).toContainText('The printer is restarting');
    await expect(red).toBeHidden({ timeout: 15_000 });
  });

  test('a crash dump from earlier: download, then hide', async ({
    page,
    request,
  }) => {
    await printer(request, { model: 'MK4S', reset: true, crashDump: true });
    await openApp(page);
    const notice = page.getByTestId('dump-notice');
    await expect(notice).toContainText('The printer crashed earlier');
    await notice.getByRole('button', { name: 'Sent, hide' }).click();
    await expect(notice).toBeHidden();
    expect((await mock(request)).crashDump).toMatchObject({ exported: true });
  });
});
