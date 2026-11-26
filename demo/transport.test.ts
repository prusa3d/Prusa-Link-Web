import { describe, expect, it } from 'vitest';

import { MockPrinter } from '../mock/printer.ts';
import { answer, isMockPath } from './transport.ts';

const bytes = (text: string) => new TextEncoder().encode(text);

describe('demo transport', () => {
  it('answers the printer API and the mock panel, nothing else', () => {
    expect(isMockPath('/api/v1/status')).toBe(true);
    expect(isMockPath('/thumb/l/usb/A.BGC')).toBe(true);
    expect(isMockPath('/usb/A.BGC')).toBe(true);
    expect(isMockPath('/__mock/state')).toBe(true);
    expect(isMockPath('/Prusa-Link-Web/assets/index.js')).toBe(false);
    expect(isMockPath('/apiary')).toBe(false);
  });

  it('asks for the key like the printer', () => {
    const printer = new MockPrinter();
    expect(answer(printer, 'GET', '/api/version', {}, undefined).status).toBe(
      401,
    );
    const ok = answer(
      printer,
      'GET',
      '/api/version',
      { 'x-api-key': printer.apiKey },
      undefined,
    );
    expect(ok.status).toBe(200);
  });

  it('lets the panel change the printer', () => {
    const printer = new MockPrinter();
    const out = answer(
      printer,
      'PATCH',
      '/__mock/state',
      {},
      bytes(JSON.stringify({ state: 'PAUSED' })),
    );
    expect((out.body as { state: string }).state).toBe('PAUSED');
    expect(printer.state).toBe('PAUSED');
  });

  it('stores an upload with its G-code', () => {
    const printer = new MockPrinter();
    const out = answer(
      printer,
      'PUT',
      '/api/v1/files/usb/lid.gcode',
      { 'x-api-key': printer.apiKey },
      bytes('G28'),
    );
    expect(out.status).toBe(201);
    const file = printer.files.find((f) => f.display_name === 'lid.gcode');
    expect(file?.gcode).toBe('G28');
  });
});
