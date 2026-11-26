import { expect, test, type Page } from '@playwright/test';

import { freshPrinter, openApp } from './support';

// Putting the offered firmware on the printer from the update dialog. The
// printer (8.0.1) is offered 8.0.2 by GitHub (support.ts).

const NAME = 'MK4_MK4S_MK3.9_MK3.9S_firmware_8.0.2.bbf';
const BBF = { name: NAME, mimeType: '', buffer: Buffer.alloc(4096, 1) };
const SUCCESS =
  "Firmware 8.0.2 is on the printer's USB drive. Restart the printer and confirm flashing on its screen.";

test.beforeEach(async ({ page, request }) => {
  await freshPrinter(page, request);
  // GitHub answers a release file as a download, so the page stays.
  await page.route(/example\.invalid/, (route) =>
    route.fulfill({
      body: BBF.buffer,
      headers: { 'content-disposition': `attachment; filename="${NAME}"` },
    }),
  );
});

async function openDialog(page: Page) {
  await openApp(page);
  await page
    .getByRole('region', { name: 'Firmware 8.0.2 is available' })
    .getByRole('button', { name: 'Update printer' })
    .click();
  return page.getByRole('dialog', { name: 'Firmware 8.0.2 is available' });
}

/// Holds each firmware upload a moment, so its progress shows.
async function slowUploads(page: Page) {
  await page.route(/\/api\/v1\/files\/usb\/.*\.bbf$/, async (route) => {
    await new Promise((r) => setTimeout(r, 600));
    await route.continue();
  });
}

async function firmwareOnPrinter(page: Page) {
  const res = await page.request.get('/__mock/state');
  return ((await res.json()) as { firmwareUploads: string[] }).firmwareUploads;
}

test('printer on 8.0.1, 8.0.2 offered; the person downloads it, drops the .bbf, sees the upload and is told to restart', async ({
  page,
}) => {
  await slowUploads(page);
  const dialog = await openDialog(page);
  await expect(dialog.getByTestId('file-input')).toHaveCount(0);
  const download = page.waitForEvent('download');
  await dialog.getByRole('link', { name: 'Download firmware' }).click();
  await download;
  await dialog.getByTestId('file-input').setInputFiles(BBF);
  await expect(dialog.getByTestId('firmware-progress')).toBeVisible();
  await expect(dialog.getByRole('alert')).toHaveText(SUCCESS);
  await expect(dialog.getByTestId('firmware-progress')).toHaveCount(0);
  expect(await firmwareOnPrinter(page)).toEqual([NAME]);
});

test('the printer is too old for firmware uploads; the person is told to copy the file by hand', async ({
  page,
}) => {
  await page.route(/\/api\/v1\/files\/usb\/.*\.bbf$/, (route) =>
    route.fulfill({ status: 415, body: 'Not a GCODE' }),
  );
  const dialog = await openDialog(page);
  await dialog.getByRole('link', { name: 'Download firmware' }).click();
  await dialog.getByTestId('file-input').setInputFiles(BBF);
  await expect(dialog.getByRole('alert')).toHaveText(
    "This printer's firmware does not accept firmware uploads yet. Copy the file to the USB drive by hand.",
  );
});

test('a file for another printer is refused by its name', async ({ page }) => {
  const dialog = await openDialog(page);
  await dialog.getByRole('link', { name: 'Download firmware' }).click();
  await dialog
    .getByTestId('file-input')
    .setInputFiles({ ...BBF, name: 'XL_XL+_firmware_8.0.2.bbf' });
  await expect(dialog.getByRole('alert')).toHaveText(
    'That firmware is for another printer model.',
  );
  expect(await firmwareOnPrinter(page)).toEqual([]);
});

test.describe('with the release mirror', () => {
  const GITHUB = `https://github.com/prusa3d/Prusa-Firmware-Buddy/releases/download/v8.0.2/${NAME}`;

  test.beforeEach(async ({ page }) => {
    await page.route(/api\.github\.com/, (route) =>
      route.fulfill({
        json: {
          tag_name: 'v8.0.2',
          html_url:
            'https://github.com/prusa3d/Prusa-Firmware-Buddy/releases/tag/v8.0.2',
          assets: [{ name: NAME, browser_download_url: GITHUB }],
        },
      }),
    );
  });

  test('one click downloads the firmware, uploads it and says to restart', async ({
    page,
  }) => {
    await page.route(/assets\.prusa3d\.com\/firmware\//, (route) =>
      route.fulfill({
        body: BBF.buffer,
        headers: { 'access-control-allow-origin': '*' },
      }),
    );
    await slowUploads(page);
    const dialog = await openDialog(page);
    await dialog.getByRole('button', { name: 'Download and upload' }).click();
    await expect(dialog.getByTestId('firmware-progress')).toBeVisible();
    await expect(dialog.getByRole('alert')).toHaveText(SUCCESS);
    expect(await firmwareOnPrinter(page)).toEqual([NAME]);
  });

  test('the mirror cannot be reached; the person downloads and drops the file instead', async ({
    page,
  }) => {
    await page.route(/assets\.prusa3d\.com\//, (route) => route.abort());
    const dialog = await openDialog(page);
    await dialog.getByRole('button', { name: 'Download and upload' }).click();
    await expect(dialog).toContainText(
      'The page could not download the file itself.',
    );
    await expect(
      dialog.getByRole('link', { name: 'Download firmware' }),
    ).toHaveAttribute('href', GITHUB);
    await dialog.getByTestId('file-input').setInputFiles(BBF);
    await expect(dialog.getByRole('alert')).toHaveText(SUCCESS);
  });
});

test('a .bbf dropped anywhere on the page goes to the update dialog, not the file list', async ({
  page,
}) => {
  await openApp(page);
  const transfer = await page.evaluateHandle((name) => {
    const data = new DataTransfer();
    data.items.add(new File([new Uint8Array(16)], name));
    return data;
  }, NAME);
  await page.dispatchEvent('body', 'drop', { dataTransfer: transfer });
  const dialog = page.getByRole('dialog', {
    name: 'Firmware 8.0.2 is available',
  });
  await expect(dialog.getByRole('alert')).toHaveText(SUCCESS);
  await expect(page.getByTestId('upload-panel')).toHaveCount(0);
  expect(await firmwareOnPrinter(page)).toEqual([NAME]);
});

test('with the dialog open, the whole window is its drop area', async ({
  page,
}) => {
  const dialog = await openDialog(page);
  await page.evaluate((name) => {
    const data = new DataTransfer();
    data.items.add(new File([new Uint8Array(4096)], name));
    window.dispatchEvent(new DragEvent('dragenter', { dataTransfer: data }));
  }, NAME);
  // No page-wide upload overlay over the dialog.
  await expect(page.getByTestId('window-drop')).toHaveCount(0);
  await page.evaluate((name) => {
    const data = new DataTransfer();
    data.items.add(new File([new Uint8Array(4096)], name));
    window.dispatchEvent(
      new DragEvent('drop', { dataTransfer: data, cancelable: true }),
    );
  }, NAME);
  await expect(dialog.getByRole('alert')).toHaveText(SUCCESS);
  expect(await firmwareOnPrinter(page)).toEqual([NAME]);
});
