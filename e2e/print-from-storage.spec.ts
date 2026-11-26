import { expect, test, type Page } from '@playwright/test';

import { swapAtPrinter } from './support';

async function mockKey(page: Page) {
  const res = await page.request.get('/__mock/state');
  return ((await res.json()) as { apiKey: string }).apiKey;
}

async function signIn(page: Page, password: string) {
  await page.goto('/');
  await page.getByLabel('PrusaLink password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test.beforeEach(async ({ page, request }) => {
  await request.patch('/__mock/state', {
    data: {
      model: 'MK4S',
      reset: true,
      firmware: '8.0.1',
      transitionSeconds: 1,
    },
  });
  // The firmware release check asks GitHub; tests answer for it.
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
});

test('a wrong password is refused without a browser dialog', async ({
  page,
}) => {
  page.on('dialog', () => {
    throw new Error('the browser showed a dialog');
  });
  await signIn(page, 'wrong');
  await expect(page.getByRole('alert')).toHaveText('Wrong password.');
});

test('the QR code address signs in', async ({ page }) => {
  await page.goto(`/#key=${await mockKey(page)}`);
  await expect(page.getByTestId('printer-state')).toHaveAttribute(
    'data-state',
    'IDLE',
  );
  expect(new URL(page.url()).hash).toBe('');
});

test('starting a file from USB shows the print in progress', async ({
  page,
}) => {
  await signIn(page, await mockKey(page));
  await expect(page.getByTestId('printer-state')).toHaveAttribute(
    'data-state',
    'IDLE',
  );
  await page.getByRole('button', { name: 'Print' }).first().click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Print now' })
    .click();
  await expect(page.getByTestId('printer-state')).toHaveAttribute(
    'data-state',
    'PRINTING',
  );
  await expect(page.getByLabel('Print progress')).toBeVisible();
});

test('folders open, hidden entries stay hidden', async ({ page }) => {
  await page.goto(`/#key=${await mockKey(page)}`);
  const list = page.getByRole('list', { name: 'Files on the printer' });
  await expect(list.getByText('toys')).toBeVisible();
  await expect(list.getByText('.Trashes')).toHaveCount(0);
  await expect(list.getByText(/^\._/)).toHaveCount(0);
  await list.getByRole('button', { name: 'toys' }).click();
  await list.getByRole('button', { name: 'dragons' }).click();
  await expect(page.getByTestId('files-path')).toHaveText(
    /USB\s*\/\s*toys\s*\/\s*dragons$/,
  );
  await expect(list.getByText('articulated dragon')).toBeVisible();
});

test('uploads G-code, skips everything else', async ({ page }) => {
  await page.goto(`/#key=${await mockKey(page)}`);
  await page.getByTestId('file-input').setInputFiles([
    {
      name: 'lid.gcode',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from('G28'),
    },
    { name: 'photo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('x') },
    { name: '._lid.gcode', mimeType: '', buffer: Buffer.from('x') },
  ]);
  await expect(
    page.getByText('Skipped 2 files: hidden or not G-code.'),
  ).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Print lid?' })).toBeVisible();
});

test('several files: each has its own progress, the list stays a while after', async ({
  page,
}) => {
  await page.goto(`/#key=${await mockKey(page)}`);
  const names = ['a-part.gcode', 'b-part.gcode', 'c-part.gcode'];
  await page.getByTestId('file-input').setInputFiles(
    names.map((name) => ({
      name,
      mimeType: 'application/octet-stream',
      buffer: Buffer.from('G28\n'.repeat(20_000)),
    })),
  );
  const items = page.getByTestId('upload-items').getByRole('listitem');
  await expect(items).toHaveCount(3);
  await expect(page.getByTestId('upload-progress')).toHaveText(
    'Upload finished',
    { timeout: 20_000 },
  );
  for (const [i, name] of names.entries()) {
    await expect(items.nth(i)).toContainText(name);
    await expect(items.nth(i)).toHaveAttribute('data-state', 'done');
  }
  // Still listed after the batch; another drop is possible meanwhile.
  await page.waitForTimeout(2000);
  await expect(items).toHaveCount(3);
  await expect(page.getByTestId('file-input')).toBeAttached();
  await page
    .getByTestId('upload-panel')
    .getByRole('button', { name: 'Close' })
    .click();
  await expect(page.getByTestId('upload-panel')).toHaveCount(0);
});

test('the tab shows the print: progress in the title, a dot on the icon', async ({
  page,
  request,
}) => {
  // Slow enough that the print is still running while the icon is checked.
  await request.patch('/__mock/state', { data: { timeScale: 1 } });
  await page.goto(`/#key=${await mockKey(page)}`);
  await expect(page).toHaveTitle(
    'prusa-mk4s · Original Prusa MK4S · PrusaLink',
  );
  await page.getByRole('button', { name: 'Print' }).first().click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Print now' })
    .click();
  await expect(page).toHaveTitle(/^\d+ % · prusa-mk4s$/);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    'href',
    /^data:image\/png/,
    { timeout: 15_000 },
  );
});

