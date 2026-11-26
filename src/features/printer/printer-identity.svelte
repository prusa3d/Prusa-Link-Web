<!-- The printer's picture, large, at the top of its card. -->
<script lang="ts">
  import { Icon } from '../../lib/ui/icon';
  import { Printer } from '../../lib/ui/icon/icons';

  import type { Model } from '../../lib/printer/models';
  import { pictureFor } from '../../lib/printer/picture';

  interface Props {
    model: Model | undefined;
  }

  let { model }: Props = $props();

  const image = $derived(pictureFor(model?.variant));
</script>

{#if image}
  <img
    src={image}
    alt={model?.name ?? ''}
    class="rounded-lg mx-auto max-h-56 w-full object-contain dark:bg-white/90 dark:p-2"
    data-testid="printer-image"
  />
{:else}
  <div
    class="rounded-lg mx-auto flex h-32 w-full items-center justify-center bg-muted text-muted-foreground"
  >
    <Icon node={Printer} class="size-12" />
  </div>
{/if}
