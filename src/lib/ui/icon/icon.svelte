<!-- One component for every icon (data in icons.ts): stroke icons on a
     24×24 grid, always decorative: the control around it carries the label. -->
<script lang="ts">
  import type { IconNode } from './types';

  interface Props {
    node: IconNode;
    class?: string | (string | false | undefined)[];
  }

  let { node, class: extra }: Props = $props();
  const sized = $derived(JSON.stringify(extra ?? '').includes('size-'));
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  class={[!sized && 'size-4', 'shrink-0', extra]}
>
  {#each node as [tag, attrs], i (i)}
    <svelte:element this={tag} {...attrs} />
  {/each}
</svg>
