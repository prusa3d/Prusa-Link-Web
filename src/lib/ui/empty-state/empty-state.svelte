<!-- A state with nothing to list: an icon in a soft circle, what happened,
     what to do, and the action that does it. -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  import { Icon, type IconNode } from '../icon';

  interface Props {
    icon: IconNode;
    title: string;
    body?: string | undefined;
    tone?: 'quiet' | 'fault';
    /// Renders as a live region, for states that appear on their own.
    live?: boolean;
    children?: Snippet;
  }

  let {
    icon,
    title,
    body,
    tone = 'quiet',
    live = false,
    children,
  }: Props = $props();
</script>

<div
  class="flex flex-col items-center gap-3 px-6 py-10 text-center"
  role={live ? 'status' : undefined}
>
  <div
    class={[
      'flex size-14 items-center justify-center rounded-full',
      tone === 'fault'
        ? 'bg-state-fault text-state-fault-text'
        : 'bg-muted text-muted-foreground',
    ]}
  >
    <Icon node={icon} class="size-7" />
  </div>
  <p class="text-base font-semibold">{title}</p>
  {#if body}
    <p class="max-w-xs text-sm text-muted-foreground">{body}</p>
  {/if}
  {#if children}
    <div class="mt-1 flex flex-wrap justify-center gap-2">
      {@render children()}
    </div>
  {/if}
</div>
