<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface Props extends HTMLInputAttributes {
    value?: string;
    element?: HTMLInputElement | undefined;
  }

  let {
    value = $bindable(''),
    element = $bindable(),
    class: extra,
    ...rest
  }: Props = $props();
</script>

<!-- 16px text on phones: iOS Safari zooms into any input set smaller. -->
<!-- eslint-disable-next-line svelte/no-restricted-html-elements -- this is the Input primitive -->
<input
  bind:value
  bind:this={element}
  class={[
    'h-11 w-full rounded-sm border border-border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive md:h-9 md:text-sm',
    extra,
  ]}
  {...rest}
/>
