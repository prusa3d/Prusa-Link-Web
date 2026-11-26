<!-- A filament change in progress, then its outcome: the tool heating up
     while the printer works, and afterwards whether the filament
     the printer reports is the one asked for. -->
<script lang="ts">
  import { filament } from './filament.svelte';
  import { t } from '../../lib/i18n.svelte';
  import { filamentLabel } from '../../lib/printer/filaments';
  import { printer } from '../../lib/stores/printer.svelte';
  import { Alert } from '../../lib/ui/alert';
  import { Spinner } from '../../lib/ui/spinner';
  import HeatingProgress from './heating-progress.svelte';

  const loaded = $derived(
    filament.loaded ? filamentLabel(filament.loaded) : t('filament.noneShort'),
  );
</script>

{#if filament.busy}
  <div class="flex items-center gap-3" data-testid="filament-progress">
    <Spinner class="size-5 shrink-0 text-primary" />
    <div>
      <p class="font-medium">
        {filament.busy === 'unload'
          ? t('filament.unloading')
          : t('filament.changing', {
              material: filamentLabel(filament.target ?? ''),
            })}
      </p>
      <p class="text-sm text-muted-foreground">{t('filament.follow')}</p>
    </div>
  </div>
  {#if printer.status?.state === 'ATTENTION'}
    <!-- What the printer asks, here in the dialog that is in front. -->
    <div data-testid="filament-question">
      <Alert variant="warning">
        <p class="font-semibold">{t('alert.attention')}</p>
        <p class="mt-1">
          {printer.status.status_printer?.message &&
          printer.status.status_printer.message !== 'OK'
            ? printer.status.status_printer.message
            : t('status.checkPrinter')}
        </p>
      </Alert>
    </div>
  {/if}
  <HeatingProgress
    current={printer.status?.temp_nozzle}
    target={printer.status?.target_nozzle}
  />
{:else if filament.outcome?.ok}
  <div data-testid="filament-outcome">
    <Alert variant="success">
      {filament.outcome.wanted
        ? t('filament.done', { material: loaded })
        : t('filament.unloaded')}
    </Alert>
  </div>
{:else if filament.outcome}
  <div data-testid="filament-outcome">
    <Alert variant="destructive">
      <p class="font-semibold">{t('filament.notDone')}</p>
      <p class="mt-1">{t('filament.nowLoaded', { material: loaded })}</p>
    </Alert>
  </div>
{/if}
