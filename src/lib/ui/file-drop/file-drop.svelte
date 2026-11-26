<script lang="ts">
  import type { Snippet } from 'svelte';

  import {
    collectDropped,
    collectFiles,
    type Picked,
  } from '../../files/collect';
  import { pickerAccept } from '../../files/filter';

  interface Props {
    /// Lit as a drop target although the drag is elsewhere on the page.
    active?: boolean;
    busy?: boolean;
    /// What the picker offers, `.gcode` and `.bgcode` unless given.
    extensions?: readonly string[];
    multiple?: boolean;
    onfiles: (picked: Picked) => void;
    children: Snippet;
  }

  let {
    active = false,
    busy = false,
    extensions,
    multiple = true,
    onfiles,
    children,
  }: Props = $props();
  let dragging = $state(false);

  // A mouse or trackpad means a desktop picker, which filters by extension
  // well. Touch-first pickers do not, so they get no filter (filter.ts).
  const accept = $derived(
    pickerAccept(globalThis.matchMedia('(pointer: fine)').matches, extensions),
  );

  async function ondrop(e: DragEvent) {
    e.preventDefault();
    // Handled here; a page-wide drop target must not upload it again.
    e.stopPropagation();
    dragging = false;
    const data = e.dataTransfer;
    if (!data) return;
    onfiles(await collectDropped(data.items, data.files));
  }
</script>

<!-- eslint-disable svelte/no-restricted-html-elements -- this is the file-drop primitive -->
<label
  class={[
    'rounded-lg flex min-h-14 cursor-pointer flex-row items-center justify-center gap-3 border-2 border-dashed bg-card p-3 text-center transition-colors hover:border-primary has-focus-visible:ring-2 has-focus-visible:ring-ring md:min-h-40 md:flex-col md:gap-1 md:p-6',
    dragging || active ? 'border-primary bg-accent' : 'border-input',
  ]}
  ondragover={(e) => {
    e.preventDefault();
    dragging = true;
  }}
  ondragleave={() => {
    dragging = false;
  }}
  ondrop={(e) => void ondrop(e)}
>
  {@render children()}
  <input
    type="file"
    {multiple}
    {accept}
    class="sr-only"
    disabled={busy}
    data-testid="file-input"
    onchange={(e) => {
      const input = e.currentTarget;
      if (input.files?.length) onfiles(collectFiles(input.files));
      input.value = '';
    }}
  />
</label>
<!-- eslint-enable svelte/no-restricted-html-elements -->
