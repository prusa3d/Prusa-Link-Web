<!-- The printer's state next to the logo. One live region: screen readers
     hear each change once. -->
<script lang="ts">
  import { t, type MessageKey } from '../../lib/i18n.svelte';
  import { STATE_TONE, type PrinterState } from '../../lib/printer/state';
  import { Badge } from '../../lib/ui/badge';

  interface Props {
    state: PrinterState | undefined;
    offline?: boolean;
    /// What PrusaLink itself has the printer doing (a filament change), shown
    /// instead of the state its helper job puts the printer in.
    activity?: string | undefined;
  }

  let { state, offline = false, activity }: Props = $props();
</script>

<div
  role="status"
  class="shrink-0"
  data-state={offline ? 'OFFLINE' : state}
  data-testid="printer-state"
>
  {#if offline}
    <Badge tone="fault" size="bar">{t('app.offline')}</Badge>
  {:else if activity}
    <Badge tone="active" size="bar" testid="printer-state-badge">
      {activity}
    </Badge>
  {:else if state}
    <Badge tone={STATE_TONE[state]} size="bar" testid="printer-state-badge">
      {t(`status.state.${state}` as MessageKey)}
    </Badge>
  {/if}
</div>
