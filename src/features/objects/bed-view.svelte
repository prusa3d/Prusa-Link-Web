<!-- The print's objects (PrusaLink 2 cancel object): one row with the object
     being printed, and Cancel objects opening the bed and the list. An
     outline or a row cancels its object after a yes, which shows the object
     on a small bed; the dialog waits until the printer reports it
     cancelled. A cancelled object can be printed again (Undo). -->
<script lang="ts">
  import BedMap from './bed-map.svelte';
  import type { PlateItem } from './objects.svelte';
  import { t } from '../../lib/i18n.svelte';
  import { inside, type Bed } from '../../lib/printer/bed';
  import { Alert } from '../../lib/ui/alert';
  import { Button } from '../../lib/ui/button';
  import { Dialog } from '../../lib/ui/dialog';

  interface Props {
    items: PlateItem[];
    bed: Bed | undefined;
    /// The nozzle, in bed millimetres.
    x?: number | undefined;
    y?: number | undefined;
    cancelling?: number | undefined;
    /// The object whose cancel or undo the printer did not confirm.
    failed?: number | undefined;
    /// Cancels (or with false, undoes) an object; true once the printer
    /// reports it.
    oncancel: (id: number, cancel: boolean) => Promise<boolean>;
  }

  let { items, bed, x, y, cancelling, failed, oncancel }: Props = $props();

  const OPEN = 'prusalink.objects-open';
  const remembered = () => {
    try {
      return globalThis.localStorage.getItem(OPEN) === '1';
    } catch {
      return false;
    }
  };
  let open = $state(remembered());
  function toggle() {
    open = !open;
    try {
      globalThis.localStorage.setItem(OPEN, open ? '1' : '0');
    } catch {
      // Remembered for this visit only.
    }
  }

  // The object under the nozzle; the printer's word while the nozzle is
  // between objects.
  const current = $derived(
    (x !== undefined && y !== undefined
      ? items.find((i) => i.polygon?.length && inside([x, y], i.polygon))
      : undefined
    )?.id ?? items.find((i) => i.current)?.id,
  );
  const now = $derived(items.findIndex((i) => i.id === current));
  let asked = $state<PlateItem | undefined>();

  const confirmLabel = $derived.by(() => {
    if (cancelling !== undefined) return 'objects.cancelling';
    return asked && failed === asked.id ? 'objects.retry' : 'objects.cancel';
  });

  async function confirm() {
    if (!asked) return;
    if (await oncancel(asked.id, true)) asked = undefined;
  }
</script>

<section
  aria-labelledby="objects-title"
  class="rounded-lg edge flex flex-col gap-3 border bg-card p-4"
  data-testid="objects"
>
  <div class="flex items-center gap-2">
    <div class="min-w-0 flex-1">
      <h2 id="objects-title" class="font-semibold">{t('objects.title')}</h2>
      {#if now >= 0}
        <p
          class="truncate text-sm text-muted-foreground"
          data-testid="current-object"
        >
          {items[now]?.name} · {t('objects.of', {
            n: now + 1,
            total: items.length,
          })}
        </p>
      {/if}
    </div>
    <Button
      variant="secondary"
      size="sm"
      class="max-sm:h-11"
      aria-expanded={open}
      aria-controls="objects-detail"
      onclick={toggle}>{t(open ? 'objects.hide' : 'objects.show')}</Button
    >
  </div>
  {#if open}
    <div id="objects-detail" class="flex flex-col gap-3">
      <BedMap
        {items}
        {bed}
        {x}
        {y}
        {current}
        onpick={(item: PlateItem) => (asked = item)}
      />
      <ul class="flex flex-col divide-y">
        {#each items as item (item.id)}
          <li class="flex min-h-11 items-center gap-2" data-testid="object">
            <span
              class={[
                'min-w-0 flex-1 truncate text-sm',
                item.canceled && 'text-muted-foreground line-through',
                item.id === current && 'font-semibold',
              ]}>{item.name}</span
            >
            {#if item.canceled}
              <span class="text-xs text-muted-foreground"
                >{t(
                  item.id === current ? 'objects.skipping' : 'objects.canceled',
                )}</span
              >
              <Button
                variant="ghost"
                size="sm"
                class="max-sm:h-11"
                loading={cancelling === item.id}
                disabled={cancelling !== undefined}
                onclick={() => void oncancel(item.id, false)}
                >{t('objects.undo')}</Button
              >
            {:else}
              {#if item.id === current}
                <span class="text-xs text-primary">{t('objects.printing')}</span
                >
              {/if}
              <Button
                variant="destructive"
                size="sm"
                class="max-sm:h-11"
                disabled={cancelling !== undefined}
                aria-label={t('objects.cancelTitle', { name: item.name })}
                onclick={() => (asked = item)}>{t('objects.cancel')}</Button
              >
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</section>

<Dialog
  open={asked !== undefined}
  title={t('objects.cancelTitle', { name: asked?.name ?? '' })}
  onclose={() => {
    if (cancelling === undefined) asked = undefined;
  }}
>
  {#if asked}
    <BedMap
      {items}
      {bed}
      {x}
      {y}
      {current}
      highlight={asked.id}
      class="mx-auto max-w-72"
    />
  {/if}
  <p class="text-sm text-muted-foreground">{t('objects.cancelBody')}</p>
  {#if asked && failed === asked.id && cancelling === undefined}
    <Alert variant="destructive">{t('objects.failed')}</Alert>
  {/if}
  <div class="flex flex-wrap justify-end gap-2 max-sm:[&>*]:flex-1">
    <Button
      variant="secondary"
      size="lg"
      disabled={cancelling !== undefined}
      onclick={() => (asked = undefined)}>{t('status.keepPrinting')}</Button
    >
    <Button
      variant="destructive"
      size="lg"
      loading={cancelling !== undefined}
      disabled={cancelling !== undefined}
      onclick={() => void confirm()}>{t(confirmLabel)}</Button
    >
  </div>
</Dialog>
