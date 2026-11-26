<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    checked?: boolean;
    children: Snippet;
  }

  let { checked = $bindable(false), children }: Props = $props();
</script>

<!-- eslint-disable svelte/no-restricted-html-elements -- this is the Checkbox primitive -->
<label class="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
  <input type="checkbox" class="size-5 accent-primary" bind:checked />
  {@render children()}
</label>