test('pausing and stopping a print, both ask first', async ({ page }) => {
  await page.goto(`/#key=${await mockKey(page)}`);
  await page.getByRole('button', { name: 'Print' }).first().click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Print now' })
    .click();
  const state = page.getByTestId('printer-state');
  await expect(state).toHaveAttribute('data-state', 'PRINTING');
  await page.getByRole('button', { name: 'Pause' }).click();
  await page
    .getByRole('dialog', { name: 'Pause this print?' })
    .getByRole('button', { name: 'Pause print' })
    .click();
  await expect(state).toHaveAttribute('data-state', 'PAUSED', {
    timeout: 10_000,
  });
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Stop print' })
    .click();
  await expect(state).toHaveAttribute('data-state', 'STOPPED', {
    timeout: 10_000,
  });
  await expect(page.getByTestId('job-percent')).toHaveCount(0);
  await expect(page.getByLabel('Print progress')).toHaveCount(0);
  const last = page.getByTestId('last-print');
  await expect(last).toContainText('Stopped');
  await last.getByRole('button', { name: 'Print again' }).click();
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Print now' }),
  ).toBeVisible();
});

test('filament: its own row, and no change while printing', async ({
  page,
  request,
}) => {
  await page.goto(`/#key=${await mockKey(page)}`);
  await expect(page.getByRole('button', { name: 'Change' })).toBeVisible();
  await request.patch('/__mock/state', { data: { state: 'PRINTING' } });
  await expect(page.getByRole('button', { name: 'Change' })).toHaveCount(0);
});

test('a finished print settles to ready and offers printing again', async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);
  await page.goto(`/#key=${await mockKey(page)}`);
  await request.patch('/__mock/state', { data: { timeScale: 400 } });
  await page
    .getByRole('button', { name: 'Print calibration cube' })
    .first()
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Print now' })
    .click();
  await expect(page.getByTestId('printer-state')).toHaveAttribute(
    'data-state',
    'FINISHED',
    { timeout: 20_000 },
  );
  await expect(page.getByTestId('job-percent')).toHaveText('100 %');
  await expect(page.getByTestId('last-print')).toContainText('Finished');
  await expect(page.getByTestId('job-percent')).toHaveCount(0, {
    timeout: 20_000,
  });
  await expect(page.getByRole('heading', { name: 'Printer' })).toBeVisible();
});

test('temperatures follow the region, switch and stay switched', async ({
  page,
}) => {
  await page.goto(`/#key=${await mockKey(page)}`);
  const reading = page.getByTestId('heater-reading').first();
  // Playwright's browser says en-US: Fahrenheit until switched.
  await expect(reading).toHaveText(/°F/);
  await page.getByRole('button', { name: /^Temperature in °F/ }).click();
  await expect(reading).toHaveText(/°C/);
  await page.reload();
  await expect(reading).toHaveText(/°C/);
});

