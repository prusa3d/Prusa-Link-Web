<!-- The printer's red screen (a fatal error or a crash, after which it
     boots into error mode and answers only a few requests): what it says,
     its help page, the crash dump to download, an e-mail to support and a
     restart. -->
<script lang="ts">
  import { downloadDump, supportMail } from './diagnostics';
  import { api } from '../../lib/api/client';
  import { t } from '../../lib/i18n.svelte';
  import type { PrinterDialog } from '../../lib/stores/dialog.svelte';
  import { Alert } from '../../lib/ui/alert';
  import { Button } from '../../lib/ui/button';
  import { Icon } from '../../lib/ui/icon';
  import { Download, TriangleAlert } from '../../lib/ui/icon/icons';

  interface Props {
    dialog: PrinterDialog;
    printer?: string | undefined;
    firmware?: string | undefined;
  }

  let { dialog, printer, firmware }: Props = $props();
  let state = $state<'dumpFailed' | 'restarting' | undefined>();
  // A crash has no code: the printer's generic crash page.
  const help = $derived(
    dialog.code ? `https://prusa.io/${dialog.code}` : 'https://prusa.io/bsod',
  );

  async function restart() {
    const { response } = await api.POST('/api/v1/printer/reset');
    if (response.ok) state = 'restarting';
  }
</script>

<section
  class="rounded-lg flex flex-col gap-4 border border-state-fault-edge bg-state-fault p-5 text-state-fault-text"
  aria-labelledby="red-screen-title"
  data-testid="red-screen"
>
  <div class="flex items-start gap-4">
    <Icon node={TriangleAlert} class="size-8 shrink-0" />
    <div class="flex min-w-0 flex-col gap-1">
      <h2 id="red-screen-title" class="text-lg font-semibold">
        {dialog.title ?? t('redScreen.title')}
      </h2>
      {#if dialog.text}<p class="break-words">{dialog.text}</p>{/if}
      <p class="text-sm">{t('redScreen.body')}</p>
      <a class="text-sm underline" href={help} target="_blank" rel="noreferrer"
        >{t('dialog.help')}{dialog.code ? ` · ${dialog.code}` : ''}</a
      >
    </div>
  </div>
  <div class="flex flex-wrap gap-2 max-sm:[&>*]:flex-1">
    <Button
      variant="secondary"
      onclick={async () => {
        state = (await downloadDump()) ? undefined : 'dumpFailed';
      }}><Icon node={Download} />{t('redScreen.dump')}</Button
    >
    {#if __DIAGNOSTICS__}
      <Button
        variant="secondary"
        onclick={() =>
          (location.href = supportMail({
            printer,
            firmware,
            code: dialog.code,
            title: dialog.title,
            text: dialog.text,
          }))}>{t('redScreen.mail')}</Button
      >
    {/if}
    <Button disabled={state === 'restarting'} onclick={() => void restart()}
      >{t('redScreen.restart')}</Button
    >
  </div>
  <p class="text-xs">{t('redScreen.secrets')}</p>
  {#if state === 'dumpFailed'}
    <Alert variant="destructive">{t('redScreen.noDump')}</Alert>
  {:else if state === 'restarting'}
    <Alert variant="info">{t('redScreen.restarting')}</Alert>
  {/if}
</section>
