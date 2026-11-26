<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    for: string;
    children: Snippet;
  }

  let { for: target, children }: Props = $props();
</script>

<!-- eslint-disable-next-line svelte/no-restricted-html-elements -- this is the Label primitive -->
<label for={target} class="text-sm font-medium">{@render children()}</label>
