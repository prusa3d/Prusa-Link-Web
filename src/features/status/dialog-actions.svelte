<!-- The printer's dialog's help link and buttons (PrusaLink 2). -->
<script lang="ts">
  import { t } from '../../lib/i18n.svelte';
  import type { PrinterDialog } from '../../lib/stores/dialog.svelte';
  import { Button } from '../../lib/ui/button';

  interface Props {
    dialog: PrinterDialog;
    fault: boolean;
    pressing?: string | undefined;
    onbutton?: ((button: string) => void) | undefined;
  }

  let { dialog, fault, pressing, onbutton }: Props = $props();
  // The help page the printer's QR code opens; a crash without a code gets
  // the general help.
  const help = $derived.by(() => {
    if (dialog.code) return `https://prusa.io/${dialog.code}`;
    return fault ? 'https://help.prusa3d.com' : undefined;
  });
</script>

{#if help}
  <a
    href={help}
    target="_blank"
    rel="noreferrer"
    class="text-sm underline"
    data-testid="dialog-help"
    >{t('dialog.help')}{dialog.code ? ` · ${dialog.code}` : ''}</a
  >
{/if}
{#if dialog.buttons.length && onbutton}
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
