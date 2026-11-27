<!-- Which printer slot prints which G-code filament: a row per filament the
     file uses, with a slot picker that says what each slot is to it (a
     match, another colour, a filament to change, or not possible and why),
     and backup spools from slots that hold the same filament on the same
     nozzle. Renders what the resolver says (print-check.ts). -->
<script lang="ts">
  import { t, type MessageKey } from '../../lib/i18n.svelte';
  import { filamentLabel } from '../../lib/printer/filaments';
  import {
    choose,
    joinable,
    type Row,
    statusOf,
  } from '../../lib/printer/print-check';
  import type {
    Mapping,
    PrinterTool,
    Severity,
  } from '../../lib/printer/tool-mapping';
  import { Button } from '../../lib/ui/button';
  import { Icon } from '../../lib/ui/icon';
  import { Link, X } from '../../lib/ui/icon/icons';
  import { Select } from '../../lib/ui/select';

  interface Props {
    rows: Row[];
    slots: readonly PrinterTool[];
    mapping: Mapping;
    severity: Severity;
  }

  let { rows, slots, mapping = $bindable(), severity }: Props = $props();
  const present = $derived(slots.filter((s) => !s.disabled));
  const name = (slot: PrinterTool) =>
    `T${String(slot.index)} · ${slot.material ? filamentLabel(slot.material) : t('mapping.unloaded')}`;
  const status = (row: Row, slot: PrinterTool) =>
    t(
      `mapping.status.${statusOf(row.filament, slot, severity)}` as MessageKey,
      {
        material: filamentLabel(row.filament.material),
      },
    );
</script>

<section class="flex flex-col gap-1 text-sm" data-testid="tool-mapping">
  <h3 class="font-semibold">{t('mapping.title')}</h3>
  <ul class="flex flex-col divide-y border-y">
    {#each rows as row (row.filament.index)}
      {@const f = row.filament}
      {@const [first, ...backups] = mapping[f.index] ?? []}
      <li
        class="flex flex-col gap-1 py-2"
        data-testid="mapping-row"
        data-filament={f.index}
        data-status={row.status}
      >
        <div class="flex flex-wrap items-center gap-2">
          <span class="w-4">{f.index}.</span>
          <span
            class="size-4 shrink-0 rounded-sm border bg-muted"
            style:background-color={f.color}
          ></span>
          <span class="font-semibold">{filamentLabel(f.material)}</span>
          {#if f.grams}<span class="text-muted-foreground"
              >{f.grams.toFixed(1)} g</span
            >{/if}
          {#if f.nozzle}<span class="text-muted-foreground">{f.nozzle} mm</span
            >{/if}
          <span class="text-xs text-muted-foreground" data-testid="row-status"
            >{t(`mapping.status.${row.status}` as MessageKey, {
              material: filamentLabel(f.material),
            })}</span
          >
        </div>
        <div class="flex flex-wrap items-center gap-2 ps-6">
          <Select
            value={first === undefined ? '' : String(first)}
            aria-label={t('mapping.slotFor', { n: f.index })}
            class="min-w-0 flex-1"
            onchange={(e: Event & { currentTarget: HTMLSelectElement }) => {
              const v = e.currentTarget.value;
              mapping = choose(mapping, f.index, v ? Number(v) : undefined);
            }}
          >
            <option value="">{t('mapping.choose')}</option>
            {#each present as slot (slot.index)}
              {@const s = statusOf(f, slot, severity)}
              <option value={String(slot.index)} disabled={s === 'incompatible'}
                >{name(slot)} — {status(row, slot)}</option
              >
            {/each}
          </Select>
          {#if row.slot}
            {@const offer = joinable(
              row.slot,
              present,
              Object.values(mapping).flat(),
            )}
            {#if offer.length}
              <Select
                value=""
                aria-label={t('mapping.backup')}
                onchange={(e: Event & { currentTarget: HTMLSelectElement }) => {
                  const v = Number(e.currentTarget.value);
                  if (v)
                    mapping = {
                      ...mapping,
                      [f.index]: [...(mapping[f.index] ?? []), v],
                    };
                }}
              >
                <option value="">{t('mapping.backup')}</option>
                {#each offer as slot (slot.index)}
                  <option value={String(slot.index)}>{name(slot)}</option>
                {/each}
              </Select>
            {/if}
          {/if}
        </div>
        {#each backups as backup (backup)}
          {@const slot = slots.find((s) => s.index === backup)}
          <div
            class="flex items-center gap-1 ps-6 text-xs text-muted-foreground"
            data-testid="mapping-backup"
          >
            <Icon node={Link} class="size-3" />
            {t('mapping.join')}: {slot ? name(slot) : `T${String(backup)}`}
            <Button
              variant="ghost"
              size="sm"
              class="size-7 px-0"
              aria-label={t('mapping.removeBackup')}
              onclick={() =>
                (mapping = {
                  ...mapping,
                  [f.index]: (mapping[f.index] ?? []).filter(
                    (x) => x !== backup,
                  ),
                })}><Icon node={X} /></Button
            >
          </div>
        {/each}
      </li>
    {/each}
  </ul>
</section>