test('print buttons are off while the printer is busy', async ({
  page,
  request,
}) => {
  await page.goto(`/#key=${await mockKey(page)}`);
  await request.patch('/__mock/state', { data: { state: 'BUSY' } });
  const first = page.getByRole('button', { name: /^Print / }).first();
  await expect(first).toBeDisabled();
  await expect(first).toHaveText('Busy');
  await request.patch('/__mock/state', { data: { state: 'PRINTING' } });
  await expect(first).toHaveText('Already printing');
});

test('offers the newer firmware beside the files', async ({ page }) => {
  await page.goto(`/#key=${await mockKey(page)}`);
  const card = page.getByRole('region', {
    name: 'Firmware 8.0.2 is available',
  });
  await card.getByRole('button', { name: 'How to update' }).click();
  const dialog = page.getByRole('dialog', {
    name: 'Firmware 8.0.2 is available',
  });
  await expect(
    dialog.getByRole('link', { name: 'Download firmware' }),
  ).toHaveAttribute('href', 'https://example.invalid/mk4.bbf');
  await dialog
    .getByRole('button', { name: 'Hide until the next release' })
    .click();
  await expect(card).toHaveCount(0);
});

test('walks the deepest folder and back by its path', async ({ page }) => {
  await page.goto(`/#key=${await mockKey(page)}`);
  const list = page.getByRole('list', { name: 'Files on the printer' });
  for (const folder of [
    'projects',
    '2026',
    'customer orders',
    'Prusa Research a.s. spare parts and replacement components',
    'MK4S',
    'extruder',
    'final',
  ])
    await list.getByRole('button', { name: folder, exact: true }).click();
  const path = page.getByTestId('files-path');
  await expect(path).toContainText('…');
  await expect(path).toContainText('extruder');
  await expect(path).toContainText('final');
  await expect(list.getByText('idler lever')).toBeVisible();
  await path.getByRole('button', { name: 'extruder' }).click();
  await expect(path).toHaveText(/MK4S\s*\/\s*extruder$/);
  await path.getByRole('button', { name: 'USB' }).click();
  await expect(path).toHaveText('USB');
});

test('asks before replacing a file with the same name', async ({ page }) => {
  await page.goto(`/#key=${await mockKey(page)}`);
  const list = page.getByRole('list', { name: 'Files on the printer' });
  await expect(list.getByText('3DBenchy')).toBeVisible();
  const res = await page.request.get('/__mock/state');
  const { files } = (await res.json()) as {
    files: { display_name: string; dir: string }[];
  };
  const name =
    files.find((f) => !f.dir && f.display_name.startsWith('3DBenchy'))
      ?.display_name ?? '';
  const upload = () =>
    page.getByTestId('file-input').setInputFiles({
      name,
      mimeType: 'application/octet-stream',
      buffer: Buffer.from('G1 X0\n'),
    });
  await upload();
  const dialog = page.getByRole('dialog', {
    name: 'This file is already on the USB drive',
  });
  await expect(dialog.getByText(name)).toBeVisible();
  await dialog.getByRole('button', { name: 'Keep both' }).click();
  await expect(list.getByText('3DBenchy-2')).toBeVisible();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Not now' })
    .click();
  await upload();
  await page
    .getByRole('dialog', { name: 'This file is already on the USB drive' })
    .getByRole('button', { name: 'Skip' })
    .click();
  await expect(list.getByText('3DBenchy-3')).toHaveCount(0);
});

test('says when no USB drive is in the printer', async ({ page, request }) => {
  await request.patch('/__mock/state', { data: { usb: false } });
  await page.goto(`/#key=${await mockKey(page)}`);
  await expect(page.getByText('No USB drive in the printer')).toBeVisible();
});

