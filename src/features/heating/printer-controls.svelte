<!-- Under the readings: preheat for a filament or cool down while the
     printer is idle, babysteps of the first layer while it prints
     (PrusaLink 2). -->
<script lang="ts">
  import { controls } from './controls.svelte';
  import { t } from '../../lib/i18n.svelte';
  import { filamentLabel } from '../../lib/printer/filaments';
  import { notices } from '../../lib/stores/notices.svelte';
  import { Button } from '../../lib/ui/button';
  import { Select } from '../../lib/ui/select';

  interface Props {
    /// idle: preheat; printing: babysteps.
    mode: 'idle' | 'printing';
    preheat: boolean;
    babystep: boolean;
    /// The printer's own Z offset; 0 where it does not keep babysteps
    /// (printers with a loadcell), and the page shows what it sent.
    zOffset?: number | undefined;
  }

  let { mode, preheat, babystep, zOffset }: Props = $props();
  const shown = $derived(
    zOffset !== undefined && zOffset !== 0 ? zOffset : controls.zOffset,
  );
  const STEP = 0.025;
  let chosen = $state('PLA');

  $effect(() => {
    if (preheat && mode === 'idle') void controls.loadFilaments();
  });

  async function send(ok: Promise<boolean>) {
    if (!(await ok)) notices.add(t('controls.refused'));
  }
</script>

{#if preheat && mode === 'idle'}
  <div class="flex flex-wrap items-center gap-2" data-testid="preheat">
    <Select
      bind:value={chosen}
      aria-label={t('controls.filament')}
      class="min-w-24 flex-1"
    >
      {#each controls.filaments as name (name)}
        <option value={name}>{filamentLabel(name)}</option>
      {/each}
    </Select>
    <Button
      variant="secondary"
      class="max-sm:h-11"
      disabled={controls.busy}
      onclick={() => void send(controls.preheat(chosen))}
      >{t('controls.preheat')}</Button
    >
    <Button
      variant="ghost"
      class="max-sm:h-11"
      disabled={controls.busy}
      onclick={() => void send(controls.preheat(null))}
      >{t('controls.cooldown')}</Button
    >
  </div>
{:else if babystep && mode === 'printing'}
  <div class="flex items-center gap-2" data-testid="babystep">
    <span class="flex-1 text-sm font-medium">{t('controls.zOffset')}</span>
    <Button
      variant="secondary"
      class="size-9 px-0 max-sm:size-11"
      aria-label={t('controls.lower')}
      disabled={controls.busy}
      onclick={() => void send(controls.babystep(-STEP))}>−</Button
    >
    <span class="w-20 text-center text-sm tabular-nums" data-testid="z-offset"
      >{shown > 0 ? '+' : ''}{shown.toFixed(3)} mm</span
    >
    <Button
      variant="secondary"
      class="size-9 px-0 max-sm:size-11"
      aria-label={t('controls.raise')}
      disabled={controls.busy}
      onclick={() => void send(controls.babystep(STEP))}>+</Button
    >
  </div>
{/if}
