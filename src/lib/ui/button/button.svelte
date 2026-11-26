<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  import { Spinner } from '../spinner';
  import {
    base,
    sizes,
    variants,
    type ButtonSize,
    type ButtonVariant,
  } from './variants';

  interface Props extends HTMLButtonAttributes {
    variant?: ButtonVariant;
    size?: ButtonSize;
    /// Waiting for what it started: a spinner in front, disabled, in the
    /// disabled colours, and `aria-busy` for screen readers.
    loading?: boolean;
    children: Snippet;
  }

  let {
    variant = 'default',
    size = 'md',
    type = 'button',
    loading = false,
    disabled,
    children,
    class: extra,
    ...rest
  }: Props = $props();
</script>

<!-- eslint-disable-next-line svelte/no-restricted-html-elements -- this is the Button primitive -->
<button
  {type}
  class={[base, variants[variant], sizes[size], extra]}
  disabled={loading || disabled}
  aria-busy={loading || undefined}
  {...rest}
>
  {#if loading}<Spinner class="size-4" />{/if}
  {@render children()}
</button>
