<!-- The printer stopped to ask something, or failed: a wide box above
     everything else, with the printer's own message. With PrusaLink 2 it is
     the printer's dialog: its title, text, help page and buttons. Not a live
     region: the header's state badge already announces the change. -->
<script lang="ts">
  import { t } from '../../lib/i18n.svelte';
  import type { PrinterDialog } from '../../lib/stores/dialog.svelte';
  import type { Status } from '../../lib/stores/printer.svelte';
  import { Button } from '../../lib/ui/button';
  import { Icon } from '../../lib/ui/icon';
  import { TriangleAlert } from '../../lib/ui/icon/icons';

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
  // The help page the printer's QR code opens; a crash without a code gets
  // the general help.
  const help = $derived.by(() => {
    if (dialog?.code) return `https://prusa.io/${dialog.code}`;
    return dialog && fault ? 'https://help.prusa3d.com' : undefined;
  });
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
      {#if help}
        <a
          href={help}
          target="_blank"
          rel="noreferrer"
          class="text-sm underline"
          data-testid="dialog-help"
          >{t('dialog.help')}{dialog?.code ? ` · ${dialog.code}` : ''}</a
        >
      {/if}
      {#if dialog?.buttons.length && onbutton}
        <div class="mt-2 flex flex-wrap gap-2">
          {#each dialog.buttons as button, i (button)}
            <!-- The printer's own default button first, as on its screen. -->
            <Button
              variant={i ? 'secondary' : 'default'}
              class={i ? 'bg-card' : ''}
              disabled={pressing !== undefined}
              loading={pressing === button}
              onclick={() => onbutton(button)}>{button}</Button
            >
          {/each}
        </div>
      {/if}
    </div>
  </section>
{/if}
