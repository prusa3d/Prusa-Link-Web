<script lang="ts">
  import {
    bedFill,
    bedHeat,
    bedStyle,
    bedTop,
    statusStyle,
    chamberTop,
  } from '../../src/lib/printer/bed-heat.ts';
  import type { STATE_TONE } from '../../src/lib/printer/state.ts';
  import {
    type Equipment,
    hideIds,
    labelCondition,
    met,
  } from './conditions.ts';
  import type { Reading } from './glyphs.ts';
  import LabelMark from './label-mark.svelte';
  import { parseViewBox } from './geometry.ts';
  import { copyParts } from './part-copies.ts';
  import { stateColor } from './preview.ts';
  import {
    type AreaName,
    isBedParts,
    partMark,
    scopeIds,
    type StatusPicture,
    type Heater,
  } from './status.ts';

  // How the app draws a status picture: the saved SVG; over it the fans,
  // turning; the bed, the status and the chamber, as rectangles or copies of
  // the marked parts tinted by the readings and the state, the see-through
  // chamber over the rest; and each heater's reading on its leader line.
  interface Props {
    svg: string;
    status: StatusPicture;
    readings: Partial<Record<Heater, Reading>>;
    equipment: Equipment;
    /// '' for an unreachable printer.
    printerState: keyof typeof STATE_TONE | '';
    /// Seconds per turn of the fans; none while they stand.
    fanTurn: number | undefined;
    showCenters?: boolean;
    /// The picked tool, from 1; 0 for none.
    pickedTool?: number;
    animate?: boolean;
  }

  let {
    svg,
    status,
    readings,
    equipment,
    printerState,
    fanTurn,
    showCenters = false,
    pickedTool = 0,
    animate = true,
  }: Props = $props();
  // As the app: a single-tool XL always carries T1.
  const carriageAt = $derived(
    status.carriage?.positions[
      String(equipment.tools > 1 ? pickedTool : 1)
    ] ?? [0, 0],
  );

  const uid = $props.id();
  const viewBox = $derived(parseViewBox(status.viewBox, null, null));
  const picture = $derived(
    scopeIds(
      hideIds(
        svg,
        status.conditional
          .filter((c) => !met(c.when, equipment))
          .map((c) => c.id),
      ),
      `${uid}-`,
    ),
  );
  const labels = $derived(
    status.labels.filter((l) =>
      met(labelCondition(l.heater, l.when), equipment),
    ),
  );
  let pictureEl = $state<HTMLDivElement>();
  let centers = $state<({ x: number; y: number } | undefined)[]>([]);

  function look(area: AreaName): string | undefined {
    if (area === 'status')
      return statusStyle(printerState && stateColor(printerState));
    const r = readings[area];
    if (!r) return undefined;
    if (area === 'chamber') return `fill:url(#${uid}-chamber)`;
    return `${bedStyle(bedHeat(r.current, bedTop(r.target)))};transition:all 0.7s`;
  }

  function marked(what: string): Element[] {
    return pictureEl ? [...pictureEl.querySelectorAll(`[${what}]`)] : [];
  }

  function areaCopies(
    node: SVGGElement,
    p: { area: AreaName | 'carriage'; key: string },
  ) {
    const draw = ({ area }: typeof p) => {
      copyParts(
        node,
        marked(partMark(area)),
        area === 'carriage',
        area === 'bed' || area === 'carriage',
      );
    };
    draw(p);
    return { update: draw };
  }

  /// Copies fan `i`'s parts and finds the middle it turns around, unless
  /// the editor set one.
  function fanCopies(node: SVGGElement, p: { i: number; key: string }) {
    const draw = ({ i }: typeof p) => {
      const parts = marked(partMark('fan')).filter((el) =>
        (el.getAttribute(partMark('fan')) ?? '').split(' ').includes(String(i)),
      );
      copyParts(node, parts, true);
      const set = status.fans?.[i]?.center;
      const b = node.getBBox();
      centers[i] = set
        ? { x: set[0], y: set[1] }
        : { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    };
    draw(p);
    return { update: draw };
  }
</script>

<div
  class="status-picture"
  style:aspect-ratio="{viewBox.width} / {viewBox.height}"
>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- our own saved SVG -->
  <div class="picture" bind:this={pictureEl}>{@html picture}</div>
  <svg class="labels" viewBox={status.viewBox} aria-hidden="true">
    {#each status.fans ?? [] as fan, i (i)}
      {@const c = centers[i]}
      {#key picture}
        <g
          class="fan"
          class:turning={fanTurn !== undefined}
          style:transform-origin={c &&
            `${String(c.x - viewBox.x)}px ${String(c.y - viewBox.y)}px`}
          style:animation-duration="{fanTurn ?? 1}s"
          data-testid="preview-fan"
          data-kind={fan.kind}
          use:fanCopies={{ i, key: picture }}
        ></g>
      {/key}
      {#if showCenters && c}
        <path
          class="center"
          d="M{c.x - 14} {c.y}h28M{c.x} {c.y - 14}v28"
          stroke-width="1.5"
        />
      {/if}
    {/each}
    {#if readings.chamber}
      {@const fill = bedFill(
        bedHeat(readings.chamber.current, chamberTop(readings.chamber.target)),
      )}
      <radialGradient id="{uid}-chamber">
        <stop style:stop-color={fill} />
        <stop offset="1" style:stop-color={fill} stop-opacity="0" />
      </radialGradient>
    {/if}
    {#if status.carriage}
      {#key picture}
        <g
          class="carriage"
          class:animate
          style:transform="translate({carriageAt[0]}px, {carriageAt[1]}px)"
          data-testid="preview-carriage"
          use:areaCopies={{ area: 'carriage', key: picture }}
        ></g>
      {/key}
    {/if}
    {#each ['bed', 'status', 'chamber'] as const as area (area)}
      {@const a = status[area]}
      {@const style = look(area)}
      {#if a && style}
        <g opacity={area === 'chamber' ? 0.4 : undefined} {style}>
          {#if isBedParts(a)}
            {#key picture}
              <g use:areaCopies={{ area, key: picture }}></g>
            {/key}
          {:else}
            <rect {...a} opacity={area === 'bed' ? 0.9 : undefined} />
          {/if}
        </g>
      {/if}
    {/each}
    {#each labels as label, i (i)}
      <LabelMark
        {label}
        style={status.style}
        reading={readings[label.heater]}
        fit={viewBox}
      />
    {/each}
  </svg>
</div>

<style>
  .status-picture {
    --color-orange-light-9: #fa6831;
    position: relative;
    color: #fa6831;
  }
  .picture,
  .labels {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  /* The app draws the fans and the status light in place of the picture's. */
  .picture :global([data-fan-part]),
  .picture :global([data-carriage-part]),
  .picture :global([data-status-part]) {
    opacity: 0;
  }
  .carriage.animate {
    transition: transform 0.8s ease-in-out;
  }
  .fan {
    transform-box: view-box;
  }
  .fan.turning {
    animation: fan-turn linear infinite;
  }
  @keyframes fan-turn {
    to {
      transform: rotate(360deg);
    }
  }
  .center {
    stroke: #00a3ff;
    fill: none;
  }
  .picture :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
