import { describe, expect, it } from 'vitest';

import { searchBelow, type Listed } from './crawl';

const tree: Record<string, Listed[]> = {
  '': [
    { type: 'FOLDER', name: 'TOYS', display_name: 'toys' },
    { type: 'PRINT_FILE', name: 'CUBE~1.BGC', display_name: 'cube.bgcode' },
  ],
  TOYS: [
    { type: 'FOLDER', name: 'DRAGON~1', display_name: 'dragons' },
    { type: 'FOLDER', name: '.Trashes' },
    { type: 'PRINT_FILE', name: 'CUBE~2.BGC', display_name: 'big cube.bgcode' },
  ],
  'TOYS/DRAGON~1': [
    {
      type: 'PRINT_FILE',
      name: 'CUBE~3.BGC',
      display_name: 'cube dragon.bgcode',
    },
  ],
};

describe('searchBelow', () => {
  it('finds matches in every folder below, with readable paths, listing each once', async () => {
    const asked: string[] = [];
    const list = (dir: string) => {
      asked.push(dir);
      return Promise.resolve(tree[dir] ?? []);
    };
    const cache = new Map<string, Listed[]>();
    const found: string[] = [];
    const run = () =>
      searchBelow(
        { dir: '', where: '' },
        'cube',
        list,
        cache,
        new AbortController().signal,
        (hits) => {
          found.push(
            ...hits.map((h) => `${h.where}: ${h.entry.display_name ?? ''}`),
          );
        },
      );
    expect(await run()).toEqual({ folders: 3, capped: false });
    expect(found).toEqual([
      'toys: big cube.bgcode',
      'toys / dragons: cube dragon.bgcode',
    ]);
    expect(asked).toEqual(['', 'TOYS', 'TOYS/DRAGON~1']);
    await run();
    expect(asked).toHaveLength(3);
  });
});
