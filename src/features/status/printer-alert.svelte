<!-- The printer stopped to ask something, or failed: a wide box above
     everything else, with the printer's own message. Not a live region: the
     header's state badge already announces the change. -->
<script lang="ts">
  import { t } from '../../lib/i18n.svelte';
  import type { Status } from '../../lib/stores/printer.svelte';
  import { Icon } from '../../lib/ui/icon';
  import { TriangleAlert } from '../../lib/ui/icon/icons';

  interface Props {
    status: Status | undefined;
  }

  let { status }: Props = $props();
  const fault = $derived(status?.state === 'ERROR');
  const message = $derived(
    status?.status_printer?.message && status.status_printer.message !== 'OK'
      ? status.status_printer.message
      : t('status.checkPrinter'),
  );
</script>

{#if status?.state === 'ERROR' || status?.state === 'ATTENTION'}
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
    <div class="min-w-0">
      <h2 id="printer-alert-title" class="text-lg font-semibold">
        {t(fault ? 'alert.error' : 'alert.attention')}
      </h2>
      <p class="mt-1 break-words">{message}</p>
    </div>
  </section>
{/if}
