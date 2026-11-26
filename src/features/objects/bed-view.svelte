<!-- The print's objects on the bed, seen from above: the bed in grey with its
     artwork from Prusa's CDN when it loads, each object's outline coloured
     by its state, and the nozzle. An outline or the list below cancels an
     object, after a yes. -->
<script lang="ts">
  import type { PlateItem } from './objects.svelte';
  import { t } from '../../lib/i18n.svelte';
  import { bedAround, type Bed } from '../../lib/printer/bed';
  import { Button } from '../../lib/ui/button';
  import { Dialog } from '../../lib/ui/dialog';

  interface Props {
    items: PlateItem[];
    bed: Bed | undefined;
    /// The nozzle, in bed millimetres.
    x?: number | undefined;
    y?: number | undefined;
    cancelling?: number | undefined;
    oncancel: (id: number) => void;
  }

  let { items, bed, x, y, cancelling, oncancel }: Props = $props();

  const shaped = $derived(items.filter((i) => i.polygon?.length));
  const area = $derived(
    bed ?? bedAround(shaped.flatMap((i) => i.polygon ?? [])),
  );
  let texture = $state(true);
  let asked = $state<PlateItem | undefined>();

  const points = (item: PlateItem) =>
    (item.polygon ?? [])
      .map(([px, py]) => `${String(px)},${String(area.depth - py)}`)
      .join(' ');
  const stateOf = (item: PlateItem) => {
    if (item.canceled) return 'canceled';
    return item.current ? 'current' : 'pending';
  };
  const ask = (item: PlateItem) => {
    if (!item.canceled) asked = item;
  };
</script>

<section
  aria-labelledby="objects-title"
  class="rounded-lg edge flex flex-col gap-3 border bg-card p-4"
  data-testid="objects"
>
  <h2 id="objects-title" class="font-semibold">{t('objects.title')}</h2>
  {#if shaped.length}
    <svg
      viewBox="0 0 {area.width} {area.depth}"
      class="w-full rounded-sm bg-muted"
      role="group"
      aria-label={t('objects.bed')}
      data-testid="bed-view"
    >
      {#if bed?.texture && texture}
        <image
          href={bed.texture}
          width={area.width}
          height={area.depth}
          onerror={() => (texture = false)}
        />
      {/if}
      {#each shaped as item (item.id)}
        <polygon
          points={points(item)}
          role="button"
          tabindex={item.canceled ? -1 : 0}
          aria-label={item.name}
          data-state={stateOf(item)}
          class={[
            'stroke-2 outline-none [vector-effect:non-scaling-stroke] focus-visible:stroke-ring',
            item.canceled
              ? 'fill-muted-foreground/30 stroke-muted-foreground [stroke-dasharray:4]'
              : 'cursor-pointer fill-foreground/15 stroke-foreground hover:fill-destructive/30',
            item.current && 'fill-primary/40 stroke-primary',
          ]}
          onclick={() => ask(item)}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') ask(item);
          }}
        />
      {/each}
      {#if x !== undefined && y !== undefined}
        <circle
          cx={x}
          cy={area.depth - y}
          r={area.width / 80}
          class="fill-primary stroke-background"
          data-testid="nozzle"
        />
      {/if}
    </svg>
  {/if}
  <ul class="flex flex-col divide-y">
    {#each items as item (item.id)}
      <li class="flex min-h-11 items-center gap-2" data-testid="object">
        <span
          class={[
            'min-w-0 flex-1 truncate text-sm',
            item.canceled && 'text-muted-foreground line-through',
            item.current && 'font-semibold',
          ]}>{item.name}</span
        >
        {#if item.canceled}
          <span class="text-xs text-muted-foreground"
            >{t('objects.canceled')}</span
          >
        {:else}
          {#if item.current}
            <span class="text-xs text-primary">{t('objects.printing')}</span>
          {/if}
          <Button
            variant="destructive"
            size="sm"
            class="max-sm:h-11"
            loading={cancelling === item.id}
            disabled={cancelling !== undefined}
            aria-label={t('objects.cancelTitle', { name: item.name })}
            onclick={() => ask(item)}>{t('objects.cancel')}</Button
          >
        {/if}
      </li>
    {/each}
  </ul>
</section>

<Dialog
  open={asked !== undefined}
  title={t('objects.cancelTitle', { name: asked?.name ?? '' })}
  onclose={() => (asked = undefined)}
>
  <p class="text-sm text-muted-foreground">{t('objects.cancelBody')}</p>
  <div class="flex flex-wrap justify-end gap-2 max-sm:[&>*]:flex-1">
    <Button variant="secondary" size="lg" onclick={() => (asked = undefined)}
      >{t('status.keepPrinting')}</Button
    >
    <Button
      variant="destructive"
      size="lg"
      onclick={() => {
        if (asked) oncancel(asked.id);
        asked = undefined;
      }}>{t('objects.cancel')}</Button
    >
  </div>
</Dialog>
