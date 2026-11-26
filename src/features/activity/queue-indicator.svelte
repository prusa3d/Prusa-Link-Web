<!-- In the header: PrusaLink is talking to the printer, and how many more
     requests wait their turn. Quiet when idle; shown only after a moment, so
     a quick poll does not make it flicker. -->
<script lang="ts">
  import { queueState } from '../../lib/api/queue.svelte';
  import { t } from '../../lib/i18n.svelte';
  import { Spinner } from '../../lib/ui/spinner';

  const busy = $derived(queueState().running + queueState().waiting);
  let shown = $state(false);
  $effect(() => {
    if (!busy) {
      shown = false;
      return;
    }
    const timer = setTimeout(() => (shown = true), 600);
    return () => {
      clearTimeout(timer);
    };
  });
</script>

{#if shown && busy}
  <span
    class="flex items-center gap-1 px-1 text-xs text-white/80 tabular-nums"
    title={t('queue.label', { count: busy })}
    data-testid="queue-indicator"
  >
    <Spinner class="size-3.5" />
    {#if busy > 1}{busy}{/if}
    <span class="sr-only">{t('queue.label', { count: busy })}</span>
  </span>
{/if}
