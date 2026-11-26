<script lang="ts">
  import { bedHeat, bedStyle, bedTop } from '../../src/lib/printer/bed-heat.ts';
  import {
    type Equipment,
    hideIds,
    labelCondition,
    met,
  } from './conditions.ts';
  import type { Reading } from './glyphs.ts';
  import LabelMark from './label-mark.svelte';
  import { parseViewBox } from './geometry.ts';
  import { type Heater, scopeIds, type StatusPicture } from './status.ts';

  // How the app draws a status picture: the saved SVG, the bed area tinted
  // by the bed's reading, and each heater's reading on its leader line.
  interface Props {
    svg: string;
    status: StatusPicture;
    readings: Partial<Record<Heater, Reading>>;
    equipment: Equipment;
  }

  let { svg, status, readings, equipment }: Props = $props();

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
  const bed = $derived(readings.bed);
  const bedLook = $derived(
    bed &&
      `${bedStyle(bedHeat(bed.current, bedTop(bed.target)))};transition:all 0.7s`,
  );
  const labels = $derived(
    status.labels.filter((l) =>
      met(labelCondition(l.heater, l.when), equipment),
    ),
  );
</script>

<div
  class="status-picture"
  style:aspect-ratio="{viewBox.width} / {viewBox.height}"
>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- our own saved SVG -->
  <div class="picture">{@html picture}</div>
  <svg class="labels" viewBox={status.viewBox} aria-hidden="true">
    {#if status.bed && bedLook}
      <rect {...status.bed} opacity="0.9" style={bedLook} />
    {/if}
    {#each labels as label, i (i)}
      <LabelMark
        {label}
        style={status.style}
        reading={readings[label.heater]}
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
  .picture :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
