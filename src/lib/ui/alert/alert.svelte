<!-- A message that arrives on its own: role="alert" makes screen readers read
     it when it appears. Classes from @prusa/connect-ui's Alert. -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /// info: something to know, warning: something to act on (often at the
    /// printer), success: what was asked is done.
    variant?: 'default' | 'info' | 'warning' | 'success' | 'destructive';
    children: Snippet;
  }

  let { variant = 'default', children }: Props = $props();

  const variants = {
    default: 'border-border bg-card text-card-foreground',
    info: 'border-state-active-edge bg-state-active text-state-active-text',
    warning:
      'border-state-attention-edge bg-state-attention text-state-attention-text',
    success: 'border-state-done-edge bg-state-done text-state-done-text',
    destructive: 'border-destructive bg-card text-destructive-text',
  };
</script>

<!-- eslint-disable no-restricted-syntax -- this is the Alert primitive -->
<div
  role="alert"
  class={['w-full rounded-sm border px-4 py-3 text-sm', variants[variant]]}
>
  {@render children()}
</div>
<!-- eslint-enable no-restricted-syntax -->
