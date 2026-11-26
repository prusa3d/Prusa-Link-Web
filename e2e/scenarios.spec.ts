import { expect, test, type Page } from '@playwright/test';

import {
  atPrinter,
  freshPrinter,
  mockKey,
  openApp,
  printer,
  swapAtPrinter,
} from './support';

// User scenarios: what the printer is doing, what the person wants, and what
// the printer then does, including when it does not do what was asked.

test.beforeEach(async ({ page, request }) => {
  await freshPrinter(page, request);
});

const state = (page: Page) => page.getByTestId('printer-state');

test.describe('filament before a print', () => {
  test('a one-tool XL looks the same to the page, so it too leaves the filament to the printer', async ({
    page,
    request,
  }) => {
    await printer(request, { model: 'XL_SINGLE', reset: true });
    await openApp(page);
    await expect(page.getByText('Per tool, on the printer')).toBeVisible();
  });

  test('an XL with no tool picked reports no filament; the page leaves the tools to the printer', async ({
    page,
    request,
  }) => {
    await printer(request, { model: 'XL', reset: true });
    await openApp(page);
    await expect(page.getByText('Per tool, on the printer')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /^(Load|Change)$/ }),
    ).toHaveCount(0);
    await page
      .getByRole('button', { name: /^Print / })
      .first()
      .click();
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('button', { name: 'Print now' }),
    ).toBeEnabled();
    await expect(
      dialog.getByRole('button', { name: /Change filament|Load/ }),
    ).toHaveCount(0);
  });

  test('PLA loaded, a PETG file chosen; the printer swaps it, and printing unlocks', async ({
    page,
    request,
  }) => {
    await openApp(page);
    await page.getByRole('button', { name: 'Print cable clip x6' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: /^Print/ })).toHaveCount(0);
    await dialog
      .getByRole('button', { name: 'Change filament to PETG' })
      .click();
    await expect(dialog.getByTestId('filament-progress')).toBeVisible();
    await expect(dialog.getByTestId('heater-reading')).toBeVisible();
    // The printer's question shows in the dialog in front, not behind it.
    await expect(dialog.getByTestId('filament-question')).toContainText(
      'Remove the filament',
      { timeout: 15_000 },
    );
    await swapAtPrinter(request);
    await expect(dialog.getByTestId('filament-outcome')).toContainText(
      'PETG is loaded',
      { timeout: 20_000 },
    );
    await dialog.getByRole('button', { name: 'Print now' }).click();
    await expect(state(page)).toHaveAttribute('data-state', 'PRINTING');
  });

  test('PLA loaded, a PETG file chosen; the swap is cancelled on the printer, so it still will not print', async ({
    page,
    request,
  }) => {
    await openApp(page);
    await page.getByRole('button', { name: 'Print cable clip x6' }).click();
    const dialog = page.getByRole('dialog');
    await dialog
      .getByRole('button', { name: 'Change filament to PETG' })
      .click();
    await atPrinter(request, 'remove', 'cancel');
    await expect(dialog.getByTestId('filament-outcome')).toContainText(
      'did not finish',
      { timeout: 15_000 },
    );
    await expect(dialog.getByTestId('filament-outcome')).toContainText(
      'Loaded now: PLA',
    );
    await expect(
      dialog.getByRole('button', { name: 'Change filament to PETG' }),
    ).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: /Print now|Print anyway/ }),
    ).toHaveCount(0);
  });

  test('PLA loaded, a PETG file chosen; the printer ends up with ASA, so it still will not print', async ({
    page,
    request,
  }) => {
    await openApp(page);
    await page.getByRole('button', { name: 'Print cable clip x6' }).click();
    const dialog = page.getByRole('dialog');
    await dialog
      .getByRole('button', { name: 'Change filament to PETG' })
      .click();
    await expect(state(page)).toHaveAttribute('data-state', 'BUSY');
    await printer(request, {
      tool: { index: 0, material: 'ASA' },
      state: 'FINISHED',
    });
    await expect(dialog.getByTestId('filament-outcome')).toContainText(
      'Loaded now: ASA',
      { timeout: 15_000 },
    );
    await expect(
      dialog.getByRole('button', { name: 'Change filament to PETG' }),
    ).toBeVisible();
  });

  test('PLA loaded, a PETG file chosen; the old filament comes out, then the change is cancelled, so nothing is loaded and it will not print', async ({
    page,
    request,
  }) => {
    await openApp(page);
    await page.getByRole('button', { name: 'Print cable clip x6' }).click();
    const dialog = page.getByRole('dialog');
    await dialog
      .getByRole('button', { name: 'Change filament to PETG' })
      .click();
    await atPrinter(request, 'remove', 'removed');
    await expect(dialog.getByTestId('filament-question')).toContainText(
      'Insert PETG',
    );
    await expect(page.getByTestId('printer-alert')).toHaveCount(0);
    await atPrinter(request, 'insert', 'cancel');
    await expect(dialog.getByTestId('filament-outcome')).toContainText(
      'Loaded now: none',
      { timeout: 15_000 },
    );
    await expect(
      dialog.getByRole('button', { name: /Print now|Print anyway/ }),
    ).toHaveCount(0);
  });

  test('nothing loaded, a PETG file chosen; it asks to load PETG first', async ({
    page,
    request,
  }) => {
    await printer(request, { tool: { index: 0, material: '---' } });
    await openApp(page);
    await page.getByRole('button', { name: 'Print cable clip x6' }).click();
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByText('Sliced for PETG, no filament is loaded'),
    ).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: 'Change filament to PETG' }),
    ).toBeVisible();
    await expect(dialog.getByRole('button', { name: /^Print/ })).toHaveCount(0);
  });
});