test('remembers the chosen theme', async ({ page }) => {
  await page.goto(`/#key=${await mockKey(page)}`);
  const html = page.locator('html');
  await page.getByRole('button', { name: /^Theme: Automatic/ }).click();
  await page.getByRole('button', { name: /^Theme: Light/ }).click();
  await expect(html).toHaveClass(/dark/);
  await page.reload();
  await expect(html).toHaveClass(/dark/);
  await expect(
    page.getByRole('button', { name: /^Theme: Dark/ }),
  ).toBeVisible();
});

test("changes to the file's filament, then prints it", async ({
  page,
  request,
}) => {
  await page.goto(`/#key=${await mockKey(page)}`);
  await page.getByRole('button', { name: 'Print cable clip x6' }).click();
  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByText('Sliced for PETG, but PLA is loaded'),
  ).toBeVisible();
  await expect(dialog.getByRole('button', { name: /Print/ })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Change filament to PETG' }).click();
  await expect(
    dialog.getByRole('button', { name: 'Changing filament…' }),
  ).toBeDisabled();
  await expect(page.getByTestId('printer-state')).toHaveText(
    'Changing to PETG',
  );
  await swapAtPrinter(request);
  const print = dialog.getByRole('button', { name: 'Print now' });
  await expect(print).toBeEnabled({ timeout: 15_000 });
  await print.click();
  await expect(page.getByTestId('printer-state')).toHaveAttribute(
    'data-state',
    'PRINTING',
  );
  await page.reload();
  await expect(page.getByTestId('printer-state')).not.toHaveText(
    'Changing filament',
  );
});

