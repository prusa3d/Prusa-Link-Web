<script lang="ts">
  import { Icon } from '../../lib/ui/icon';
  import { CloudUpload, Printer } from '../../lib/ui/icon/icons';

  import { uploads } from './uploads.svelte';
  import { files } from '../files/files.svelte';
  import { firmwareUpdate } from '../firmware/update.svelte';
  import { collectDropped } from '../../lib/files/collect';
  import { t } from '../../lib/i18n.svelte';
  import type { Model } from '../../lib/printer/models';
  import { pictureFor, rememberedVariant } from '../../lib/printer/picture';

  // Dragging files anywhere over the page turns the whole window into a drop
  // target, with the printer they are going to.
  interface Props {
    model: Model | undefined;
    name: string;
  }

  let { model, name }: Props = $props();
  let depth = $state(0);
  const picture = $derived(
    pictureFor(model?.variant ?? rememberedVariant())?.url,
  );

  const hasFiles = (e: DragEvent) =>
    e.dataTransfer?.types.includes('Files') ?? false;

  function ondragenter(e: DragEvent) {
    if (!hasFiles(e)) return;
    depth += 1;
    if (__FIRMWARE_UPDATE__) firmwareUpdate.dragging = firmwareUpdate.open;
  }

  function ondragleave(e: DragEvent) {
    if (!hasFiles(e)) return;
    depth = Math.max(0, depth - 1);
    if (depth === 0) firmwareUpdate.dragging = false;
  }

  function ondragover(e: DragEvent) {
    if (hasFiles(e)) e.preventDefault();
  }

  async function ondrop(e: DragEvent) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth = 0;
    firmwareUpdate.dragging = false;
    const data = e.dataTransfer;
    if (!data) return;
    // With the firmware dialog open the whole window is its drop area.
    if (__FIRMWARE_UPDATE__ && firmwareUpdate.open) {
      const [file] = [...data.files];
      if (file) void firmwareUpdate.receive(file);
      return;
    }
    await uploads.upload(await collectDropped(data.items, data.files));
  }
  // Where a drop lands: the folder the storage column shows.
  const folder = $derived(
    [t('files.usb'), ...files.crumbs.map((c) => c.label)].join(' / '),
  );
</script>

<!-- Capture resets the overlay for every drop, also one the drop zone
     handles itself (it stops the event there). -->
<svelte:window
  {ondragenter}
  {ondragleave}
  {ondragover}
  ondropcapture={() => {
    depth = 0;
    firmwareUpdate.dragging = false;
  }}
  ondrop={(e: DragEvent) => void ondrop(e)}
/>

{#if depth > 0 && !(__FIRMWARE_UPDATE__ && firmwareUpdate.open)}
  <div
    class="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-6 backdrop-blur-sm"
    data-testid="window-drop"
  >
    <div
      class="rounded-2xl flex w-full max-w-md flex-col items-center gap-4 border border-dashed border-primary bg-card p-8 text-center shadow-xl"
    >
      {#if picture}
        <img
          src={picture}
          alt=""
          class="dark:rounded-lg h-36 w-auto object-contain dark:bg-white/90 dark:p-2"
        />
      {:else}
        <Icon node={Printer} class="size-20 text-muted-foreground" />
      {/if}
      <div>
        <p class="text-xl font-semibold">{name}</p>
        {#if model}<p class="text-sm text-muted-foreground">
            {model.name}
          </p>{/if}
      </div>
      <p class="flex items-center gap-2 text-lg font-medium text-primary">
        <Icon node={CloudUpload} class="size-6" />{t('upload.dropAnywhere')}
      </p>
      <p class="text-sm text-muted-foreground">
        {t('upload.dropInto', { folder })}
      </p>
    </div>
  </div>
{/if}
