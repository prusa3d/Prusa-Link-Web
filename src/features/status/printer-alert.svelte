<!-- The printer stopped to ask something, or failed: a wide box above
     everything else, with the printer's own message. With PrusaLink 2 it is
     the printer's dialog: its title, text, help page and buttons. Not a live
     region: the header's state badge already announces the change. -->
<script lang="ts">
  import { t } from '../../lib/i18n.svelte';
  import type { PrinterDialog } from '../../lib/stores/dialog.svelte';
  import type { Status } from '../../lib/stores/printer.svelte';
  import { Icon } from '../../lib/ui/icon';
  import { TriangleAlert } from '../../lib/ui/icon/icons';
  import DialogActions from './dialog-actions.svelte';

  // A constant the bundler folds: builds without PrusaLink 2 drop it.
  const Actions = __API_V2__ ? DialogActions : undefined;

  interface Props {
    status: Status | undefined;
    dialog?: PrinterDialog | undefined;
    /// The button being sent.
    pressing?: string | undefined;
    onbutton?: ((button: string) => void) | undefined;
  }

  let { status, dialog, pressing, onbutton }: Props = $props();
  const fault = $derived(
    status?.state === 'ERROR' || dialog?.state === 'ERROR',
  );
  const message = $derived(
    status?.status_printer?.message && status.status_printer.message !== 'OK'
      ? status.status_printer.message
      : t('status.checkPrinter'),
  );
</script>

{#if dialog !== undefined || status?.state === 'ERROR' || status?.state === 'ATTENTION'}
  <section
    aria-labelledby="printer-alert-title"
    class={[
      'rounded-lg flex items-start gap-4 border p-5',
      fault
        ? 'border-state-fault-edge bg-state-fault text-state-fault-text'
        : 'border-state-attention-edge bg-state-attention text-state-attention-text',
    ]}
    data-testid="printer-alert"
  >
    <Icon node={TriangleAlert} class="size-8 shrink-0" />
    <div class="flex min-w-0 flex-col gap-1">
      <h2 id="printer-alert-title" class="text-lg font-semibold">
        {dialog?.title ?? t(fault ? 'alert.error' : 'alert.attention')}
      </h2>
      <p class="break-words">{dialog?.text ?? message}</p>
      {#if Actions && dialog}
        <Actions {dialog} {fault} {pressing} {onbutton} />
      {/if}
    </div>
  </section>
{/if}
