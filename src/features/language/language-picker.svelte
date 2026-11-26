<script lang="ts">
  import {
    LANGUAGES,
    language,
    setLanguage,
    t,
    type Language,
  } from '../../lib/i18n.svelte';
  import { Icon } from '../../lib/ui/icon';
  import { Languages } from '../../lib/ui/icon/icons';
  import { Select } from '../../lib/ui/select';
</script>

<!-- The globe is the face; the select over it, transparent, does the work. -->
<div
  class="relative flex size-9 items-center justify-center rounded-sm text-white focus-within:ring-2 focus-within:ring-ring hover:bg-white/10 max-sm:size-10"
  title={t('language.label')}
>
  <Icon node={Languages} />
  <Select
    class="absolute inset-0 size-full opacity-0"
    aria-label={t('language.label')}
    value={language()}
    onchange={(e: Event & { currentTarget: HTMLSelectElement }) =>
      setLanguage(e.currentTarget.value as Language)}
  >
    {#each Object.entries(LANGUAGES) as [code, name] (code)}
      <option value={code} lang={code}>{name}</option>
    {/each}
  </Select>
</div>
