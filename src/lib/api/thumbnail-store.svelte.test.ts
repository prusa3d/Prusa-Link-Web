import { describe, expect, it } from 'vitest';

import { storedThumbnail, storeThumbnail } from './thumbnail-store';

// In the browser project: IndexedDB is real there.
describe('thumbnail store', () => {
  it('keeps a picture under its file version, and only that version', async () => {
    await storeThumbnail('/thumb/s/usb/A@100-5', new Blob(['png']));
    const kept = await storedThumbnail('/thumb/s/usb/A@100-5');
    expect(await kept?.text()).toBe('png');
    expect(await storedThumbnail('/thumb/s/usb/A@200-5')).toBeUndefined();
  });
});
