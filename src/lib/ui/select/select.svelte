<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLSelectAttributes } from 'svelte/elements';

  interface Props extends HTMLSelectAttributes {
    value?: string;
    children: Snippet;
  }

  let {
    value = $bindable(),
    class: extra,
    children,
    ...rest
  }: Props = $props();
</script>

<!-- The platform select: its picker is the phone's own, and it costs no code. -->
<!-- eslint-disable-next-line svelte/no-restricted-html-elements -- this is the Select primitive -->
<select
  bind:value
  class={[
    'h-11 cursor-pointer rounded-sm border border-border bg-background px-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-9 md:text-sm',
    extra,
  ]}
  {...rest}
>
  {@render children()}
</select>
