<!-- Change the filament of several tools at once, by the printer's change
     all: it heats every tool involved, then changes them one by one, asking
     on its screen (and in the page's alert). Each tool keeps its filament,
     changes to another (and colour), or unloads. -->
<script lang="ts">
  import { controls } from '../heating/controls.svelte';
  import { api } from '../../lib/api/client';
  import { t } from '../../lib/i18n.svelte';
  import { filamentLabel, firmwareFilament } from '../../lib/printer/filaments';
  import { notices } from '../../lib/stores/notices.svelte';
  import { Button } from '../../lib/ui/button';
  import { Checkbox } from '../../lib/ui/checkbox';
  import { Dialog } from '../../lib/ui/dialog';
  import { Input } from '../../lib/ui/input';
  import { Select } from '../../lib/ui/select';

  export interface ChangeRow {
    /// Connect's tool id: `"2"`, or `"0.3"` for an MMU slot.
    id: string;
    label: string;
    material?: string | undefined;
    color?: string | undefined;
  }

  export interface Wanted {
    filament: string;
    color?: string | undefined;
  }

  interface Props {
    open: boolean;
    rows: ChangeRow[];
    /// What to load where, picked in advance (a print's needs).
    initial?: Record<string, Wanted> | undefined;
    onclose: () => void;
    /// The printer took it.
    ondone?: (() => void) | undefined;
  }

  let { open, rows, initial = {}, onclose, ondone }: Props = $props();
  const UNLOAD = '---';
  /// Per row: change it, to what, in which colour.
  let picks = $state<
    { row: ChangeRow; on: boolean; filament: string; color: string }[]
  >([]);
  let busy = $state(false);

  $effect(() => {
    if (!open) return;
    void controls.loadFilaments();
    picks = rows.map((row) => {
      const want = initial[row.id];
      return {
        row,
        on: want !== undefined,
        filament:
          want?.filament ??
          (row.material && row.material !== UNLOAD
            ? firmwareFilament(row.material)
            : 'PLA'),
        color: want?.color ?? row.color ?? '#808080',
      };
    });
  });

  async function change() {
    busy = true;
    const items = Object.fromEntries(
      picks
        .filter((p) => p.on)
        .map((p) => [
          p.row.id,
          p.filament === UNLOAD
            ? { action: 'unload' as const }
            : {
                action: 'change' as const,
                filament: p.filament,
                color: p.color,
              },
        ]),
    );
    const { response } = await api.POST('/api/v1/filament/change-all', {
      body: { items },
    });
    busy = false;
    if (!response.ok) {
      notices.add(t('controls.refused'));
      return;
    }
    ondone?.();
    onclose();
  }
</script>

<Dialog {open} title={t('tools.changeFilaments')} size="lg" {onclose}>
  <ul class="flex flex-col divide-y" data-testid="change-tools">
    {#each picks as pick (pick.row.id)}
      {@const row = pick.row}
      <li class="flex min-h-11 flex-wrap items-center gap-2 py-1">
        <Checkbox bind:checked={pick.on}>{row.label}</Checkbox>
        <span
          class="size-4 shrink-0 rounded-sm border bg-muted"
          style:background-color={row.color}
        ></span>
        <span class="text-sm text-muted-foreground"
          >{row.material && row.material !== UNLOAD
            ? filamentLabel(row.material)
            : t('tools.none')}</span
        >
        <span class="ms-auto flex items-center gap-1">
          <Select
            bind:value={pick.filament}
            aria-label={`${t('controls.filament')} ${row.label}`}
            disabled={!pick.on}
          >
            <option value={UNLOAD}>{t('filament.unload')}</option>
            {#each controls.filaments as name (name)}
              <option value={name}>{filamentLabel(name)}</option>
            {/each}
          </Select>
          <Input
            type="color"
            class="h-11 w-12 px-1! py-1! md:h-9"
            aria-label={row.label}
            disabled={!pick.on || pick.filament === UNLOAD}
            bind:value={pick.color}
          />
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
      disabled={busy || !picks.some((p) => p.on)}
      loading={busy}
      onclick={() => void change()}>{t('tools.change')}</Button
    >
  </div>
</Dialog>
