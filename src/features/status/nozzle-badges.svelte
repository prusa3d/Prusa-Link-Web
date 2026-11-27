<!-- What a nozzle is, as Prusa Connect marks it: HF for high flow, HT for a
     high-temperature hotend; Connect has no letters for hardened, so a
     shield. -->
<script lang="ts">
  import { t } from '../../lib/i18n.svelte';
  import { Icon } from '../../lib/ui/icon';
  import { Shield } from '../../lib/ui/icon/icons';

  interface Props {
    hardened?: boolean | undefined;
    highFlow?: boolean | undefined;
    highTemp?: boolean | undefined;
  }

  let { hardened, highFlow, highTemp }: Props = $props();
</script>

{#snippet badge(text: string, title: string)}
  <abbr
    {title}
    class="rounded-xs border px-0.5 text-xs leading-none font-semibold no-underline"
    >{text}</abbr
  >
{/snippet}

{#if highFlow}{@render badge('HF', t('nozzle.highFlow'))}{/if}
{#if highTemp}{@render badge('HT', t('nozzle.highTemp'))}{/if}
{#if hardened}
  <span title={t('nozzle.hardened')} class="inline-flex"
    ><Icon node={Shield} class="size-3" /><span class="sr-only"
      >{t('nozzle.hardened')}</span
    ></span
  >
{/if}
