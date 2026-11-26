<!-- A heater warming up: a bar from 0 to its target, green once within 2 °C
     of it, and a time-left estimate after a few seconds of readings. -->
<script lang="ts">
  import { heatingEta, type Reading } from '../../lib/heating-eta';
  import { language, t } from '../../lib/i18n.svelte';
  import { degrees } from '../../lib/units.svelte';

  interface Props {
    kind?: 'nozzle' | 'bed';
    current: number | undefined;
    target: number | undefined;
  }

  let { kind = 'nozzle', current, target }: Props = $props();
  const bed = $derived(kind === 'bed');

  const NEAR = 2;
  const heating = $derived(target !== undefined && target > 0);
  const ready = $derived(
    heating &&
      current !== undefined &&
      Math.abs(current - (target ?? 0)) <= NEAR,
  );
  // Readings since this target was set, for the time-left estimate.
  let readings: Reading[] = [];
  let readingsFor: number | undefined;
  let eta = $state<number | undefined>();
  $effect(() => {
    if (current === undefined || !heating) {
      eta = undefined;
      return;
    }
    if (readingsFor !== target) {
      readings = [];
      readingsFor = target;
    }
    readings = [...readings, { at: Date.now(), temp: current }].slice(-60);
    eta = heatingEta(readings, (target ?? 0) - NEAR);
  });
  // "40 s", "2 min": seconds while under a minute, then whole minutes.
  const short = (seconds: number) =>
    new Intl.NumberFormat(language(), {
      style: 'unit',
      unit: seconds < 60 ? 'second' : 'minute',
      unitDisplay: 'short',
    }).format(seconds < 60 ? seconds : Math.round(seconds / 60));
  const fraction = $derived(
    heating && current !== undefined
      ? Math.min(1, Math.max(0, current / (target ?? 1)))
      : 0,
  );
</script>

<div
  class="flex flex-col gap-2"
  data-testid="heating-progress"
  data-kind={kind}
  data-ready={ready}
>
  <div class="flex items-baseline justify-between gap-3 text-sm">
    <span class={ready ? 'font-medium text-state-done-text' : ''}>
      {#if ready}
        {t(bed ? 'heating.bedReady' : 'heating.ready')}
      {:else if heating}
        {t(bed ? 'heating.bedWaiting' : 'heating.waiting')}
      {:else}
        {t('heating.idle')}
      {/if}
    </span>
    {#if current !== undefined}
      <span class="shrink-0 font-mono text-muted-foreground tabular-nums">
        {degrees(current)}{#if heating}&nbsp;/ {degrees(target ?? 0)}{/if}
      </span>
    {/if}
  </div>
  <div
    role="progressbar"
    aria-label={t(bed ? 'heating.bedLabel' : 'heating.label')}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={Math.round(fraction * 100)}
    class="h-3 w-full overflow-hidden rounded-full border border-input bg-muted"
  >
    <div
      class={[
        'h-full transition-all duration-700',
        ready ? 'bg-state-done-edge' : 'bg-progress',
      ]}
      style:width="{(ready ? 1 : fraction) * 100}%"
    ></div>
  </div>
  {#if !ready && eta !== undefined}
    <p class="text-xs text-muted-foreground" data-testid="heating-eta">
      {t('heating.eta', { time: short(eta) })}
    </p>
  {/if}
</div>
