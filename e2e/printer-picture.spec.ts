import { expect, test } from '@playwright/test';

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

test('an XL with no tool picked labels the bed only', async ({
  page,
  request,
}) => {
  await printer(request, { model: 'XL', reset: true });
  await openApp(page);
  await expect(page.getByTestId('heater-label-bed')).toBeVisible();
  await expect(page.getByTestId('heater-label-T1')).toHaveCount(0);

  await printer(request, { parked: false });
  await expect(page.getByTestId('heater-label-T1')).toBeVisible({
    timeout: 15_000,
  });
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
