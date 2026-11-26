import { readFileSync } from 'node:fs';

import { expect, type Page, test } from '@playwright/test';

import { halveStatus } from '../mock/printer-images';
import { freshPrinter, openApp, printer } from './support';

// The printer's picture carries each heater's reading on the part it heats.

test.beforeEach(async ({ page, request }) => {
  await freshPrinter(page, request);
  await printer(request, { mmu: false });
});

// A reset keeps the MMU on a printer that takes one.
test.afterEach(async ({ request }) => {
  await printer(request, { mmu: false });
});

test('the nozzle and the bed show their temperatures, and follow them', async ({
  page,
  request,
}) => {
  await printer(request, {
    tool: { index: 0, temp: 200, target: 200 },
    bed: { temp: 55, target: 55 },
  });
  await openApp(page);
  const nozzle = page.getByTestId('heater-label-T1');
  const bed = page.getByTestId('heater-label-bed');
  await expect(nozzle).toContainText('200℃');
  await expect(bed).toContainText('55℃');
  await expect(bed).toContainText('Bed');

  await printer(request, { tool: { index: 0, temp: 180, target: 180 } });
  await expect(nozzle).toContainText('180℃');
});

test('heating towards a target shows an up chevron; at temperature none', async ({
  page,
  request,
}) => {
  await printer(request, {
    tool: { index: 0, temp: 60, target: 215 },
    bed: { temp: 60, target: 60 },
  });
  await openApp(page);
  await expect(
    page.getByTestId('heater-label-T1').getByTestId('heater-trend-up'),
  ).toBeAttached();
  await expect(
    page.getByTestId('heater-label-bed').locator('[data-testid^=heater-trend]'),
  ).toHaveCount(0);
});

test('an MMU3 attached swaps in the picture with it, labels and all', async ({
  page,
  request,
}) => {
  await openApp(page);
  const image = page.getByTestId('printer-image');
  const plain = await image.getAttribute('src');
  const anchor = () =>
    page.getByTestId('heater-label-T1').locator('circle').getAttribute('cx');
  const plainAnchor = await anchor();

  await printer(request, { mmu: true });
  await page.reload();
  await expect(image).not.toHaveAttribute('src', plain ?? '');
  await expect(page.getByTestId('heater-label-T1')).toBeVisible();
  await expect.poll(anchor).not.toBe(plainAnchor);
});

test('an XL labels its first tool whether or not one is picked', async ({
  page,
  request,
}) => {
  await printer(request, { model: 'XL', reset: true });
  await openApp(page);
  await expect(page.getByTestId('heater-label-bed')).toBeVisible();
  await expect(page.getByTestId('heater-label-T1')).toBeVisible();
});

test('the labels go while the printer is unreachable', async ({
  page,
  request,
}) => {
  await openApp(page);
  await expect(page.getByTestId('heater-label-bed')).toBeVisible();
  await printer(request, { offline: true });
  await expect(page.getByTestId('printer-labels')).toHaveCount(0, {
    timeout: 15_000,
  });
  await printer(request, { offline: false });
  await expect(page.getByTestId('heater-label-bed')).toBeVisible({
    timeout: 15_000,
  });
});

/// The MK4S picture with the bed area of e2e/fixtures/mk4s-bed.json (a
/// saved status picture's bed, in its 1000-unit canvas), the way a status
/// picture with a bed area would carry it.
async function withBedArea(page: Page) {
  const { bed } = JSON.parse(
    readFileSync(new URL('fixtures/mk4s-bed.json', import.meta.url), 'utf8'),
  ) as Pick<Parameters<typeof halveStatus>[0], 'bed'>;
  const halved = halveStatus({
    viewBox: '0 0 1000 1000',
    style: { value: 60, caption: 30, stroke: 4 },
    labels: [],
    ...(bed && { bed }),
  }).bed;
  await page.route(/virtual:printer-images/, async (route) => {
    const res = await route.fetch();
    const [code = ''] = (await res.text()).split('\n//# sourceMappingURL');
    const pictures = JSON.parse(
      code.replace(/^export default /, '').replace(/;\s*$/, ''),
    ) as { images: { mk4: { status: { bed?: unknown } } } };
    pictures.images.mk4.status.bed = halved;
    await route.fulfill({
      response: res,
      body: `export default ${JSON.stringify(pictures)};`,
    });
  });
}

test('the bed area glows from grey to orange as the bed heats', async ({
  page,
  request,
}) => {
  await withBedArea(page);
  await printer(request, { bed: { temp: 22, target: 0 } });
  await openApp(page);
  const bed = page.getByTestId('printer-bed');
  await expect(bed).toHaveAttribute('data-heat', '0.00');
  await expect(bed).toHaveAttribute('width', '330');
  // Drawn over the picture and under the labels.
  await expect(
    page.getByTestId('printer-labels').locator(':scope > *').first(),
  ).toHaveAttribute('data-testid', 'printer-bed');
  const fill = () => bed.evaluate((e) => getComputedStyle(e).fill);
  const cold = await fill();

  await printer(request, { bed: { temp: 60, target: 60 } });
  await expect(bed).toHaveAttribute('data-heat', '1.00');
  await expect.poll(fill).not.toBe(cold);

  // Cooling with no target: measured against the last target seen (60 ℃),
  // not the 110 ℃ default, so still fully orange at 100 ℃.
  await printer(request, { bed: { temp: 100, target: 0 } });
  await expect(page.getByTestId('heater-label-bed')).toContainText(
    /(100|9\d)℃/,
  );
  await expect(bed).toHaveAttribute('data-heat', '1.00');
});

test('a picture without a bed area has none', async ({ page }) => {
  await openApp(page);
  await expect(page.getByTestId('heater-label-bed')).toBeVisible();
  await expect(page.getByTestId('printer-bed')).toHaveCount(0);
});
