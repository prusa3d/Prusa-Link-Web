<!-- Firmware files on the USB drive (PrusaLink 2): each with its version
     against the installed one. A newer one for this printer installs from
     here; the printer restarts with it. -->
<script lang="ts">
  import {
    type Flash,
    type UsbFirmware,
    usbFirmware,
  } from './usb-files.svelte';
  import { t, type MessageKey } from '../../lib/i18n.svelte';
  import { notices } from '../../lib/stores/notices.svelte';
  import { Button } from '../../lib/ui/button';
  import { Dialog } from '../../lib/ui/dialog';

  interface Props {
    /// The printer is idle, so it can flash.
    canStart: boolean;
  }

  let { canStart }: Props = $props();
  let asked = $state<UsbFirmware | undefined>();

  $effect(() => {
    void usbFirmware.refresh();
  });

  const why = (f: UsbFirmware): MessageKey =>
    f.compatible === false
      ? 'flash.otherPrinter'
      : (`flash.${f.relation ?? 'older'}` as MessageKey);

  async function install(file: UsbFirmware) {
    asked = undefined;
    const result: Flash = await usbFirmware.flash(file);
    if (result !== 'started')
      notices.add(
        t('flash.refused'),
        t(`flash.refused.${result}` as MessageKey),
      );
  }
</script>

{#if usbFirmware.files.length}
  <section
    aria-labelledby="usb-firmware-title"
    class="rounded-lg edge flex flex-col gap-2 border bg-card p-4"
    data-testid="usb-firmware"
  >
    <h2 id="usb-firmware-title" class="text-sm font-semibold">
      {t('flash.onUsb')}
    </h2>
    {#if usbFirmware.flashing}
      <p class="text-sm" role="status">{t('flash.restarting')}</p>
    {:else}
      <ul class="flex flex-col divide-y">
        {#each usbFirmware.files as file (file.name)}
          <li class="flex min-h-11 items-center gap-2" data-testid="usb-bbf">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm">{file.version ?? file.displayName}</p>
              <p class="text-xs text-muted-foreground">{t(why(file))}</p>
            </div>
            {#if file.relation === 'newer' && file.compatible !== false}
              <Button
                size="sm"
                class="max-sm:h-11"
                disabled={!canStart}
                onclick={() => (asked = file)}>{t('flash.install')}</Button
              >
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/if}

<Dialog
  open={asked !== undefined}
  title={t('flash.installTitle', { version: asked?.version ?? '' })}
  onclose={() => (asked = undefined)}
>
  <p class="text-sm text-muted-foreground">{t('flash.installBody')}</p>
  <div class="flex flex-wrap justify-end gap-2 max-sm:[&>*]:flex-1">
    <Button variant="secondary" size="lg" onclick={() => (asked = undefined)}
      >{t('upload.cancel')}</Button
    >
    <Button
      size="lg"
      onclick={() => {
        if (asked) void install(asked);
      }}>{t('flash.install')}</Button
    >
  </div>
</Dialog>
