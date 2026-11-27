import { expect, test } from '@playwright/test';

// The GitHub Pages demo (dist-demo/): the app on a mock printer that runs in
// the page itself, served from a subpath like the Pages site.
test('the demo signs in, prints and uploads on the in-page mock printer', async ({
  page,
}) => {
  await page.goto('/Prusa-Link-Web/');
  await expect(page.getByRole('note')).toContainText('Demo — mock printer');
  await expect(page.getByTestId('printer-name')).toBeVisible();
  await expect(
    page.getByRole('list', { name: 'Files on the printer' }).getByText('toys'),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Print' }).first().click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Print now' })
    .click();
  await expect(page.getByTestId('printer-state')).toHaveAttribute(
    'data-state',
    'PRINTING',
  );
  await page.getByRole('button', { name: 'Mock printer' }).click();
  await expect(
    page.getByRole('complementary', { name: 'Mock printer' }),
  ).toContainText('PRINTING');

  await page.getByTestId('file-input').setInputFiles({
    name: 'demo-part_0.4n_0.2mm_PLA_MK4S_1h2m.bgcode',
    mimeType: 'application/octet-stream',
    buffer: Buffer.alloc(3 * 1024 * 1024),
  });
  await expect(page.getByTestId('upload-progress')).toBeVisible();
  await expect(
    page
      .getByRole('list', { name: 'Files on the printer' })
      .getByText('demo-part'),
  ).toBeVisible({ timeout: 10_000 });
});
