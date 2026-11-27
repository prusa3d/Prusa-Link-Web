<!-- A nozzle as everywhere on the page: its diameter, the nozzle icon and
     its badges (high flow, high temperature, hardened). For a G-code
     filament, the nozzle it was sliced for. -->
<script lang="ts">
  import NozzleBadges from './nozzle-badges.svelte';
  import { TelemetryIcon } from '../../lib/ui/telemetry-icon';

  interface Props {
    /// mm.
    diameter?: number | string | undefined;
    hardened?: boolean | undefined;
    highFlow?: boolean | undefined;
    highTemp?: boolean | undefined;
    class?: string | undefined;
  }

  let {
    diameter,
    hardened,
    highFlow,
    highTemp,
    class: extra,
  }: Props = $props();
</script>

{#if diameter !== undefined || [hardened, highFlow, highTemp].includes(true)}
  <span
    class={['inline-flex items-center gap-1 text-muted-foreground', extra]}
    data-testid="nozzle-info"
  >
    {#if diameter}<span>{diameter}</span><TelemetryIcon
        kind="nozzle"
        size="size-3"
      />{/if}
    {#if __NOZZLE_BADGES__}
      <NozzleBadges {hardened} {highFlow} {highTemp} />
    {/if}
  </span>
{/if}
