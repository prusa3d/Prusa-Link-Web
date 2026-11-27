import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const put = vi.hoisted(() => vi.fn<() => Promise<number>>());
vi.mock('../../lib/api/upload', () => ({ putToUsb: put }));
vi.mock('./usb-files.svelte', () => ({ usbFirmware: { refresh: vi.fn() } }));

import { FirmwareUpdate } from './update.svelte';

const NAME = 'MK4_MK4S_MK3.9_MK3.9S_firmware_8.0.2.bbf';
const GITHUB = `https://github.com/prusa3d/Prusa-Firmware-Buddy/releases/download/v8.0.2/${NAME}`;

function github(mirror: () => Response) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.includes('api.github.com'))
        return Promise.resolve(
          Response.json({
            tag_name: 'v8.0.2',
            html_url: 'https://example.invalid/notes',
            assets: [{ name: NAME, browser_download_url: GITHUB }],
          }),
        );
      if (url.startsWith('https://assets.prusa3d.com/'))
        return Promise.resolve(mirror());
      return Promise.reject(new TypeError('unexpected fetch'));
    }),
  );
}

async function offered() {
  const update = new FirmwareUpdate();
  await update.check('8.0.1+1', 'mk4');
  return update;
}

describe('FirmwareUpdate', () => {
  beforeEach(() => {
    sessionStorage.clear();
    put.mockReset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('downloads through the mirror and puts the file in the USB root', async () => {
    github(() => new Response(new Uint8Array(8)));
    put.mockResolvedValue(201);
    const update = await offered();
    expect(update.fetchable).toMatch(/^https:\/\/assets\.prusa3d\.com\//);
    await update.install();
    expect(update.transfer).toEqual({ step: 'done', version: '8.0.2' });
    expect(put).toHaveBeenCalledWith(
      expect.objectContaining({ name: NAME }),
      '',
      expect.any(Function),
      expect.any(AbortSignal),
      true,
    );
  });

  it('falls back to the download link when the mirror cannot be fetched', async () => {
    github(() => new Response(null, { status: 404 }));
    const update = await offered();
    await update.install();
    expect(update.transfer).toEqual({ step: 'idle' });
    expect(update.fetchFailed).toBe(true);
    expect(update.fetchable).toBeUndefined();
    expect(put).not.toHaveBeenCalled();
  });

  it('says when the printer takes G-code only', async () => {
    github(() => new Response(null));
    put.mockResolvedValue(415);
    const update = await offered();
    await update.receive(new File([new Uint8Array(4)], NAME));
    expect(update.transfer).toEqual({ step: 'failed', reason: 'refused' });
  });

  it('refuses another printer model, warns about another version', async () => {
    github(() => new Response(null));
    put.mockResolvedValue(201);
    const update = await offered();
    await update.receive(new File([], 'XL_XL+_firmware_8.0.2.bbf'));
    expect(update.transfer).toEqual({ step: 'failed', reason: 'otherPrinter' });
    expect(put).not.toHaveBeenCalled();
    await update.receive(
      new File([], 'MK4_MK4S_MK3.9_MK3.9S_firmware_8.0.0.bbf'),
    );
    expect(update.transfer).toEqual({ step: 'done', version: '8.0.0' });
    expect(update.otherVersion).toBe('8.0.0');
  });
});
