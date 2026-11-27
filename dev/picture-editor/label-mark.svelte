<script lang="ts">
  import {
    CHEVRON_DOWN,
    CHEVRON_UP,
    type Glyph,
    heaterGlyph,
    type Reading,
    trend,
  } from './glyphs.ts';
  import type { ViewBox } from './geometry.ts';
  import {
    heaterName,
    type Label,
    labelLayout,
    type LabelStyle,
  } from './status.ts';
  import {
    chevronWidth,
    fitCentre,
    labelFootprint,
    labelShadow,
    valueWidth,
    WIDEST_VALUE,
  } from '../../src/lib/printer/status-picture.ts';

  // One label as the app would draw it: the leader with a dot on the part,
  // the reading above the line with a heating or cooling chevron, and the
  // heater's icon and name under it. Drawn in the picture's own units, in
  // the app's font and format.
  interface Props {
    label: Label;
    style: LabelStyle;
    reading: Reading | undefined;
    /// Kept inside it the way the app keeps a label on its picture.
    fit?: ViewBox;
    /// Shows the widest reading and outlines what it takes, in red where it
    /// leaves these bounds.
    bounds?: ViewBox;
  }

  let { label, style, reading, fit, bounds }: Props = $props();

  const l = $derived(labelLayout(label, style));
  const text = $derived.by(() => {
    if (bounds) return WIDEST_VALUE;
    return `${reading === undefined ? '–' : String(Math.round(reading.current))}°C`;
  });
  const chevron = $derived.by(() => {
    if (bounds) return CHEVRON_UP;
    return (
      reading &&
      { up: CHEVRON_UP, down: CHEVRON_DOWN, none: undefined }[
        trend(reading) ?? 'none'
      ]
    );
  });
  let value = $state<SVGTextElement>();
  let measured = $state<number>();
  $effect(() => {
    const el = value;
    if (!el || !text) return;
    const measure = () => {
      const width = el.getComputedTextLength();
      measured = width > 0 ? width : undefined;
    };
    measure();
    void document.fonts.ready.then(measure);
  });
  const shownWidth = $derived(measured ?? valueWidth(text, style));
  const chevronSize = $derived(style.value * 0.5);
  const valueBlock = $derived(shownWidth + (chevron ? chevronWidth(style) : 0));
  const icon = $derived(heaterGlyph(label.heater));
  const name = $derived(heaterName(label.heater));
  const iconWidth = $derived(
    (style.caption * icon.viewBox[0]) / icon.viewBox[1],
  );
  const captionWidth = $derived(name.length * 0.6 * style.caption);
  const captionBlock = $derived(
    iconWidth + style.caption * 0.25 + captionWidth,
  );
  const x = $derived(
    fit
      ? fit.x +
          fitCentre(
            l.textX - fit.x,
            Math.max(valueBlock, captionBlock),
            fit.width,
          )
      : l.textX,
  );
  const valueStart = $derived(x - valueBlock / 2);
  const captionStart = $derived(x - captionBlock / 2);

  // The estimate the checks use, or the drawn text where that is wider.
  const footprint = $derived.by(() => {
    const f = labelFootprint(label, style);
    const width = Math.max(f.width, valueBlock);
    return { ...f, x: l.textX - width / 2, width };
  });
  const leaves = $derived(
    bounds !== undefined &&
      (footprint.x < bounds.x ||
        footprint.y < bounds.y ||
        footprint.x + footprint.width > bounds.x + bounds.width ||
        footprint.y + footprint.height > bounds.y + bounds.height),
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

<g style:filter={labelShadow(style)}>
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
    bind:this={value}
    x={valueStart + (chevron ? chevronWidth(style) : 0)}
    y={l.valueY}
    font-size={style.value}
    font-weight="600"
    fill="currentColor"
    class="app-font"
    >{text.slice(0, -2)}<tspan font-size="70%" letter-spacing="-.09em"
      >{text.slice(-2)}</tspan
    ></text
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
    class="app-font">{name}</text
  >
</g>
{#if bounds}
  <rect
    class="footprint"
    class:leaves
    {...footprint}
    stroke-width={style.stroke / 2}
    data-testid="label-footprint"
    data-leaves={leaves}
    ><title
      >{leaves
        ? `${name}: ${WIDEST_VALUE} leaves the picture`
        : `${name}: room for ${WIDEST_VALUE}`}</title
    ></rect
  >
{/if}

<style>
  /* The app's typeface (src/styles/global.css); 600 draws as its bold. */
  @font-face {
    font-family: 'Atlas Grotesk';
    font-weight: 500;
    font-display: swap;
    src: url('https://assets.prusa3d.com/cdn/fonts/atlas-grotesk/AtlasGrotesk-Medium-Web.woff2')
      format('woff2');
  }
  @font-face {
    font-family: 'Atlas Grotesk';
    font-weight: 700;
    font-display: swap;
    src: url('https://assets.prusa3d.com/cdn/fonts/atlas-grotesk/AtlasGrotesk-Bold-Web.woff2')
      format('woff2');
  }
  .app-font {
    font-family:
      'Atlas Grotesk',
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      Roboto,
      'Helvetica Neue',
      Arial,
      'Noto Sans',
      sans-serif;
    font-variant-numeric: tabular-nums;
  }
  .footprint {
    fill: none;
    stroke: #00a3ff;
    stroke-dasharray: 4 3;
    opacity: 0.7;
    pointer-events: none;
  }
  .footprint.leaves {
    stroke: #e00;
    fill: #e002;
    stroke-dasharray: none;
    opacity: 1;
  }
</style>
