<!-- A modal on the native <dialog>: the browser traps focus, closes it on
     Escape and returns focus to what opened it. -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    open: boolean;
    title: string;
    onclose: () => void;
    children: Snippet;
  }

  let { open, title, onclose, children }: Props = $props();
  let element: HTMLDialogElement | undefined = $state();
  const id = $props.id();

  $effect(() => {
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  });
</script>

<!-- eslint-disable svelte/no-restricted-html-elements -- this is the Dialog primitive -->
<dialog
  bind:this={element}
  aria-labelledby="{id}-title"
  {onclose}
  class="rounded-lg m-auto max-h-dvh w-full max-w-md overflow-y-auto border bg-card p-0 text-card-foreground backdrop:bg-black/50 max-sm:mb-0 max-sm:max-w-full max-sm:rounded-b-none"
>
  <div class="flex flex-col gap-4 p-5">
    <h2 id="{id}-title" class="text-lg font-semibold break-words">{title}</h2>
    {@render children()}
  </div>
</dialog>
<!-- eslint-enable svelte/no-restricted-html-elements -->
