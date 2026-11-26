<script lang="ts">
  import { Icon } from '../../lib/ui/icon';
  import { Printer } from '../../lib/ui/icon/icons';

  import { t, type MessageKey } from '../../lib/i18n.svelte';
  import type { Model } from '../../lib/printer/models';
  import { pictureFor } from '../../lib/printer/picture';
  import { STATE_TONE, type PrinterState } from '../../lib/printer/state';
  import { Badge } from '../../lib/ui/badge';

  interface Props {
    model: Model | undefined;
    hostname: string | undefined;
    state: PrinterState | undefined;
    offline?: boolean;
    firmware?: string | undefined;
    /// What PrusaLink itself has the printer doing (a filament change), shown
    /// instead of the state its helper job puts the printer in.
    activity?: string | undefined;
  }

  let {
    model,
    hostname,
    state,
    offline = false,
    firmware,
    activity,
  }: Props = $props();

  const image = $derived(pictureFor(model?.variant));
</script>

<div class="flex flex-wrap items-center gap-3">
  {#if image}
    <img
      src={image}
      alt=""
      class="rounded-lg size-14 shrink-0 object-contain dark:bg-white/90 dark:p-1"
      data-testid="printer-image"
    />
  {:else}
    <div
      class="rounded-lg flex size-14 shrink-0 items-center justify-center bg-muted text-muted-foreground"
    >
      <Icon node={Printer} class="size-7" />
    </div>
  {/if}
  <div class="min-w-0 flex-1">
    <h1 class="text-xl font-semibold break-words" data-testid="printer-name">
      {hostname ?? model?.name ?? t('app.title')}
    </h1>
    <p
      class="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground"
    >
      {#if hostname && model?.name}<span>{model.name}</span>{/if}
      {#if hostname && model?.name && firmware}<span aria-hidden="true">·</span
        >{/if}
      {#if firmware}<span
          >{t('firmware.version', {
            version: firmware.replace(/\+.*$/, ''),
          })}</span
        >{/if}
    </p>
  </div>
  <!-- One live region for the state: screen readers hear each change once. -->
  <div
    role="status"
    class="max-sm:w-full"
    data-state={offline ? 'OFFLINE' : state}
    data-testid="printer-state"
  >
    {#if offline}
      <Badge tone="fault" size="md">{t('app.offline')}</Badge>
    {:else if activity}
      <Badge tone="active" size="md" testid="printer-state-badge">
        {activity}
      </Badge>
    {:else if state}
      <Badge tone={STATE_TONE[state]} size="md" testid="printer-state-badge">
        {t(`status.state.${state}` as MessageKey)}
      </Badge>
    {/if}
  </div>
</div>
