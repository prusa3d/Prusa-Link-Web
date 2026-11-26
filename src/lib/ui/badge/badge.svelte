<script lang="ts">
  import type { Snippet } from 'svelte';

  import { tones, type Tone } from './tones';

  interface Props {
    tone?: Tone;
    size?: 'sm' | 'md';
    children: Snippet;
    testid?: string;
  }

  let { tone = 'quiet', size = 'sm', children, testid }: Props = $props();
</script>

<!-- Classes from @prusa/connect-ui's Badge state variants. -->
<span
  data-testid={testid}
  class={[
    'inline-flex w-fit shrink-0 items-center gap-1.5 rounded-sm border border-l-4 font-semibold tracking-wide uppercase',
    size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2 py-1 text-xs',
    tones[tone],
  ]}
>
  {@render children()}
</span>
