<script lang="ts">
  import { firmwareUpdate } from './update.svelte';
  import { t } from '../../lib/i18n.svelte';
  import { Button } from '../../lib/ui/button';
  import { Icon } from '../../lib/ui/icon';
  import { CircleArrowUp, Sparkles, X } from '../../lib/ui/icon/icons';

  interface Props {
    /// A card in the page (wide screens), or an icon in the dark header
    /// (phones).
    as: 'card' | 'icon';
  }

  let { as }: Props = $props();
  const update = $derived(firmwareUpdate.offer);
</script>

{#if update && as === 'icon'}
  <Button
    variant="ghost"
    size="sm"
    class="relative size-10 px-0 text-white hover:bg-white/10 hover:text-white focus-visible:ring-offset-black md:hidden"
    aria-label={t('firmware.available', { version: update.version })}
    onclick={() => (firmwareUpdate.open = true)}
  >
    <Icon node={CircleArrowUp} class="size-5" />
    <span class="absolute end-2 top-2 size-2 rounded-full bg-primary"></span>
  </Button>
{:else if update}
  <section
    aria-labelledby="update-title"
    class="rounded-lg flex items-start gap-3 border bg-card p-4 max-md:hidden"
  >
    <Icon node={Sparkles} class="mt-0.5 size-5 shrink-0 text-link" />
    <div class="flex min-w-0 flex-1 flex-col items-start gap-1">
      <h2 id="update-title" class="text-sm font-semibold">
        {t('firmware.available', { version: update.version })}
      </h2>
      <p class="text-sm text-muted-foreground">
        {t('firmware.current', { version: firmwareUpdate.current ?? '' })}
      </p>
      <Button
        variant="secondary"
        size="sm"
        class="mt-1"
        onclick={() => (firmwareUpdate.open = true)}
      >
        {t('firmware.how')}
      </Button>
    </div>
    <Button
      variant="ghost"
      size="sm"
      class="size-8 px-0"
      aria-label={t('firmware.dismiss')}
      onclick={() => firmwareUpdate.dismiss()}
    >
      <Icon node={X} />
    </Button>
  </section>
{/if}
