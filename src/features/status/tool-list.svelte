<!-- Every tool of a printer with several (PrusaLink 2): its material and
     colour, its nozzle reading, the one in use marked. -->
<script lang="ts">
  import HeaterRow from './heater-row.svelte';

  import { t } from '../../lib/i18n.svelte';
  import { filamentLabel } from '../../lib/printer/filaments';
  import type { ToolRow } from '../../lib/printer/tools';
  import { Badge } from '../../lib/ui/badge';
  import { Button } from '../../lib/ui/button';

  interface Props {
    tools: ToolRow[];
    /// Changes the filament of a tool; unset while the printer cannot.
    onfilament?: ((tool: number) => void) | undefined;
  }

  let { tools, onfilament }: Props = $props();
</script>

<ul class="flex flex-col divide-y" data-testid="tool-list">
  {#each tools as tool (tool.index)}
    <li
      class={[
        'flex items-center gap-2 border-s-4 ps-2',
        tool.active ? 'border-primary' : 'border-transparent',
      ]}
      data-testid="tool-row"
      data-active={tool.active}
    >
      <span
        class="size-3 shrink-0 rounded-full border bg-muted"
        style:background-color={tool.color}
      ></span>
      <span class="w-12 shrink-0 truncate text-sm text-muted-foreground"
        >{tool.material ? filamentLabel(tool.material) : '—'}</span
      >
      <div class="min-w-0 flex-1">
        <HeaterRow
          kind="nozzle"
          label={`T${String(tool.index + 1)}`}
          current={tool.temp}
          target={tool.target}
        />
      </div>
      {#if tool.active}
        <Badge tone="active">{t('status.active')}</Badge>
      {/if}
      {#if onfilament}
        <Button
          variant="ghost"
          size="sm"
          class="max-sm:h-11"
          aria-label={`${t('filament.title')} T${String(tool.index + 1)}`}
          onclick={() => onfilament(tool.index)}
          >{t('filament.changeShort')}</Button
        >
      {/if}
    </li>
  {/each}
</ul>
