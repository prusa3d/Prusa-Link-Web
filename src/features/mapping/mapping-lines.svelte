<!-- Connect's MappingLines: from a G-code filament's row to each of its
     slots' rows, the first straight, the others branching down with a round
     elbow. Stretched over the rows it spans. -->
<script lang="ts">
  interface Props {
    connections: number;
  }

  let { connections }: Props = $props();

  const BASE = 30;
  const ROUND = 8;
  const MID = 50;
  const OFFSET = BASE / 2;
  const paths = $derived(
    Array.from({ length: connections }, (_, i) => {
      const target = i ? BASE * (i + 1) - OFFSET : OFFSET;
      const r = i ? ROUND : 0;
      return `M0,${String(OFFSET)} H${String(MID)} Q${String(MID + ROUND)},${String(OFFSET)} ${String(MID + ROUND)},${String(OFFSET + r)} V${String(target - r)} Q${String(MID + ROUND)},${String(target)} ${String(MID + 2 * ROUND)},${String(target)} H100`;
    }),
  );
</script>

<svg
  viewBox="0 0 100 {connections * BASE}"
  preserveAspectRatio="none"
  aria-hidden="true"
  class="size-full"
>
  {#each paths as d (d)}
    <path
      {d}
      fill="none"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
      vector-effect="non-scaling-stroke"
    />
  {/each}
</svg>
