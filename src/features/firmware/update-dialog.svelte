<script lang="ts">
  import { firmwareUpdate } from './update.svelte';
  import type { Picked } from '../../lib/files/collect';
  import { t } from '../../lib/i18n.svelte';
  import { Alert } from '../../lib/ui/alert';
  import { Button } from '../../lib/ui/button';
  import { Dialog } from '../../lib/ui/dialog';
  import { FileDrop } from '../../lib/ui/file-drop';
  import { Icon } from '../../lib/ui/icon';
  import {
    CloudUpload,
    Download,
    ExternalLink,
    X,
  } from '../../lib/ui/icon/icons';

  const update = $derived(firmwareUpdate.offer);
  const transfer = $derived(firmwareUpdate.transfer);
  const busy = $derived(firmwareUpdate.busy);
  const manual = $derived(!firmwareUpdate.fetchable);
  const fraction = $derived(
    transfer.step === 'downloading' || transfer.step === 'uploading'
      ? transfer.fraction
      : 0,
  );
  const showDrop = $derived(
    !busy &&
      transfer.step !== 'done' &&
      (!update?.file ||
        (manual && (firmwareUpdate.downloaded || firmwareUpdate.fetchFailed)) ||
        transfer.step === 'failed'),
  );

  const hint = $derived.by(() => {
    if (!update?.file) return t('firmware.howToPick');
    if (firmwareUpdate.fetchFailed) return t('firmware.fetchFailed');
    return t(manual ? 'firmware.howToUpload' : 'firmware.howToInstall');
  });

  const progressLabel = $derived.by(() => {
    if (transfer.step === 'downloading') return t('firmware.downloading');
    if (fraction >= 1) return t('firmware.saving');
    return t('firmware.uploading');
  });

  function onfiles(picked: Picked) {
    const [file] = [...picked.firmware, ...picked.files.map((f) => f.file)];
    if (file) void firmwareUpdate.receive(file);
  }
</script>

{#if update !== undefined || firmwareUpdate.open}
  <Dialog
    size="lg"
    open={firmwareUpdate.open}
    title={update
      ? t('firmware.available', { version: update.version })
      : t('firmware.uploadTitle')}
    onclose={() => firmwareUpdate.close()}
  >
    {#if update}
      <p class="text-sm">
        {t('firmware.current', { version: firmwareUpdate.current ?? '' })}
        {#if transfer.step !== 'done'}{hint}{/if}
      </p>
      <a
        href={update.notes}
        target="_blank"
        rel="noopener"
        class="inline-flex items-center gap-1.5 self-start text-sm font-medium text-link underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {t('firmware.notes')}<Icon node={ExternalLink} class="size-4" />
      </a>
    {/if}

    {#if busy}
      <div class="flex flex-col gap-1" data-testid="firmware-progress">
        <div class="flex items-center gap-2 text-sm">
          <span class="min-w-0 flex-1 truncate">{progressLabel}</span>
          {#if fraction < 1 || transfer.step === 'downloading'}
            <span class="shrink-0 text-muted-foreground tabular-nums"
              >{Math.round(fraction * 100)} %</span
            >
          {/if}
        </div>
        <div
          role="progressbar"
          aria-label={progressLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(fraction * 100)}
          class="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        >
          <div class="h-full bg-progress" style:width="{fraction * 100}%"></div>
        </div>
      </div>
    {/if}

    {#if firmwareUpdate.otherVersion && transfer.step !== 'failed'}
      <Alert variant="warning"
        >{t('firmware.otherVersion', {
          version: firmwareUpdate.otherVersion,
        })}</Alert
      >
    {/if}
    {#if transfer.step === 'done'}
      <Alert variant="success">
        {transfer.version
          ? t('firmware.uploaded', { version: transfer.version })
          : t('firmware.uploadedFile')}
      </Alert>
    {:else if transfer.step === 'failed'}
      <Alert variant="destructive">{t(`firmware.${transfer.reason}`)}</Alert>
    {/if}

    {#if showDrop}
      <FileDrop extensions={['.bbf']} multiple={false} {onfiles}>
        <Icon node={CloudUpload} class="size-6 shrink-0 text-primary" />
        <span class="text-sm font-medium">{t('firmware.drop')}</span>
      </FileDrop>
    {/if}

    <div class="flex items-center justify-end gap-2 max-sm:flex-wrap">
      {#if busy}
        <Button variant="ghost" onclick={() => firmwareUpdate.cancel()}>
          <Icon node={X} />{t('upload.cancel')}
        </Button>
      {:else if transfer.step === 'done' || !update}
        <Button variant="secondary" onclick={() => firmwareUpdate.close()}>
          {t('common.close')}
        </Button>
      {:else}
        <Button variant="ghost" onclick={() => firmwareUpdate.dismiss()}>
          {t('firmware.dismiss')}
        </Button>
        {#if update.file && manual}
          <a
            href={update.file.url}
            onclick={() => (firmwareUpdate.downloaded = true)}
            class="inline-flex h-11 items-center gap-2 rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hovered focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:h-9"
          >
            <Icon node={Download} class="size-4" />{t('firmware.download')}
          </a>
        {:else if update.file}
          <Button onclick={() => void firmwareUpdate.install()}>
            <Icon node={Download} />{t('firmware.install')}
          </Button>
        {/if}
      {/if}
    </div>
  </Dialog>
{/if}
