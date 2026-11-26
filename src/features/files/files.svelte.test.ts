import { describe, expect, it } from 'vitest';

import { FilesStore, type PrinterEntry } from './files.svelte';

const tree: Record<string, PrinterEntry[]> = {
  '': [
    { type: 'FOLDER', name: 'toys' },
    { type: 'FOLDER', name: '.Trashes' },
    {
      type: 'FOLDER',
      name: 'SYSTEM~1',
      display_name: 'System Volume Information',
    },
    {
      type: 'PRINT_FILE',
      name: 'OLD~1.BGC',
      display_name: 'old.bgcode',
      m_timestamp: 1,
    },
    {
      type: 'PRINT_FILE',
      name: 'NEW~1.BGC',
      display_name: 'new.bgcode',
      m_timestamp: 2,
    },
    {
      type: 'PRINT_FILE',
      name: '_NEW~1.BGC',
      display_name: '._new.bgcode',
      m_timestamp: 3,
    },
  ],
  toys: [
    { type: 'PRINT_FILE', name: 'DRAGON~1.BGC', display_name: 'dragon.bgcode' },
  ],
};

const store = () => new FilesStore((path) => Promise.resolve(tree[path] ?? []));

describe('FilesStore', () => {
  it('hides what an OS leaves and lists files newest first', async () => {
    const files = store();
    await files.refresh();
    expect(files.folders.map((f) => f.name)).toEqual(['toys']);
    expect(files.files.map((f) => f.name)).toEqual(['NEW~1.BGC', 'OLD~1.BGC']);
  });

  it('opens a folder and goes back up', async () => {
    const files = store();
    await files.open('toys');
    expect(files.path).toBe('toys');
    expect(files.files.map((f) => f.name)).toEqual(['DRAGON~1.BGC']);
    await files.up();
    expect(files.path).toBe('');
  });
});
