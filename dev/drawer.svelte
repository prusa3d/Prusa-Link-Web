<script lang="ts">
  import { FlaskConical, X } from '@lucide/svelte';

  import Panel from './panel.svelte';

  // Dev only: the mock printer's controls beside the app, so a demo can show
  // every state without a printer.
  let open = $state(new URLSearchParams(location.search).has('panel'));

  // Make room beside the app instead of covering it.
  $effect(() => {
    document.body.style.paddingInlineEnd =
      open && innerWidth >= 1024 ? '24rem' : '';
  });
</script>

{#if open}
  <aside
    aria-label="Mock printer"
    class="fixed inset-y-0 end-0 z-40 flex w-96 max-w-full flex-col border-s bg-background shadow-xl"
  >
    <div
      class="flex h-14 shrink-0 items-center justify-between border-b bg-black px-4 text-white"
    >
      <span class="flex items-center gap-2 text-sm font-semibold"
        ><FlaskConical class="size-4" />Mock printer</span
      >
      <button
        class="rounded p-1 hover:bg-white/10"
        aria-label="Close"
        onclick={() => (open = false)}><X class="size-4" /></button
      >
    </div>
    <div class="overflow-y-auto pb-6"><Panel compact /></div>
  </aside>
{:else}
  <button
    class="fixed end-4 bottom-4 z-40 flex items-center gap-2 rounded-full border border-white/25 bg-black p-3 text-sm font-medium text-white opacity-80 shadow-lg hover:opacity-100 sm:px-4 sm:py-2"
    onclick={() => (open = true)}
  >
    <FlaskConical class="size-4" /><span class="max-sm:sr-only"
      >Mock printer</span
    >
  </button>
{/if}
