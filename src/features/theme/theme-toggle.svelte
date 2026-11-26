<script lang="ts">
  import { Icon } from '../../lib/ui/icon';
  import { Monitor, Moon, Sun } from '../../lib/ui/icon/icons';

  import { t, type MessageKey } from '../../lib/i18n.svelte';
  import { theme } from '../../lib/theme/theme.svelte';
  import { Button } from '../../lib/ui/button';

  const ICONS = { auto: Monitor, light: Sun, dark: Moon };

  $effect(() => theme.watchSystem());
</script>

<Button
  variant="ghost"
  size="sm"
  class="size-9 px-0 text-white hover:bg-white/10 hover:text-white focus-visible:ring-offset-black max-sm:size-10"
  aria-label={t('theme.label', {
    mode: t(`theme.${theme.mode}` as MessageKey),
    next: t(`theme.${theme.next}` as MessageKey),
  })}
  title={t(`theme.${theme.mode}` as MessageKey)}
  onclick={() => (theme.mode = theme.next)}
>
  <Icon node={ICONS[theme.mode]} />
</Button>
