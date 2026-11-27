import { readFileSync } from 'node:fs';

import { expect, type Page, test } from '@playwright/test';

import {
  centerOf,
  halveStatus,
  markedParts,
  shapesOf,
} from '../mock/printer-images';
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
  await expect(nozzle).toContainText('200°C');
  await expect(bed).toContainText('55°C');
  await expect(bed).toContainText('Bed');

  await printer(request, { tool: { index: 0, temp: 180, target: 180 } });
  await expect(nozzle).toContainText('180°C');
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
  await expect(page.locator('[data-testid^=heater-label-]')).toHaveCount(0, {
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
  await withBed(
    page,
    halveStatus({
      viewBox: '0 0 1000 1000',
      style: { value: 60, caption: 30, stroke: 4 },
      labels: [],
      ...(bed && { bed }),
    }).bed,
  );
}

/// The MK4S picture with the bed parts marked in e2e/fixtures/bed-parts.svg
/// (a status SVG as the picture editor saves it), as the build copies them.
async function withBedParts(page: Page) {
  await withBed(
    page,
    shapesOf(markedParts(fixture('bed-parts.svg')).get('bed')),
  );
}

const fixture = (file: string) =>
  readFileSync(new URL(`fixtures/${file}`, import.meta.url), 'utf8');

/// The MK4S picture with the status and fan parts marked in
/// e2e/fixtures/status-fan-parts.svg, as the build copies them.
async function withStatusAndFan(page: Page) {
  const parts = markedParts(fixture('status-fan-parts.svg'));
  const fan = parts.get('fan0') ?? [];
  await withPictureStatus(page, {
    status: shapesOf(parts.get('status')),
    fans: [
      {
        kind: 'hotend',
        center: centerOf(fan.map((p) => p.d)),
        shapes: shapesOf(fan, true),
      },
    ],
  });
}

async function withBed(page: Page, halved: unknown) {
  await withPictureStatus(page, { bed: halved });
}

/// Swaps `extra` into the MK4S status picture the app gets, in place of the
/// picture's own areas and fans.
async function withPictureStatus(page: Page, extra: Record<string, unknown>) {
  await page.route(/virtual:printer-images/, async (route) => {
    const res = await route.fetch();
    const [code = ''] = (await res.text()).split('\n//# sourceMappingURL');
    const pictures = JSON.parse(
      code.replace(/^export default /, '').replace(/;\s*$/, ''),
    ) as { images: { mk4: { status: Record<string, unknown> } } };
    // Only what the test draws, whatever the picture itself carries.
    const { status } = pictures.images.mk4;
    for (const k of ['bed', 'chamber', 'status', 'fans']) status[k] = undefined;
    Object.assign(status, extra);
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
  await expect(bed.locator('path')).toHaveAttribute('d', /^M88 350h324a3 3/);
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

test('bed parts glow inside their own outline', async ({ page, request }) => {
  await withBedParts(page);
  await printer(request, { bed: { temp: 22, target: 0 } });
  await openApp(page);
  const bed = page.getByTestId('printer-bed');
  await expect(bed).toHaveAttribute('data-heat', '0.00');
  const parts = bed.locator('path');
  await expect(parts).toHaveCount(2);
  await expect(parts.first()).toHaveAttribute('d', 'M100 345h300l-15 14h-270z');
  await expect(parts.first()).toHaveAttribute('stroke', '#2b2b2a');
  await expect(parts.first()).toHaveAttribute('stroke-width', '2');
  await expect(parts.last()).not.toHaveAttribute('stroke');
  await expect(
    page.getByTestId('printer-labels').locator(':scope > *').first(),
  ).toHaveAttribute('data-testid', 'printer-bed');
  const fills = () =>
    parts.evaluateAll((ps) => ps.map((p) => getComputedStyle(p).fill));
  const cold = await fills();
  expect(new Set(cold).size).toBe(1);

  await printer(request, { bed: { temp: 60, target: 60 } });
  await expect(bed).toHaveAttribute('data-heat', '1.00');
  await expect.poll(async () => (await fills())[1]).not.toBe(cold[1]);
});

test("the status parts take the colour of the printer's state", async ({
  page,
  request,
}) => {
  await withStatusAndFan(page);
  await openApp(page);
  const lit = page.getByTestId('printer-status');
  await expect(lit.locator('path')).toHaveCount(1);
  // Fans, bed, status and chamber, in that order, under the labels.
  const order = await page
    .getByTestId('printer-labels')
    .evaluate((svg) =>
      [...svg.children].map((c) => c.getAttribute('data-testid') ?? ''),
    );
  expect(order.slice(0, 2)).toEqual(['printer-fan', 'printer-status']);
  expect(order.at(-1)).toMatch(/^heater-label-/);
  const fill = () =>
    lit.locator('path').evaluate((e) => getComputedStyle(e).fill);
  const edge = (tone: string) =>
    page.evaluate((t) => {
      const probe = document.createElement('div');
      probe.style.color = `var(--state-${t}-edge)`;
      document.body.append(probe);
      const c = getComputedStyle(probe).color;
      probe.remove();
      return c;
    }, tone);
  await expect.poll(fill).toBe(await edge('quiet'));
  await printer(request, { state: 'FINISHED' });
  await expect.poll(fill).toBe(await edge('done'));

  // Unreachable, it stays, an unlit grey.
  await printer(request, { offline: true });
  await expect.poll(fill, { timeout: 15_000 }).toBe('rgb(58, 58, 60)');
  await expect(lit).not.toHaveAttribute('style', /drop-shadow/);
});

test('a fan turns with its reported speed and stands at 0', async ({
  page,
  request,
}) => {
  await withStatusAndFan(page);
  await printer(request, { fans: { hotend: 0 } });
  await openApp(page);
  const fan = page.getByTestId('printer-fan');
  await expect(fan.locator('path')).toHaveCount(2);
  await expect(fan).not.toHaveAttribute('data-turn');
  const turning = () => fan.evaluate((e) => getComputedStyle(e).animationName);
  expect(await turning()).toBe('none');

  await printer(request, { fans: { hotend: 10000 } });
  await expect(fan).toHaveAttribute('data-turn', '0.50');
  await expect.poll(turning).toMatch(/fan-turn/);
  expect(await fan.evaluate((e) => getComputedStyle(e).transformOrigin)).toBe(
    '250px 200px',
  );

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(turning).toBe('none');
});

test('an XL is drawn with its tools and, when it has one, its enclosure', async ({
  page,
  request,
}) => {
  const hidden = () =>
    page
      .getByTestId('printer-image')
      .evaluate(async (img: HTMLImageElement) => {
        const svg = await (await fetch(img.src)).text();
        return [...svg.matchAll(/id='([^']+)' display='none'/g)]
          .map((m) => m[1])
          .join(' ');
      });
  const look = async (patch: Record<string, unknown>) => {
    await printer(request, patch);
    await page.reload();
    await page.getByTestId('printer-image').waitFor();
    return expect.poll(hidden).not.toBe('');
  };
  await printer(request, { model: 'XL_SINGLE', reset: true });
  await openApp(page);
  await look({});
  const one = await hidden();
  await look({ model: 'XL_2', reset: true });
  await expect.poll(hidden).not.toBe(one);
  const two = await hidden();
  await look({ enclosure: true });
  await expect.poll(hidden).not.toBe(two);
  const enclosed = await hidden();
  // Dock 3 left empty: its head goes, the fourth and fifth stay.
  await look({
    model: 'XL',
    reset: true,
    enclosure: true,
    docks: [1, 2, 4, 5],
  });
  await expect.poll(hidden).not.toBe(enclosed);
  const gap = await hidden();
  await look({ docks: [1, 2, 3, 4, 5] });
  await expect.poll(hidden).not.toBe(gap);
});

test("an XL's carriage slides in front of the picked tool's dock", async ({
  page,
  request,
}) => {
  await printer(request, { model: 'XL', reset: true, docks: [1, 2, 4, 5] });
  await openApp(page);
  const carriage = page.getByTestId('printer-carriage');
  const x = () =>
    carriage.evaluate((g) => new DOMMatrix(getComputedStyle(g).transform).e);
  await expect(carriage).toHaveAttribute('data-tool', '0');
  expect(await x()).toBe(0);
  expect(
    await carriage.evaluate((g) => getComputedStyle(g).transitionDuration),
  ).toBe('0.7s');

  await printer(request, { pick: 3 });
  await expect(carriage).toHaveAttribute('data-tool', '4', { timeout: 15_000 });
  await expect.poll(x).toBeCloseTo(140.8, 0);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await carriage.evaluate((g) => getComputedStyle(g).transitionProperty),
  ).toBe('none');
  await printer(request, { pick: null });
  await expect(carriage).toHaveAttribute('data-tool', '0', { timeout: 15_000 });
  expect(await x()).toBe(0);
});

test('a picture without a bed area has none', async ({ page }) => {
  await withPictureStatus(page, {});
  await openApp(page);
  await expect(page.getByTestId('heater-label-bed')).toBeVisible();
  await expect(page.getByTestId('printer-bed')).toHaveCount(0);
});
