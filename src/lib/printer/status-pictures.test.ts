import { readdirSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  type Label,
  labelFootprint,
  type LabelStyle,
  leavesPicture,
  WIDEST_VALUE,
} from './status-picture';

const DIR = new URL('../../../assets/printers/status/', import.meta.url);

const pictures = readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .map((file) => {
    const saved = JSON.parse(readFileSync(new URL(file, DIR), 'utf8')) as {
      viewBox: string;
      style: LabelStyle;
      labels: Label[];
    };
    const [x = 0, y = 0, width = 0, height = 0] = saved.viewBox
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    return { file, saved, box: { x, y, width, height } };
  });

/// Labels still to be moved inward in the picture editor, as
/// `<file>#<index>`. They are expected to fail; one that fits fails the
/// suite until it leaves this list.
const NOT_YET_FITTING = new Set<string>([]);

describe(`every status picture's labels fit ${WIDEST_VALUE}`, () => {
  it('finds the pictures', () => {
    expect(pictures.length).toBeGreaterThan(0);
  });

  for (const { file, saved, box } of pictures)
    describe(file, () => {
      saved.labels.forEach((label, i) => {
        const name = `${label.heater}${label.when ? ` when ${label.when}` : ''} (#${String(i)})`;
        const pending = NOT_YET_FITTING.has(`${file}#${String(i)}`);
        (pending ? it.fails : it)(pending ? `${name}, to fix` : name, () => {
          const f = labelFootprint(label, saved.style);
          expect(
            leavesPicture(label, saved.style, box),
            `${WIDEST_VALUE} spans x ${f.x.toFixed(1)}–${(f.x + f.width).toFixed(1)}, y ${f.y.toFixed(1)}–${(f.y + f.height).toFixed(1)} on the ${saved.viewBox} picture: move the line's end or elbow inward in the picture editor`,
          ).toBe(false);
        });
      });
    });
});
