<script lang="ts">
  import { t } from '../../lib/i18n.svelte';
  import { PrusaWordmark } from '../../lib/ui/logo';
  import { Icon } from '../../lib/ui/icon';
  import {
    CircleQuestionMark,
    Cloud,
    FileCode,
    ShoppingBag,
  } from '../../lib/ui/icon/icons';
  import { identity } from '../../lib/stores/identity.svelte';
  import PrinterInfo from '../printer/printer-info.svelte';

  // Places beyond this printer's local page: help, the API reference, the
  // cloud, the shop. The API's /api/version, /api/printer and /api/job answer
  // like OctoPrint's (prusa_link_api_octo.cpp in Buddy), which the hint says.
  const LINKS = [
    {
      key: 'footer.help',
      href: 'https://help.prusa3d.com/',
      icon: CircleQuestionMark,
    },
    {
      key: 'footer.api',
      href: 'https://github.com/prusa3d/Prusa-Link-Web/blob/master/spec/openapi.yaml',
      hint: 'footer.apiHint',
      icon: FileCode,
    },
    {
      key: 'footer.connect',
      href: 'https://connect.prusa3d.com/',
      icon: Cloud,
    },
    { key: 'footer.shop', href: 'https://www.prusa3d.com/', icon: ShoppingBag },
  ] as const;
</script>

<!-- Always at the bottom of the window. On phones one slim row: the
     wordmark and the links as icons (their names stay as labels). -->
<footer class="sticky bottom-0 z-10 border-t bg-background">
  <div
    class="mx-auto flex max-w-5xl items-center justify-between gap-x-6 gap-y-3 px-4 py-1 text-sm text-muted-foreground md:flex-wrap md:px-6 md:py-6"
  >
    <div class="flex items-center gap-3">
      <PrusaWordmark class="h-4 w-auto text-foreground" />
      <span class="max-md:hidden">{t('footer.copyright')}</span>
    </div>
    <div class="max-md:hidden">
      <PrinterInfo
        model={identity.model}
        firmware={identity.firmware}
        mmu={identity.mmu}
      />
    </div>
    <nav aria-label={t('footer.label')}>
      <ul class="flex gap-x-4 gap-y-1 max-md:gap-x-1 md:flex-wrap">
        {#each LINKS as link (link.href)}
          <li>
            <a
              href={link.href}
              title={'hint' in link ? t(link.hint) : t(link.key)}
              aria-label={t(link.key)}
              target="_blank"
              rel="noopener"
              class="inline-flex items-center justify-center underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none max-md:size-10 max-md:rounded-sm"
            >
              <Icon node={link.icon} class="size-5 md:hidden" />
              <span class="max-md:hidden">{t(link.key)}</span>
            </a>
          </li>
        {/each}
      </ul>
    </nav>
  </div>
</footer>
