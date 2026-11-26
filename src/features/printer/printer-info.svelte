<!-- The printer's model and firmware, in the footer. -->
<script lang="ts">
  import { t } from '../../lib/i18n.svelte';
  import type { Model } from '../../lib/printer/models';

  interface Props {
    model: Model | undefined;
    firmware?: string | undefined;
  }

  let { model, firmware }: Props = $props();
</script>

{#if model !== undefined || firmware !== undefined}
  <p class="flex flex-wrap items-center gap-x-1.5" data-testid="printer-info">
    {#if model}<span>{model.name}</span>{/if}
    {#if model && firmware}<span aria-hidden="true">·</span>{/if}
    {#if firmware}<span
        >{t('firmware.version', {
          version: firmware.replace(/\+.*$/, ''),
        })}</span
      >{/if}
  </p>
{/if}