test.describe('while printing', () => {
  test('a print is running; another file cannot start and filament cannot change', async ({
    page,
    request,
  }) => {
    await openApp(page);
    await printer(request, { startPrint: (await files(page))[0] });
    await expect(state(page)).toHaveAttribute('data-state', 'PRINTING');
    const first = page.getByRole('button', { name: /^Print / }).first();
    await expect(first).toBeDisabled();
    await expect(first).toHaveText('Already printing');
    await expect(page.getByRole('button', { name: 'Change' })).toHaveCount(0);
  });

  test('the printer stops to ask something; a big box shows its words until answered', async ({
    page,
    request,
  }) => {
    await openApp(page);
    await printer(request, {
      state: 'ATTENTION',
      question: 'Is the filament color correct?',
    });
    const box = page.getByTestId('printer-alert');
    await expect(box).toContainText('The printer needs attention');
    await expect(box).toContainText('Is the filament color correct?');
    await printer(request, { state: 'PRINTING', question: null });
    await expect(box).toHaveCount(0);
  });

  test('the printer fails; the box says it is an error', async ({
    page,
    request,
  }) => {
    await openApp(page);
    await printer(request, { state: 'ERROR' });
    await expect(page.getByTestId('printer-alert')).toContainText(
      'Printer error',
    );
  });

  test('the person changes their mind about pausing; it keeps printing', async ({
    page,
    request,
  }) => {
    await openApp(page);
    await printer(request, { startPrint: (await files(page))[0] });
    await page.getByRole('button', { name: 'Pause' }).click();
    await page
      .getByRole('dialog', { name: 'Pause this print?' })
      .getByRole('button', { name: 'Keep printing' })
      .click();
    await expect(state(page)).toHaveAttribute('data-state', 'PRINTING');
  });

  test('the printer takes its time to pause and stop; the buttons wait for it', async ({
    page,
    request,
  }) => {
    await openApp(page);
    await printer(request, {
      startPrint: (await files(page))[0],
      transitionSeconds: 4,
    });
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Pause this print?' })
      .getByRole('button', { name: 'Pause print' })
      .click();
    // Answered at once, but still printing while it parks.
    await expect(page.getByTestId('control-pending')).toContainText('Pausing');
    await expect(page.getByTestId('job-badge')).toHaveText('Pausing…');
    await expect(state(page)).toHaveAttribute('data-state', 'PRINTING');
    await expect(
      page.getByRole('button', { name: 'Pause', exact: true }),
    ).toHaveAttribute('aria-busy', 'true');
    await expect(
      page.getByRole('button', { name: 'Stop', exact: true }),
    ).toBeDisabled();
    await expect(state(page)).toHaveAttribute('data-state', 'PAUSED', {
      timeout: 10_000,
    });
    await expect(page.getByTestId('control-pending')).toHaveCount(0);
    await expect(page.getByTestId('job-badge')).toHaveText('Paused');
    await page.getByRole('button', { name: 'Stop', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Stop this print?' })
      .getByRole('button', { name: 'Stop print' })
      .click();
    await expect(page.getByTestId('control-pending')).toContainText('Stopping');
    await expect(state(page)).toHaveAttribute('data-state', 'STOPPED', {
      timeout: 10_000,
    });
  });

  test('a warning on the printer blocks resume; the page says what was refused and why, closably', async ({
    page,
    request,
  }) => {
    await openApp(page);
    await printer(request, { startPrint: (await files(page))[0] });
    await printer(request, {
      state: 'PAUSED',
      question: 'Hotend fan not spinning.',
    });
    await page.getByRole('button', { name: 'Resume' }).click();
    const notice = page.getByTestId('notice');
    await expect(notice).toContainText('The printer did not resume the print.');
    await expect(notice).toContainText('a question or a warning on its screen');
    await notice.getByRole('button', { name: 'Close' }).click();
    await expect(notice).toHaveCount(0);
  });

  test('the printer drops off the network mid-print, then comes back', async ({
    page,
    request,
  }) => {
    await openApp(page);
    await printer(request, { startPrint: (await files(page))[0] });
    await expect(page.getByTestId('job-percent')).toBeVisible();
    await printer(request, { offline: true });
    await expect(state(page)).toHaveAttribute('data-state', 'OFFLINE');
    await printer(request, { offline: false });
    await expect(state(page)).toHaveAttribute('data-state', 'PRINTING');
    await expect(page.getByTestId('job-percent')).toBeVisible();
  });
});

test.describe('after a print', () => {
  test('the print finishes; full bar first, then ready, with the last print to repeat', async ({
    page,
    request,
  }) => {
    test.setTimeout(60_000);
    await openApp(page);
    await printer(request, { timeScale: 400 });
    await page
      .getByRole('button', { name: 'Print calibration cube' })
      .first()
      .click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Print now' })
      .click();
    await expect(state(page)).toHaveAttribute('data-state', 'FINISHED', {
      timeout: 20_000,
    });
    await expect(page.getByTestId('job-percent')).toHaveText('100 %');
    await expect(page.getByTestId('job-percent')).toHaveCount(0, {
      timeout: 10_000,
    });
    const last = page.getByTestId('last-print');
    await expect(last).toContainText('Finished');
    await last.getByRole('button', { name: 'Print again' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Print calibration cube?' }),
    ).toBeVisible();
  });

  test('the person stops the print; no progress is left, the last print says stopped', async ({
    page,
    request,
  }) => {
    await openApp(page);
    await printer(request, { startPrint: (await files(page))[0] });
    await page.getByRole('button', { name: 'Stop', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Stop this print?' })
      .getByRole('button', { name: 'Stop print' })
      .click();
    await expect(state(page)).toHaveAttribute('data-state', 'STOPPED');
    await expect(page.getByTestId('job-percent')).toHaveCount(0);
    await expect(page.getByTestId('last-print')).toContainText('Stopped');
  });
});

test.describe('files', () => {
  test('the file is deleted on the printer after the dialog opened; the printer refuses and the dialog says so', async ({
    page,
  }) => {
    await openApp(page);
    await page.getByRole('button', { name: 'Print 3DBenchy' }).click();
    const name = (await files(page))[0] ?? '';
    await page.request.delete(`/api/v1/files/usb/${name}`, {
      headers: { 'X-Api-Key': await mockKey(page) },
    });
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Print now' })
      .click();
    await expect(
      page
        .getByRole('dialog')
        .getByText('The printer did not start the print.'),
    ).toBeVisible();
    await expect(state(page)).toHaveAttribute('data-state', 'IDLE');
  });

  test('a folder of 300 files: 25 at a time, small thumbnails only for what is on screen, and search', async ({
    page,
  }) => {
    const thumbs: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/thumb/')) thumbs.push(r.url());
    });
    await openApp(page);
    await page.getByRole('button', { name: 'archive', exact: true }).click();
    const list = page.getByRole('list', { name: 'Files on the printer' });
    await expect(list.getByRole('button', { name: /^Print / })).toHaveCount(25);
    await page.waitForTimeout(800);
    expect(thumbs.length).toBeGreaterThan(0);
    expect(thumbs.length).toBeLessThan(20);
    expect(thumbs.every((u) => u.includes('/thumb/s/'))).toBe(true);
    await list.getByRole('button', { name: 'Show 25 more (275 left)' }).click();
    await expect(list.getByRole('button', { name: /^Print / })).toHaveCount(50);
    await page.getByTestId('file-search').fill('part 123');
    await expect(list.getByRole('button', { name: /^Print / })).toHaveCount(1);
    await page.getByTestId('file-search').fill('nothing like this');
    await expect(list.getByText('Nothing here matches')).toBeVisible();
  });

  test('a search from the top finds a file deep in a folder, shows where it is, and prints it', async ({
    page,
  }) => {
    const listed: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/api/v1/files/usb')) listed.push(r.url());
    });
    await openApp(page);
    await page.getByTestId('file-search').fill('dragon');
    const below = page.getByTestId('search-below');
    await expect(below).toContainText('In subfolders: 1 found');
    const list = page.getByRole('list', { name: 'Files on the printer' });
    await expect(list.getByText('toys / dragons')).toBeVisible();
    // One listing per folder, and none again for a second search.
    const once = listed.length;
    await page.getByTestId('file-search').fill('drago');
    await expect(below).toContainText('In subfolders: 1 found');
    expect(listed.length).toBe(once);
    await list
      .getByRole('button', { name: 'Print articulated dragon' })
      .click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Print now' })
      .click();
    await expect(state(page)).toHaveAttribute('data-state', 'PRINTING');
  });

  test('the page never asks the printer two things at once', async ({
    page,
  }) => {
    let inFlight = 0;
    let most = 0;
    const printerCall = (url: string) =>
      /^\/(?:api|thumb)\//.test(new URL(url).pathname);
    page.on('request', (r) => {
      if (!printerCall(r.url())) return;
      inFlight += 1;
      most = Math.max(most, inFlight);
    });
    const done = (url: string) => {
      if (printerCall(url)) inFlight -= 1;
    };
    page.on('requestfinished', (r) => {
      done(r.url());
    });
    page.on('requestfailed', (r) => {
      done(r.url());
    });
    await openApp(page);
    await page.getByRole('button', { name: 'archive', exact: true }).click();
    await page.mouse.wheel(0, 3000);
    await page.waitForTimeout(3000);
    expect(most).toBe(1);
  });

  test('a file is deleted after a yes; the one being printed cannot be, but shows its details', async ({
    page,
    request,
  }) => {
    await openApp(page);
    const list = page.getByRole('list', { name: 'Files on the printer' });
    await list.getByRole('button', { name: 'Delete phone stand' }).click();
    const dialog = page.getByRole('dialog', { name: 'Delete phone stand?' });
    await dialog.getByRole('button', { name: 'Delete' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(list.getByText('phone stand')).toHaveCount(0);

    await printer(request, { startPrint: (await files(page))[0] });
    await expect(state(page)).toHaveAttribute('data-state', 'PRINTING');
    // The file being printed cannot be deleted; its details still open.
    await expect(
      list.getByRole('button', { name: 'Delete 3DBenchy' }),
    ).toBeDisabled();
    await list.getByRole('button', { name: '3DBenchy', exact: true }).click();
    const details = page.getByRole('dialog', { name: 'Print 3DBenchy?' });
    await expect(details.getByTestId('file-details')).toContainText('0.2mm');
    await expect(details.getByTestId('file-details')).toContainText('0.4 mm');
    await expect(
      details.getByRole('button', { name: /Print now|Change filament/ }),
    ).toBeDisabled();
  });

  test('the USB drive is pulled while browsing, then put back', async ({
    page,
    request,
  }) => {
    await openApp(page);
    await printer(request, { usb: false });
    await page.reload();
    await expect(page.getByText('No USB drive in the printer')).toBeVisible();
    await printer(request, { usb: true });
    const retry = page.getByRole('button', { name: 'Try again' });
    await retry.click();
    // It shows it is trying, even when the answer comes at once.
    await expect(retry).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByText('3DBenchy')).toBeVisible();
  });
});

/// The mock's files in the USB root, newest first, by their 8.3 names.
async function files(page: Page) {
  const res = await page.request.get('/__mock/state');
  const { files: all } = (await res.json()) as {
    files: { name: string; dir: string; display_name: string }[];
  };
  return all
    .filter((f) => !f.dir && !f.display_name.startsWith('.'))
    .map((f) => f.name);
}
