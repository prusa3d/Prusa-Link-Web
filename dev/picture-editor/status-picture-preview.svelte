<script lang="ts">
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

  // How the app could draw a status picture: the saved SVG with each heater's
  // reading on its leader line. Not wired into src/ yet.
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
