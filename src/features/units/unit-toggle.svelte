<script lang="ts">
  import { t } from '../../lib/i18n.svelte';
  import { setTemperatureUnit, temperatureUnit } from '../../lib/units.svelte';
  import { Button } from '../../lib/ui/button';

  const next = $derived(temperatureUnit() === 'C' ? 'F' : 'C');
</script>

<Button
  variant="ghost"
  size="sm"
  class="size-9 px-0 text-sm font-semibold text-white hover:bg-white/10 hover:text-white focus-visible:ring-offset-black max-sm:size-10"
  aria-label={t('units.label', {
    unit: `°${temperatureUnit()}`,
    next: `°${next}`,
  })}
  title={t('units.label', { unit: `°${temperatureUnit()}`, next: `°${next}` })}
  onclick={() => setTemperatureUnit(next)}
>
  °{temperatureUnit()}
</Button>
