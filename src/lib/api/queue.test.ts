import { describe, expect, it } from 'vitest';

import { Priority, queued } from './queue.svelte';

describe('queued', () => {
  it('runs one request at a time, actions before polling before pictures', async () => {
    const order: string[] = [];
    let active = 0;
    let most = 0;
    const work = (name: string) => () => {
      active += 1;
      most = Math.max(most, active);
      order.push(name);
      return new Promise<void>((r) =>
        setTimeout(() => {
          active -= 1;
          r();
        }, 5),
      );
    };
    await Promise.all([
      queued(work('first'), Priority.Normal),
      queued(work('picture'), Priority.Background),
      queued(work('poll'), Priority.Normal),
      queued(work('stop'), Priority.Action),
    ]);
    expect(most).toBe(1);
    expect(order).toEqual(['first', 'stop', 'poll', 'picture']);
  });

  it('cancels a picture on its way for an action, then fetches it again', async () => {
    const order: string[] = [];
    const picture = queued(
      (signal) =>
        new Promise<string>((resolve, reject) => {
          order.push('picture');
          const timer = setTimeout(() => {
            resolve('png');
          }, 30);
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('aborted'));
          });
        }),
      Priority.Background,
    );
    await new Promise((r) => setTimeout(r, 5));
    const stop = queued(() => {
      order.push('stop');
      return Promise.resolve('stopped');
    }, Priority.Action);
    expect(await stop).toBe('stopped');
    expect(await picture).toBe('png');
    expect(order).toEqual(['picture', 'stop', 'picture']);
  });
});
