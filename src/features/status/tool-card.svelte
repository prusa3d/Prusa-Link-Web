<!-- What is in a tool: the material in a circle, the nozzle, and the
     filament actions. One per tool once PrusaLink reports every tool. -->
<script lang="ts">
  import { t } from '../../lib/i18n.svelte';
  import { Button } from '../../lib/ui/button';

  interface Props {
    label: string;
    /// The material type, e.g. "PETG"; unset when nothing is loaded.
    material?: string | undefined;
    /// Shown instead of a material when the printer cannot tell (no tool
    /// picked on a toolchanger).
    note?: string | undefined;
    nozzle?: number | undefined;
    onchange?: (() => void) | undefined;
    onunload?: (() => void) | undefined;
  }

  let { label, material, note, nozzle, onchange, onunload }: Props = $props();
</script>

<div class="flex items-center gap-3 border-b pb-3" data-testid="tool-card">
  <div
    class="grid size-14 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold"
    data-testid="tool-material"
  >
    {material ?? '—'}
  </div>
  <div class="min-w-0 flex-1">
    <p class="text-sm font-medium">{label}</p>
    <p class="truncate text-sm text-muted-foreground">
      {note ?? (material ? '' : t('filament.none'))}
      {#if nozzle}{t('tool.nozzle', { size: nozzle })}{/if}
    </p>
  </div>
  {#if onchange}
    <div class="flex shrink-0 flex-col gap-1.5">
      <Button
        variant="secondary"
        size="sm"
        class="max-sm:h-11"
        onclick={onchange}
      >
        {material ? t('filament.changeShort') : t('filament.loadWhich')}
      </Button>
      {#if material && onunload}
        <Button
          variant="secondary"
          size="sm"
          class="max-sm:h-11"
          onclick={onunload}
        >
          {t('filament.unload')}
        </Button>
      {/if}
    </div>
  {/if}
</div>
