<script lang="ts">
  import {
    CHEVRON_DOWN,
    CHEVRON_UP,
    type Glyph,
    heaterGlyph,
    type Reading,
    trend,
  } from './glyphs.ts';
  import {
    heaterName,
    type Label,
    labelLayout,
    type LabelStyle,
  } from './status.ts';

  // One label as the app would draw it: the leader with a dot on the part,
  // the reading above the line with a heating or cooling chevron, and the
  // heater's icon and name under it. Drawn in the picture's own units.
  interface Props {
    label: Label;
    style: LabelStyle;
    reading: Reading | undefined;
  }

  let { label, style, reading }: Props = $props();

  const l = $derived(labelLayout(label, style));
  const text = $derived(
    reading === undefined ? '–' : `${String(Math.round(reading.current))}°`,
  );
  const chevron = $derived(
    reading &&
      { up: CHEVRON_UP, down: CHEVRON_DOWN, none: undefined }[
        trend(reading) ?? 'none'
      ],
  );
  // Text widths are estimated: tabular digits are about 0.58 em wide.
  const valueWidth = $derived(text.length * 0.58 * style.value);
  const chevronSize = $derived(style.value * 0.5);
  const valueStart = $derived(
    l.textX -
      (valueWidth + (chevron ? chevronSize + style.value * 0.12 : 0)) / 2,
  );
  const icon = $derived(heaterGlyph(label.heater));
  const name = $derived(heaterName(label.heater));
  const iconWidth = $derived(
    (style.caption * icon.viewBox[0]) / icon.viewBox[1],
  );
  const captionWidth = $derived(name.length * 0.6 * style.caption);
  const captionStart = $derived(
    l.textX - (iconWidth + style.caption * 0.25 + captionWidth) / 2,
  );
</script>

{#snippet glyph(g: Glyph, x: number, y: number, height: number)}
  <g
    transform="translate({x} {y}) scale({height / g.viewBox[1]})"
    fill="currentColor"
  >
    {#each g.paths as p, i (i)}<path d={p.d} opacity={p.opacity} />{/each}
  </g>
{/snippet}

<polyline
  points="{label.anchor.join(',')} {label.elbow.join(',')} {label.end.join(
    ',',
  )}"
  fill="none"
  stroke="currentColor"
  stroke-width={style.stroke}
  stroke-linejoin="round"
/>
<circle
  cx={label.anchor[0]}
  cy={label.anchor[1]}
  r={l.dot}
  fill="currentColor"
/>
{#if chevron}
  {@render glyph(
    chevron,
    valueStart,
    l.valueY - style.value * 0.36 - chevronSize / 2,
    chevronSize,
  )}
{/if}
<text
  x={valueStart + (chevron ? chevronSize + style.value * 0.12 : 0)}
  y={l.valueY}
  font-size={style.value}
  font-weight="600"
  fill="currentColor"
  font-family="system-ui, sans-serif"
  style="font-variant-numeric: tabular-nums">{text}</text
>
{@render glyph(
  icon,
  captionStart,
  l.captionY - style.caption * 0.85,
  style.caption,
)}
<text
  x={captionStart + iconWidth + style.caption * 0.25}
  y={l.captionY}
  font-size={style.caption}
  font-weight="500"
  fill="currentColor"
  font-family="system-ui, sans-serif">{name}</text
>
