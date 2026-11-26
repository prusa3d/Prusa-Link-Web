<script lang="ts">
  import { firmwareUpdate } from './update.svelte';
  import { t } from '../../lib/i18n.svelte';
  import { Button } from '../../lib/ui/button';
  import { Dialog } from '../../lib/ui/dialog';
  import { Icon } from '../../lib/ui/icon';
  import { Download, ExternalLink } from '../../lib/ui/icon/icons';

  const update = $derived(firmwareUpdate.offer);
</script>

{#if update}
  <Dialog
    open={firmwareUpdate.open}
    title={t('firmware.available', { version: update.version })}
    onclose={() => (firmwareUpdate.open = false)}
  >
    <p class="text-sm">
      {t('firmware.current', { version: firmwareUpdate.current ?? '' })}
      {t(update.file ? 'firmware.howTo' : 'firmware.howToPick')}
    </p>
    <a
      href={update.notes}
      target="_blank"
      rel="noopener"
      class="inline-flex items-center gap-1.5 self-start text-sm font-medium text-link underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {t('firmware.notes')}<Icon node={ExternalLink} class="size-4" />
    </a>
    <div class="flex flex-wrap items-center justify-end gap-2">
      <Button variant="ghost" onclick={() => firmwareUpdate.dismiss()}>
        {t('firmware.dismiss')}
      </Button>
      {#if update.file}
        <a
          href={update.file.url}
          class="inline-flex h-11 items-center gap-2 rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hovered focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:h-9"
        >
          <Icon node={Download} class="size-4" />{t('firmware.download')}
        </a>
      {/if}
    </div>
  </Dialog>
{/if}
