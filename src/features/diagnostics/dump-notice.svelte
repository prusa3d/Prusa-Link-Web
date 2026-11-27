<!-- The printer crashed earlier and kept a crash dump: download it for
     support, write to support, or say it is sent. -->
<script lang="ts">
  import { downloadDump, supportMail } from './diagnostics';
  import { diagnostics } from './diagnostics.svelte';
  import { t } from '../../lib/i18n.svelte';
  import { Button } from '../../lib/ui/button';
  import { Icon } from '../../lib/ui/icon';
  import { Download } from '../../lib/ui/icon/icons';

  interface Props {
    printer?: string | undefined;
    firmware?: string | undefined;
  }

  let { printer, firmware }: Props = $props();
</script>

{#if diagnostics.dump}
  <section
    class="rounded-lg edge flex flex-col gap-2 border border-state-attention-edge bg-state-attention p-4 text-sm text-state-attention-text"
    data-testid="dump-notice"
  >
    <h2 class="font-semibold">{t('dump.title')}</h2>
    <p>{t('dump.body')}</p>
    <p class="text-xs">{t('redScreen.secrets')}</p>
    <div class="flex flex-wrap gap-2 max-sm:[&>*]:flex-1">
      <Button size="sm" variant="secondary" onclick={() => void downloadDump()}
        ><Icon node={Download} />{t('redScreen.dump')}</Button
      >
      <Button
        size="sm"
        variant="secondary"
        onclick={() => (location.href = supportMail({ printer, firmware }))}
        >{t('redScreen.mail')}</Button
      >
      <Button
        size="sm"
        variant="ghost"
        onclick={() => void diagnostics.dismiss()}>{t('dump.sent')}</Button
      >
    </div>
  </section>
{/if}
