<!-- The printer's picture across the top of its card, edge to edge: the
     artwork's own square canvas, uncropped, with each heater's reading on its
     part where the picture has labels. -->
<script lang="ts">
  import { Icon } from '../../lib/ui/icon';
  import { Printer } from '../../lib/ui/icon/icons';

  import HeaterLabel from './heater-label.svelte';
  import type { Model } from '../../lib/printer/models';
  import {
    equipmentOf,
    pictureFor,
    rememberedVariant,
  } from '../../lib/printer/picture';
  import {
    type Heater,
    type Reading,
    shownLabels,
  } from '../../lib/printer/status-picture';

  interface Props {
    model: Model | undefined;
    /// Draw the printer with its MMU3, where there is such a picture.
    mmu?: boolean;
    readings?: Partial<Record<Heater, Reading>>;
  }

  let { model, mmu = false, readings = {} }: Props = $props();

  // Until the printer says which it is, the last one this browser saw: the
  // picture is there from the first frame instead of after a round trip.
  const picture = $derived(
    pictureFor(model?.variant ?? rememberedVariant(), mmu),
  );
  const labels = $derived(
    picture?.status
      ? shownLabels(picture.status.labels, equipmentOf(mmu), readings)
      : [],
  );
</script>

{#if picture}
  <div
    class="rounded-t-lg relative -mx-4 -mt-4 overflow-hidden dark:bg-white/90"
  >
    <img
      src={picture.url}
      alt={model?.name ?? ''}
      class="block h-auto w-full"
      data-testid="printer-image"
    />
    {#if picture.status && labels.length}
      <svg
        viewBox="0 0 500 500"
        aria-hidden="true"
        class="absolute inset-0 size-full text-(--color-orange-light-9)"
        data-testid="printer-labels"
      >
        {#each labels as label (label.heater)}
          {@const reading = readings[label.heater]}
          {#if reading}
            <HeaterLabel {label} style={picture.status.style} {reading} />
          {/if}
        {/each}
      </svg>
    {/if}
  </div>
{:else}
  <div
    class="rounded-t-lg -mx-4 -mt-4 flex aspect-square items-center justify-center bg-muted text-muted-foreground"
  >
    <Icon node={Printer} class="size-12" />
  </div>
{/if}
