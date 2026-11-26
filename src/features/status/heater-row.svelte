<!-- One heater, after Prusa Connect's HeaterRow: icon and label, then the
     reading, tinted and with an arrow while heating or cooling. -->
<script lang="ts">
  import { t, type MessageKey } from '../../lib/i18n.svelte';
  import { heaterState } from '../../lib/printer/heating';
  import { degrees } from '../../lib/units.svelte';
  import { Icon } from '../../lib/ui/icon';
  import { ArrowDown, ArrowUp } from '../../lib/ui/icon/icons';
  import { TelemetryIcon } from '../../lib/ui/telemetry-icon';

  interface Props {
    kind: 'nozzle' | 'bed' | 'chamber';
    label: string;
    current: number | undefined;
    target: number | undefined;
  }

  let { kind, label, current, target }: Props = $props();

  const state = $derived(heaterState(current, target));
  const TINT = {
    heating: 'animate-heating-pulse text-warning-text',
    'at-temperature': '',
    cooling: 'text-info-text',
    off: 'text-muted-foreground',
    'not-reported': 'text-muted-foreground',
  };
</script>

<div
  class="flex min-h-11 min-w-0 items-center gap-2"
  title={target ? t('status.target', { target: degrees(target) }) : undefined}
>
  <div class="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
    <TelemetryIcon {kind} class="text-muted-foreground" />
    <span class="shrink-0 text-sm font-medium">{label}</span>
  </div>
  <div class="flex shrink-0 items-center gap-1.5">
    {#if state === 'off'}
      <span class="text-xs text-muted-foreground">{t('status.off')}</span>
    {:else}
      <span class="sr-only">{t(`status.heater.${state}` as MessageKey)}</span>
    {/if}
    <span
      data-testid="heater-reading"
      class={[
        'inline-flex items-center gap-0.5 text-sm whitespace-nowrap tabular-nums',
        TINT[state],
      ]}
    >
      <!-- Before the value, so readings line up whatever the arrow. -->
      {#if state === 'heating'}
        <Icon node={ArrowUp} class="size-3.5" />
      {:else if state === 'cooling'}
        <Icon node={ArrowDown} class="size-3.5" />
      {/if}
      {current === undefined ? '—' : degrees(current)}
    </span>
    {#if target}
      <span
        class="text-sm whitespace-nowrap text-muted-foreground tabular-nums"
        data-testid="heater-target">/ {degrees(target)}</span
      >
    {/if}
  </div>
</div>
