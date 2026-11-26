<!-- The printer's picture across the top of its card, edge to edge: the
     artwork's own square canvas, uncropped, with each heater's reading on its
     part where the picture has labels. -->
<script lang="ts">
  import { Icon } from '../../lib/ui/icon';
  import { Printer } from '../../lib/ui/icon/icons';

  import HeaterLabel from './heater-label.svelte';
  import { isMultiTool, type Model } from '../../lib/printer/models';
  import {
    equipmentOf,
    pictureFor,
    rememberedVariant,
  } from '../../lib/printer/picture';
  import { bedHeat, bedStyle, bedTop } from '../../lib/printer/bed-heat';
  import {
    type Equipment,
    type Heater,
    type Reading,
    shownLabels,
  } from '../../lib/printer/status-picture';

  interface Props {
    model: Model | undefined;
    /// Draw the printer with its MMU3, where there is such a picture.
    mmu?: boolean;
    readings?: Partial<Record<Heater, Reading>>;
    /// What PrusaLink 2 says the printer has besides the MMU.
    equipment?: Partial<Omit<Equipment, 'mmu'>>;
  }

  let { model, mmu = false, readings = {}, equipment = {} }: Props = $props();
  const has = $derived(equipmentOf(mmu, equipment));

  // Until the printer says which it is, the last one this browser saw: the
  // picture is there from the first frame instead of after a round trip.
  const picture = $derived(
    pictureFor(model?.variant ?? rememberedVariant(), mmu, has),
  );
  const labels = $derived(
    picture?.status ? shownLabels(picture.status.labels, has, readings) : [],
  );
  const bed = $derived(picture?.status?.bed);
  const bedHeatNow = $derived(
    readings.bed && bedHeat(readings.bed.current, bedTop(readings.bed.target)),
  );
</script>

{#if picture}
  <!-- At most 356 px square, so on a phone it does not fill the screen. -->
  <div class="rounded-t-lg -mx-4 -mt-4 overflow-hidden dark:bg-white/90">
    <div class="relative mx-auto w-full max-w-89">
      <img
        src={picture.url}
        alt={model?.name ?? ''}
        class="block h-auto w-full"
        data-testid="printer-image"
      />
      {#if picture.status && (labels.length || (bed && readings.bed))}
        <svg
          viewBox="0 0 500 500"
          aria-hidden="true"
          class="absolute inset-0 size-full text-(--color-orange-light-9)"
          data-testid="printer-labels"
        >
          {#if bed && bedHeatNow !== undefined}
            <rect
              {...bed}
              opacity="0.9"
              style={bedStyle(bedHeatNow)}
              class="transition-all duration-700 motion-reduce:transition-none"
              data-testid="printer-bed"
              data-heat={bedHeatNow.toFixed(2)}
            />
          {/if}
          {#each labels as label (label.heater)}
            {@const reading = readings[label.heater]}
            {#if reading}
              <HeaterLabel
                {label}
                style={picture.status.style}
                {reading}
                single={!isMultiTool(model?.variant)}
              />
            {/if}
          {/each}
        </svg>
      {/if}
    </div>
  </div>
{:else}
  <div
    class="rounded-t-lg -mx-4 -mt-4 flex aspect-square max-h-89 items-center justify-center bg-muted text-muted-foreground"
  >
    <Icon node={Printer} class="size-12" />
  </div>
{/if}
