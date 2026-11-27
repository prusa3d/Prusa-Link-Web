<script lang="ts">
  import { filament, type FilamentAction } from './filament.svelte';
  import {
    BASIC_FILAMENTS,
    OTHER_FILAMENTS,
    filamentLabel,
  } from '../../lib/printer/filaments';
  import { t } from '../../lib/i18n.svelte';
  import FilamentProgress from './filament-progress.svelte';
  import { Alert } from '../../lib/ui/alert';
  import { Button } from '../../lib/ui/button';
  import { Dialog } from '../../lib/ui/dialog';
  import { Icon } from '../../lib/ui/icon';
  import { Check, ChevronRight } from '../../lib/ui/icon/icons';

  interface Props {
    open: boolean;
    /// The printer takes a job now.
    canStart: boolean;
    onclose: () => void;
  }

  let { open, canStart, onclose }: Props = $props();
  let failed = $state(false);
  let showOther = $state(false);

  // A change that ended with the filament asked for needs no more reading.
  $effect(() => {
    if (open && filament.outcome?.ok) onclose();
  });

  $effect(() => {
    if (open) showOther = OTHER_FILAMENTS.some((m) => m === filament.loaded);
    if (!open) filament.clearOutcome();
  });

  // Stays open through the change: the person sees it heat, and whether the
  // printer ended with the filament they chose.
  async function run(action: FilamentAction, material?: string) {
    failed = !(await filament.run(action, material));
  }
</script>

{#snippet choice(material: string)}
  {#if material === filament.loaded}
    <!-- The same material again is a new spool. -->
    <Button
      variant="ghost"
      class="gap-1 border-2 border-primary! font-mono text-foreground max-sm:h-11"
      aria-current="true"
      onclick={() => void run('change', material)}
    >
      <Icon node={Check} class="size-4 text-primary" />{filamentLabel(material)}
      <span class="sr-only">{t('filament.current')}</span>
    </Button>
  {:else}
    <Button
      variant="secondary"
      class="font-mono max-sm:h-11"
      onclick={() => void run(filament.loaded ? 'change' : 'load', material)}
    >
      {filamentLabel(material)}
    </Button>
  {/if}
{/snippet}

<Dialog {open} title={t('filament.title')} {onclose}>
  <p class="text-sm">
    {filament.loaded
      ? t('filament.loaded', { material: filamentLabel(filament.loaded) })
      : t('filament.none')}
  </p>
  <FilamentProgress />
  {#if filament.busy}
    <!-- The choices come back when the printer is done. -->
  {:else}
    {#if !canStart}
      <Alert variant="info">{t('filament.busy')}</Alert>
    {/if}
    <fieldset class="flex flex-col gap-2" disabled={!canStart}>
      <legend class="mb-1 text-sm font-medium">
        {filament.loaded ? t('filament.changeTo') : t('filament.loadWhich')}
      </legend>
      <div class="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {#each BASIC_FILAMENTS as material (material)}
          {@render choice(material)}
        {/each}
      </div>
      <Button
        variant="ghost"
        class="self-start px-1 text-link max-sm:h-11"
        aria-expanded={showOther}
        aria-controls="other-filaments"
        onclick={() => (showOther = !showOther)}
      >
        <Icon
          node={ChevronRight}
          class={['size-4 transition-transform', showOther && 'rotate-90']}
        />
        {t('filament.other')}
      </Button>
      {#if showOther}
        <div id="other-filaments" class="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {#each OTHER_FILAMENTS as material (material)}
            {@render choice(material)}
          {/each}
        </div>
      {/if}
    </fieldset>
    <p class="text-xs text-muted-foreground">{t('filament.how')}</p>
  {/if}
  {#if failed}
    <Alert variant="destructive">{t('filament.failed')}</Alert>
  {/if}
  <div class="flex flex-wrap justify-between gap-2">
    {#if filament.loaded && !filament.busy}
      <Button
        variant="destructive"
        size="lg"
        disabled={!canStart}
        onclick={() => void run('unload')}
      >
        {t('filament.unload')}
      </Button>
    {/if}
    <Button variant="secondary" size="lg" class="ms-auto" onclick={onclose}
      >{t('common.close')}</Button
    >
  </div>
</Dialog>
