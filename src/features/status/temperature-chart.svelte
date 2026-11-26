<!-- Tool and bed over the last minutes: lines for the readings, dashes for
     the targets. Drawn from the page's own samples, so it covers only the
     time the page has been open, up to an hour, stretched to fit. The
     scale runs from 0 to the highest value rounded up to tens. -->
<script lang="ts">
  import { t } from '../../lib/i18n.svelte';
  import type { Sample } from '../../lib/stores/printer.svelte';
  import { degrees, inUnit, temperatureUnit } from '../../lib/units.svelte';

  interface Props {
    samples: readonly Sample[];
  }

  let { samples }: Props = $props();

  const W = 120;
  const H = 40;
  const SECONDS_PER_SAMPLE = 5;
  // In the shown unit, so the top label is a round number in °C and °F.
  const top = $derived(
    Math.max(
      10,
      Math.ceil(
        Math.max(
          ...samples.flatMap((s) =>
            [s.nozzle, s.nozzleTarget, s.bed, s.bedTarget].map(inUnit),
          ),
        ) / 10,
      ) * 10,
    ),
  );
  const line = (key: keyof Sample) =>
    samples
      .map(
        (s, i) =>
          `${((i / (samples.length - 1)) * W).toFixed(1)},${(H - (inUnit(s[key]) / top) * H).toFixed(1)}`,
      )
      .join(' ');
  const last = $derived(samples.at(-1));
  const minutes = $derived(
    Math.max(1, Math.round((samples.length * SECONDS_PER_SAMPLE) / 60)),
  );
</script>

{#if samples.length > 1}
  <figure class="flex flex-col gap-1">
    <div class="flex gap-1.5">
      <div
        class="flex flex-col justify-between text-end text-xs text-muted-foreground tabular-nums"
        aria-hidden="true"
      >
        <span>{top}°{temperatureUnit()}</span><span>0</span>
      </div>
      <svg
        viewBox="0 0 {W} {H}"
        preserveAspectRatio="none"
        class="h-16 min-w-0 flex-1 overflow-visible border-s border-b border-input"
        role="img"
        aria-label={t('chart.label', {
          nozzle: last ? degrees(last.nozzle) : '',
          bed: last ? degrees(last.bed) : '',
        })}
      >
        {#each [{ key: 'nozzle', target: 'nozzleTarget', color: 'text-primary' }, { key: 'bed', target: 'bedTarget', color: 'text-info-text' }] as const as l (l.key)}
          <polyline
            points={line(l.target)}
            class={l.color}
            fill="none"
            stroke="currentColor"
            stroke-dasharray="2 2"
            stroke-opacity="0.5"
            vector-effect="non-scaling-stroke"
          />
          <polyline
            points={line(l.key)}
            class={l.color}
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            vector-effect="non-scaling-stroke"
          />
        {/each}
      </svg>
    </div>
    <figcaption
      class="flex flex-wrap gap-x-3 text-xs text-muted-foreground tabular-nums"
    >
      <span>{t('chart.span', { minutes })}</span>
      <span class="flex items-center gap-1"
        ><span class="h-0.5 w-3 bg-primary"></span>{t('status.tool')}</span
      >
      <span class="flex items-center gap-1"
        ><span class="h-0.5 w-3 bg-info-text"></span>{t('status.bed')}</span
      >
      <span class="ms-auto">{t('chart.now')}</span>
    </figcaption>
  </figure>
{/if}
