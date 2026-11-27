<!-- Under the readings: preheat for a filament or cool down while the
     printer is idle, babysteps of the first layer while it prints
     (PrusaLink 2). -->
<script lang="ts">
  import { controls } from './controls.svelte';
  import { t } from '../../lib/i18n.svelte';
  import { filamentLabel, firmwareFilament } from '../../lib/printer/filaments';
  import { notices } from '../../lib/stores/notices.svelte';
  import { Button } from '../../lib/ui/button';
  import { Icon } from '../../lib/ui/icon';
  import { Snowflake } from '../../lib/ui/icon/icons';
  import { TelemetryIcon } from '../../lib/ui/telemetry-icon';
  import { Select } from '../../lib/ui/select';
  import PreheatDialog from '../tools/preheat-dialog.svelte';
  import ChangeDialog from '../tools/change-dialog.svelte';
  import type { ToolRow } from '../../lib/printer/tools';

  interface Props {
    /// idle: preheat; printing: babysteps.
    mode: 'idle' | 'printing';
    /// The printer's own Z offset; 0 where it does not keep babysteps
    /// (printers with a loadcell), and the page shows what it sent.
    zOffset?: number | undefined;
    /// The loaded filament: preheat heats for it. Without one, a picker.
    loaded?: string | undefined;
    /// A printer with several tools (or MMU slots): Preheat and Change
    /// filaments open their dialogs.
    multi?: boolean;
    tools?: ToolRow[];
    perTool?: boolean;
    /// Something heats: Cool down has something to do.
    heating?: boolean;
    /// The printer changes several tools at once (change all).
    changeAll?: boolean;
  }

  let {
    mode,
    zOffset,
    loaded,
    multi = false,
    tools = [],
    perTool = false,
    heating = true,
    changeAll = false,
  }: Props = $props();
  let preheatOpen = $state(false);
  let changeOpen = $state(false);
  // Builds without several tools leave the dialogs out.
  const Preheat =
    __MULTI_TOOL__ || __TOOL_MAPPING__ ? PreheatDialog : undefined;
  const Change = __MULTI_TOOL__ || __TOOL_MAPPING__ ? ChangeDialog : undefined;
  const shown = $derived(
    zOffset !== undefined && zOffset !== 0 ? zOffset : controls.zOffset,
  );
  const STEP = 0.025;
  let chosen = $state('PLA');

  $effect(() => {
    if (mode === 'idle' && !multi && !loaded) void controls.loadFilaments();
  });

  async function send(ok: Promise<boolean>) {
    if (!(await ok)) notices.add(t('controls.refused'));
  }
</script>

{#if mode === 'idle'}
  <div class="flex flex-wrap items-center gap-2" data-testid="preheat">
    {#if !multi && !loaded}
      <Select
        bind:value={chosen}
        aria-label={t('controls.filament')}
        class="min-w-24 flex-1"
      >
        {#each controls.filaments as name (name)}
          <option value={name}>{filamentLabel(name)}</option>
        {/each}
      </Select>
    {/if}
    {#if !multi}
      <Button
        variant="secondary"
        class={['max-sm:h-11', loaded && 'flex-1']}
        disabled={controls.busy}
        onclick={() =>
          void send(
            controls.preheat(loaded ? firmwareFilament(loaded) : chosen),
          )}
        ><TelemetryIcon kind="bed" />{loaded
          ? t('controls.preheatFor', { material: filamentLabel(loaded) })
          : t('controls.preheat')}</Button
      >
    {/if}
    {#if multi && Preheat}
      <Button
        variant="secondary"
        class="max-sm:h-11"
        onclick={() => (preheatOpen = true)}
        ><TelemetryIcon kind="bed" />{t('controls.preheat')}</Button
      >
    {/if}
    <Button
      variant="ghost"
      class="max-sm:h-11"
      disabled={controls.busy || !heating}
      onclick={() => void send(controls.preheat(null))}
      ><Icon node={Snowflake} />{t('controls.cooldown')}</Button
    >
  </div>
  {#if multi && changeAll && Change}
    <Button
      variant="secondary"
      class="self-start max-sm:h-11"
      onclick={() => (changeOpen = true)}>{t('tools.changeFilaments')}</Button
    >
  {/if}
  {#if Preheat}
    <Preheat
      open={preheatOpen}
      {tools}
      {perTool}
      onclose={() => (preheatOpen = false)}
    />
  {/if}
  {#if Change}
    <Change
      open={changeOpen}
      rows={tools.map((tool) => ({
        id: String(tool.index),
        label: t('tools.name', { n: tool.index + 1 }),
        material: tool.material,
        color: tool.color,
      }))}
      onclose={() => (changeOpen = false)}
    />
  {/if}
{:else}
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
