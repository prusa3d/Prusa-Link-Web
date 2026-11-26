<script lang="ts">
  import { t } from '../../lib/i18n.svelte';
  import { PrusaWordmark } from '../../lib/ui/logo';
  import { identity } from '../../lib/stores/identity.svelte';
  import PrinterInfo from '../printer/printer-info.svelte';

  // Places beyond this printer's local page: help, the API reference, the
  // cloud, the shop. The API's /api/version, /api/printer and /api/job answer
  // like OctoPrint's (prusa_link_api_octo.cpp in Buddy), which the hint says.
  const LINKS = [
    { key: 'footer.help', href: 'https://help.prusa3d.com/' },
    {
      key: 'footer.api',
      href: 'https://github.com/prusa3d/Prusa-Link-Web/blob/master/spec/openapi.yaml',
      hint: 'footer.apiHint',
    },
    { key: 'footer.connect', href: 'https://connect.prusa3d.com/' },
    { key: 'footer.shop', href: 'https://www.prusa3d.com/' },
  ] as const;
</script>

<footer class="border-t bg-background md:sticky md:bottom-0 md:z-10">
  <div
    class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-6 text-sm text-muted-foreground md:px-6"
  >
    <div class="flex items-center gap-3">
      <PrusaWordmark class="h-4 w-auto text-foreground" />
      <span>{t('footer.copyright')}</span>
    </div>
    <PrinterInfo
      model={identity.model}
      firmware={identity.firmware}
      mmu={identity.mmu}
    />
    <nav aria-label={t('footer.label')}>
      <ul class="flex flex-wrap gap-x-4 gap-y-1">
        {#each LINKS as link (link.href)}
          <li>
            <a
              href={link.href}
              title={'hint' in link ? t(link.hint) : undefined}
              target="_blank"
              rel="noopener"
              class="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:min-h-0"
              >{t(link.key)}</a
            >
          </li>
        {/each}
      </ul>
    </nav>
  </div>
</footer>
