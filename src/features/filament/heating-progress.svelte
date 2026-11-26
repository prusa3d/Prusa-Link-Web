<!-- The tool heating for a filament change: a bar from 0 to the target, and
     green once the tool is within 2 °C of it. -->
<script lang="ts">
  import { t } from '../../lib/i18n.svelte';
  import { degrees } from '../../lib/units.svelte';

  interface Props {
    current: number | undefined;
    target: number | undefined;
  }

  let { current, target }: Props = $props();

  const NEAR = 2;
  const heating = $derived(target !== undefined && target > 0);
  const ready = $derived(
    heating &&
      current !== undefined &&
      Math.abs(current - (target ?? 0)) <= NEAR,
  );
  const fraction = $derived(
    heating && current !== undefined
      ? Math.min(1, Math.max(0, current / (target ?? 1)))
      : 0,
  );
</script>

<div
  class="flex flex-col gap-2"
  data-testid="heating-progress"
  data-ready={ready}
>
  <div class="flex items-baseline justify-between gap-3 text-sm">
    <span class={ready ? 'font-medium text-state-done-text' : ''}>
      {#if ready}
        {t('heating.ready')}
      {:else if heating}
        {t('heating.waiting')}
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
    aria-label={t('heating.label')}
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
</div>