test('a file from the printer offers Close, not Not now', async ({ page }) => {
  await page.goto(`/#key=${await mockKey(page)}`);
  await page.getByRole('button', { name: 'Print 3DBenchy' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Not now' })).toHaveCount(0);
});

test('speaks Czech once chosen, also after a reload', async ({ page }) => {
  await page.goto(`/#key=${await mockKey(page)}`);
  await page.getByLabel('Language').selectOption('cs');
  await expect(page.getByRole('heading', { name: 'Tiskárna' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Tiskárna' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'cs');
  await page.getByLabel('Jazyk').selectOption('en');
  await expect(page.getByRole('heading', { name: 'Printer' })).toBeVisible();
});

test('the header follows the mock printer model', async ({ page }) => {
  await page.goto(`/?panel#key=${await mockKey(page)}`);
  await expect(page.getByTestId('printer-name')).toHaveText('prusa-mk4s');
  await page
    .getByRole('complementary', { name: 'Mock printer' })
    .getByRole('button', { name: 'XL 5 tools', exact: true })
    .click();
  await expect(page.getByTestId('printer-name')).toHaveText('prusa-xl');
});

test('dragging files over the page shows where they go', async ({ page }) => {
  await page.goto(`/#key=${await mockKey(page)}`);
  await page.getByTestId('printer-name').waitFor();
  await page.evaluate(() => {
    const data = new DataTransfer();
    data.items.add(new File(['G28'], 'part.gcode'));
    window.dispatchEvent(new DragEvent('dragenter', { dataTransfer: data }));
  });
  const overlay = page.getByTestId('window-drop');
  await expect(overlay).toContainText('prusa-mk4s');
  await expect(overlay).toContainText('Drop anywhere to upload');
});

test('changes the filament through a helper job and cleans up', async ({
  page,
  request,
}) => {
  await page.goto(`/#key=${await mockKey(page)}`);
  await page.getByRole('button', { name: 'Change' }).click();
  const dialog = page.getByRole('dialog', { name: 'Filament' });
  await expect(dialog.getByText('Loaded: PLA')).toBeVisible();
  await dialog.getByRole('button', { name: 'PETG', exact: true }).click();
  const state = page.getByTestId('printer-state');
  // The upload and start of the helper job queue behind the status poll.
  await expect(state).toHaveAttribute('data-state', 'BUSY', {
    timeout: 10_000,
  });
  await expect(state).toHaveText('Changing to PETG', { timeout: 10_000 });
  await expect(page.getByTestId('filament-activity')).toBeVisible();
  await expect(page.getByTestId('job-percent')).toHaveCount(0);
  await swapAtPrinter(request);
  await expect(state).toHaveAttribute('data-state', 'FINISHED', {
    timeout: 15_000,
  });
  await expect(page.getByText('PETG', { exact: true }).first()).toBeVisible({
    timeout: 15_000,
  });
  const res = await page.request.get('/__mock/state');
  const { files } = (await res.json()) as { files: { display_name: string }[] };
  expect(
    files.some((f) => f.display_name.startsWith('prusalink-filament')),
  ).toBe(false);
});

test('the list asks only for small thumbnails', async ({ page }) => {
  const asked: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/thumb/')) asked.push(new URL(r.url()).pathname);
  });
  await page.goto(`/#key=${await mockKey(page)}`);
  await expect(
    page.getByRole('button', { name: /^Print / }).first(),
  ).toBeVisible();
  await page.waitForTimeout(1000);
  expect(asked.length).toBeGreaterThan(0);
  expect(asked.every((p) => p.startsWith('/thumb/s/'))).toBe(true);
});

test.describe('on a phone', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test('the picker shows all files', async ({ page }) => {
    await page.goto(`/#key=${await mockKey(page)}`);
    await expect(page.getByTestId('file-input')).not.toHaveAttribute('accept');
  });
});

test.describe('on the narrowest phone', () => {
  test.use({
    viewport: { width: 320, height: 640 },
    hasTouch: true,
    isMobile: true,
  });

  // Every visible element ends inside the screen: rows of buttons wrap.
  const outside = (page: Page) =>
    page.evaluate(() =>
      [...document.querySelectorAll('body *')]
        .filter((el) => !el.closest('[aria-label="Mock printer"]'))
        .map((el) => ({ el, box: el.getBoundingClientRect() }))
        .filter(
          ({ box }) =>
            box.width > 0 &&
            (box.right > window.innerWidth + 1 || box.left < -1),
        )
        .map(({ el }) => el.textContent.trim().slice(0, 40)),
    );

  test('nothing runs past the screen edge', async ({ page }) => {
    await page.goto(`/#key=${await mockKey(page)}`);
    await expect(page.getByTestId('printer-name')).toBeVisible();
    expect(await outside(page)).toEqual([]);
    await page.getByRole('button', { name: 'Change' }).click();
    await page.getByRole('button', { name: 'Other filaments' }).click();
    expect(await outside(page)).toEqual([]);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Print cable clip x6' }).click();
    await expect(
      page.getByRole('button', { name: 'Change filament to PETG' }),
    ).toBeVisible();
    expect(await outside(page)).toEqual([]);
  });

  test('the longest names and deepest path fit', async ({ page }) => {
    await page.goto(`/#key=${await mockKey(page)}`);
    const list = page.getByRole('list', { name: 'Files on the printer' });
    await expect(
      list.getByText(/^replacement extruder idler lever/),
    ).toBeVisible();
    expect(await outside(page)).toEqual([]);
    for (const folder of [
      'projects',
      '2026',
      'customer orders',
      'Prusa Research a.s. spare parts and replacement components',
      'MK4S',
    ]) {
      // Centred first: at the screen's bottom edge the dev server's floating
      // "Mock printer" button would take the tap.
      const button = list.getByRole('button', { name: folder, exact: true });
      await button.evaluate((el) => {
        el.scrollIntoView({ block: 'center' });
      });
      await button.click();
    }
    expect(await outside(page)).toEqual([]);
  });

  test('the firmware update is an icon in the header', async ({ page }) => {
    await page.goto(`/#key=${await mockKey(page)}`);
    await expect(
      page.getByRole('region', { name: 'Firmware 8.0.2 is available' }),
    ).toBeHidden();
    await page
      .getByRole('button', { name: 'Firmware 8.0.2 is available' })
      .click();
    await expect(
      page.getByRole('dialog', { name: 'Firmware 8.0.2 is available' }),
    ).toBeVisible();
    expect(await outside(page)).toEqual([]);
  });
});
