<!-- The printer's picture across the top of its card, edge to edge: the
     artwork's own square canvas, uncropped. -->
<script lang="ts">
  import { Icon } from '../../lib/ui/icon';
  import { Printer } from '../../lib/ui/icon/icons';

  import type { Model } from '../../lib/printer/models';
  import { pictureFor } from '../../lib/printer/picture';

  interface Props {
    model: Model | undefined;
    /// Draw the printer with its MMU3, where there is such a picture.
    mmu?: boolean;
  }

  let { model, mmu = false }: Props = $props();

  const image = $derived(pictureFor(model?.variant, mmu));
</script>

{#if image}
  <div class="rounded-t-lg -mx-4 -mt-4 overflow-hidden dark:bg-white/90">
    <img
      src={image}
      alt={model?.name ?? ''}
      class="block h-auto w-full"
      data-testid="printer-image"
    />
  </div>
{:else}
  <div
    class="rounded-lg mx-auto flex h-32 w-full items-center justify-center bg-muted text-muted-foreground"
  >
    <Icon node={Printer} class="size-12" />
  </div>
{/if}
