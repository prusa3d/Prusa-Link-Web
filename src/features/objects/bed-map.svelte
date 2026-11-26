<!-- The print's objects on the bed, seen from above: the bed dark grey like
     its sheet, its artwork from Prusa's CDN when that loads, each object's
     outline by its state, and the nozzle over its position. With `onpick`
     an outline picks its object; with `highlight` one object stands out in
     the cancel colour and the rest fade. -->
<script lang="ts">
  import type { PlateItem } from './objects.svelte';
  import { t } from '../../lib/i18n.svelte';
  import { bedAround, type Bed } from '../../lib/printer/bed';
  import { NOZZLE } from '../../lib/ui/telemetry-icon/paths';

  interface Props {
    items: PlateItem[];
    bed: Bed | undefined;
    x?: number | undefined;
    y?: number | undefined;
    /// The object being printed now.
    current?: number | undefined;
    highlight?: number | undefined;
    onpick?: ((item: PlateItem) => void) | undefined;
    class?: string;
  }

  let {
    items,
    bed,
    x,
    y,
    current,
    highlight,
    onpick,
    class: extra,
  }: Props = $props();

  const shaped = $derived(items.filter((i) => i.polygon?.length));
  const area = $derived(
    bed ?? bedAround(shaped.flatMap((i) => i.polygon ?? [])),
  );
  let texture = $state(true);
  const nozzle = $derived(area.width / 14);

  const points = (item: PlateItem) =>
    (item.polygon ?? [])
      .map(([px, py]) => `${String(px)},${String(area.depth - py)}`)
      .join(' ');
  const stateOf = (item: PlateItem) => {
    if (item.canceled) return 'canceled';
    // In the cancel dialog only the object going is marked.
    return item.id === current && highlight === undefined
      ? 'current'
      : 'pending';
  };
  const pick = (e: Event, item: PlateItem) => {
    // A click leaves no focus behind to be drawn once the dialog closes;
    // the keyboard keeps it, with a neutral ring.
    if (e.type === 'click') (e.currentTarget as SVGElement).blur();
    if (!item.canceled) onpick?.(item);
  };
</script>

<svg
  viewBox="0 0 {area.width} {area.depth}"
  class={['w-full rounded-sm', extra]}
  role="group"
  aria-label={t('objects.bed')}
  data-testid="bed-view"
>
  <rect
    width={area.width}
    height={area.depth}
    class="fill-(--color-gray-dark-6) dark:fill-(--color-gray-dark-4)"
  />
  {#if bed?.texture && texture}
    <image
      href={bed.texture}
      width={area.width}
      height={area.depth}
      onerror={() => (texture = false)}
    />
  {/if}
  {#each shaped as item (item.id)}
    {@const state = stateOf(item)}
    {@const look = [
      'stroke-2 outline-none [vector-effect:non-scaling-stroke]',
      state === 'canceled' &&
        'fill-white/5 stroke-white/40 [stroke-dasharray:4]',
      state === 'pending' && 'fill-white/15 stroke-white',
      state === 'current' && 'fill-primary/40 stroke-primary',
      item.id === highlight && 'fill-destructive/50! stroke-destructive!',
      highlight !== undefined && item.id !== highlight && 'opacity-60',
    ]}
    {#if onpick}
      <polygon
        points={points(item)}
        role="button"
        tabindex={item.canceled ? -1 : 0}
        aria-label={item.name}
        data-state={state}
        class={[
          ...look,
          !item.canceled &&
            'cursor-pointer hover:fill-white/30 focus-visible:stroke-white focus-visible:[stroke-width:4]',
        ]}
        onclick={(e) => pick(e, item)}
        onkeydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            pick(e, item);
          }
        }}
      />
    {:else}
      <polygon
        points={points(item)}
        data-state={state}
        data-highlight={item.id === highlight}
        class={look}
      />
    {/if}
  {/each}
  {#if x !== undefined && y !== undefined}
    <g data-testid="nozzle" class="pointer-events-none">
      <circle
        cx={x}
        cy={area.depth - y}
        r={area.width / 120}
        class={highlight === undefined ? 'fill-primary' : 'fill-white'}
      />
      <!-- The tool's icon, its tip on the position. -->
      <path
        d={NOZZLE}
        class="fill-white stroke-black/60"
        stroke-width="12"
        transform="translate({x - (nozzle * 352) / 512 / 2} {area.depth -
          y -
          nozzle}) scale({nozzle / 512})"
      />
    </g>
  {/if}
</svg>
