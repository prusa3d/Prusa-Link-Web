<!-- Preheat on a printer with several tools: which tools, each for its
     loaded filament (a picker for an empty one), and the bed with them. A
     printer with one heated toolhead (the INDX) heats the picked tool only. -->
<script lang="ts">
  import { controls } from '../heating/controls.svelte';
  import { t } from '../../lib/i18n.svelte';
  import { filamentLabel, firmwareFilament } from '../../lib/printer/filaments';
  import type { ToolRow } from '../../lib/printer/tools';
  import { notices } from '../../lib/stores/notices.svelte';
  import { Button } from '../../lib/ui/button';
  import { Checkbox } from '../../lib/ui/checkbox';
  import { Dialog } from '../../lib/ui/dialog';
  import { Select } from '../../lib/ui/select';

  interface Props {
    open: boolean;
    tools: ToolRow[];
    /// Every tool heats on its own (per_tool_heating).
    perTool: boolean;
    onclose: () => void;
  }

  let { open, tools, perTool, onclose }: Props = $props();
  const rows = $derived(perTool ? tools : tools.filter((x) => x.active));
  const loaded = (tool: ToolRow) =>
    tool.material && tool.material !== '---' ? tool.material : undefined;
  /// Per row: heat it, and for what when nothing is loaded.
  let picks = $state<{ tool: ToolRow; on: boolean; filament: string }[]>([]);

  $effect(() => {
    if (!open) return;
    void controls.loadFilaments();
    picks = rows.map((tool) => ({ tool, on: !!loaded(tool), filament: 'PLA' }));
  });

  async function heat() {
    let ok = true;
    for (const { tool, filament } of picks.filter((p) => p.on)) {
      const name = firmwareFilament(loaded(tool) ?? filament);
      ok &&= await controls.preheat(name, perTool ? tool.index : undefined);
    }
    if (!ok) notices.add(t('controls.refused'));
    onclose();
  }
</script>

<Dialog {open} title={t('tools.preheatTitle')} {onclose}>
  <p class="text-sm text-muted-foreground">{t('tools.preheatBody')}</p>
  <ul class="flex flex-col divide-y" data-testid="preheat-tools">
    {#each picks as pick (pick.tool.index)}
      {@const filament = loaded(pick.tool)}
      <li class="flex min-h-11 items-center gap-2">
        <Checkbox bind:checked={pick.on}
          >{t('tools.name', { n: pick.tool.index + 1 })}</Checkbox
        >
        <span class="ms-auto text-sm">
          {#if filament}
            {filamentLabel(filament)}
          {:else}
            <Select
              bind:value={pick.filament}
              aria-label={t('controls.filament')}
            >
              {#each controls.filaments as name (name)}
                <option value={name}>{filamentLabel(name)}</option>
              {/each}
            </Select>
          {/if}
        </span>
      </li>
    {/each}
  </ul>
  <div class="flex flex-wrap justify-end gap-2 max-sm:[&>*]:flex-1">
    <Button variant="secondary" size="lg" onclick={onclose}
      >{t('upload.cancel')}</Button
    >
    <Button
      size="lg"
      disabled={controls.busy || !picks.some((p) => p.on)}
      loading={controls.busy}
      onclick={() => void heat()}>{t('controls.preheat')}</Button
    >
  </div>
</Dialog>
