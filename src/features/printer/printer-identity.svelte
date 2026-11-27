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
  import {
    bedFill,
    bedHeat,
    bedStyle,
    bedTop,
    statusStyle,
    chamberTop,
    type Shape,
  } from '../../lib/printer/bed-heat';
  import { STATE_TONE, type PrinterState } from '../../lib/printer/state';
  import {
    type Equipment,
    type Fan,
    type Heater,
    type Reading,
    met,
    shownLabels,
  } from '../../lib/printer/status-picture';

  interface Props {
    model: Model | undefined;
    /// Draw the printer with its MMU3, where there is such a picture.
    mmu?: boolean;
    readings?: Partial<Record<Heater, Reading>>;
    /// None while the printer is unreachable.
    state?: PrinterState | undefined;
    /// Seconds per turn of a fan, or none while it stands.
    fanTurn?: ((fan: Fan) => number | undefined) | undefined;
    /// What PrusaLink 2 says the printer has besides the MMU.
    equipment?: Partial<Omit<Equipment, 'mmu'>>;
    /// The picked tool, from 1, on a toolchanger.
    activeTool?: number | undefined;
  }

  let {
    model,
    mmu = false,
    readings = {},
    state,
    fanTurn = () => undefined,
    equipment = {},
    activeTool,
  }: Props = $props();
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
  const chamber = $derived(
    __PICTURE_PARTS__ && readings.chamber
      ? picture?.status?.chamber
      : undefined,
  );
  const chamberHeat = $derived(
    readings.chamber &&
      bedHeat(readings.chamber.current, chamberTop(readings.chamber.target)),
  );
  const lit = $derived(__PICTURE_PARTS__ ? picture?.status?.status : undefined);
  const fans = $derived(
    (__PICTURE_PARTS__ ? picture?.status?.fans : undefined) ?? [],
  );
  const carriage = $derived(
    __PICTURE_PARTS__ ? picture?.status?.carriage : undefined,
  );
  // A single-tool XL has no dock to leave its tool in: it always carries T1,
  // whatever the status says is picked.
  const carriageTool = $derived(has.tools > 1 ? (activeTool ?? 0) : 1);
  const carriageAt = $derived(
    carriage?.positions[String(carriageTool)] ?? [0, 0],
  );
  const uid = $props.id();
  const drawn = $derived(
    labels.length > 0 ||
      !!(bed && readings.bed) ||
      !!chamber ||
      !!lit ||
      fans.length > 0 ||
      !!carriage,
  );
</script>

{#snippet area(shapes: Shape[], style: string, testid: string, heat?: number)}
  <g
    {style}
    opacity={testid === 'printer-chamber' ? 0.4 : undefined}
    class="transition-all duration-700 motion-reduce:transition-none"
    data-testid={testid}
    data-heat={heat?.toFixed(2)}
  >
    {#each shapes.filter((s) => met(s.when, has)) as shape, i (i)}
      <path {...shape} />
    {/each}
  </g>
{/snippet}

{#if picture}
  <!-- At most 356 px square, so on a phone it does not fill the screen. -->
  <div
    class="rounded-t-lg -mx-4 -mt-4 overflow-hidden max-md:rounded-none dark:bg-white/90"
  >
    <div class="relative mx-auto w-full max-w-89">
      <img
        src={picture.url}
        alt={model?.name ?? ''}
        class="block h-auto w-full"
        data-testid="printer-image"
      />
      {#if picture.status && drawn}
        <svg
          viewBox="0 0 500 500"
          aria-hidden="true"
          class="absolute inset-0 size-full text-(--color-orange-light-9)"
          data-testid="printer-labels"
        >
          {#if __PICTURE_PARTS__}
            {#each fans as fan, i (i)}
              {@const turn = fanTurn(fan)}
              <g
                class:turning={turn !== undefined}
                style:transform-origin="{fan.center[0]}px {fan.center[1]}px"
                style:animation-duration={turn && `${String(turn)}s`}
                data-testid="printer-fan"
                data-turn={turn?.toFixed(2)}
              >
                {#each fan.shapes.filter( (s) => met(s.when, has) ) as shape, k (k)}
                  <path {...shape} />
                {/each}
              </g>
            {/each}
            {#if carriage}
              <g
                style:transform="translate({carriageAt[0]}px, {carriageAt[1]}px)"
                class="transition-transform duration-700 ease-in-out motion-reduce:transition-none"
                data-testid="printer-carriage"
                data-tool={carriageTool}
              >
                {#each carriage.shapes.filter( (s) => met(s.when, has) ) as shape, k (k)}
                  <path {...shape} />
                {/each}
              </g>
            {/if}
          {/if}
          {#if bed && bedHeatNow !== undefined}
            {@render area(bed, bedStyle(bedHeatNow), 'printer-bed', bedHeatNow)}
          {/if}
          {#if __PICTURE_PARTS__ && lit}
            {@render area(
              lit,
              statusStyle(state && `var(--state-${STATE_TONE[state]}-edge)`),
              'printer-status',
            )}
          {/if}
          {#if __PICTURE_PARTS__ && chamber && chamberHeat !== undefined}
            <!-- The chamber's warmth fades out towards its edges. -->
            <radialGradient id="{uid}-chamber">
              <stop style:stop-color={bedFill(chamberHeat)} />
              <stop
                offset="1"
                style:stop-color={bedFill(chamberHeat)}
                stop-opacity="0"
              />
            </radialGradient>
            {@render area(
              chamber,
              `fill:url(#${uid}-chamber)`,
              'printer-chamber',
              chamberHeat,
            )}
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
    class="rounded-t-lg -mx-4 -mt-4 flex aspect-square max-h-89 items-center justify-center bg-muted text-muted-foreground max-md:rounded-none"
  >
    <Icon node={Printer} class="size-12" />
  </div>
{/if}

<style>
  .turning {
    animation: fan-turn linear infinite;
  }
  @keyframes fan-turn {
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .turning {
      animation: none;
    }
  }
</style>
