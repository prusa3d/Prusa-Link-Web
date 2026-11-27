<!-- Which printer slot prints which G-code filament: a row per filament the
     file uses, with a slot picker that says what each slot is to it, and
     backup spools (spool join) judged against the same filament. Picking a
     slot another filament has swaps them, and that row says so. Renders
     what the resolver says (print-check.ts). -->
<script lang="ts">
  import SlotPicker from './slot-picker.svelte';
  import NozzleInfo from '../status/nozzle-info.svelte';
  import { t, type MessageKey } from '../../lib/i18n.svelte';
  import { filamentLabel } from '../../lib/printer/filaments';
  import {
    choose,
    joinable,
    prune,
    type Row,
  } from '../../lib/printer/print-check';
  import type {
    Mapping,
    PrinterTool,
    Severity,
  } from '../../lib/printer/tool-mapping';
  import { Button } from '../../lib/ui/button';
  import { Icon } from '../../lib/ui/icon';
  import { Link, X } from '../../lib/ui/icon/icons';

  interface Props {
    rows: Row[];
    slots: readonly PrinterTool[];
    mapping: Mapping;
    severity: Severity;
    /// The page's suggestion, to go back to.
    suggested: Mapping;
  }

  let {
    rows,
    slots,
    mapping = $bindable(),
    severity,
    suggested,
  }: Props = $props();
  /// The filament a swap moved, and the one it was swapped with.
  let moved = $state<{ filament: number; with: number } | undefined>();

  const filaments = $derived(rows.map((r) => r.filament));
  const material = (m: string) => (m ? filamentLabel(m) : t('mapping.unknown'));
  const direct = $derived(
    Object.fromEntries<number[]>(
      filaments
        .filter((f) => slots.some((s) => s.index === f.index && !s.disabled))
        .map((f) => [f.index, [f.index]]),
    ),
  );
  const same = (a: Mapping, b: Mapping) =>
    JSON.stringify(a) === JSON.stringify(b);

  function set(next: Mapping) {
    mapping = prune(next, filaments, slots, severity);
  }

  function pick(from: number, slot: number | undefined) {
    const other =
      slot === undefined
        ? undefined
        : filaments.find(
            (f) => f.index !== from && mapping[f.index]?.[0] === slot,
          );
    moved =
      other && mapping[from]?.[0] !== undefined
        ? { filament: other.index, with: from }
        : undefined;
    set(choose(mapping, from, slot));
  }
</script>

<section class="flex flex-col gap-1 text-sm" data-testid="tool-mapping">
  <div class="flex flex-wrap items-center gap-2">
    <h3 class="me-auto font-semibold">{t('mapping.title')}</h3>
    <Button
      variant="ghost"
      size="sm"
      disabled={same(mapping, suggested)}
      onclick={() => {
        moved = undefined;
        mapping = suggested;
      }}>{t('mapping.reset')}</Button
    >
    <Button
      variant="ghost"
      size="sm"
      disabled={same(mapping, direct)}
      onclick={() => {
        moved = undefined;
        mapping = direct;
      }}>{t('mapping.direct')}</Button
    >
  </div>
  <ul class="flex flex-col divide-y border-y">
    {#each rows as row (row.filament.index)}
      {@const f = row.filament}
      <li
        class={[
          'flex flex-col gap-1 py-2',
          moved?.filament === f.index && 'bg-state-attention/40',
        ]}
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
          <span class="font-semibold">{material(f.material)}</span>
          {#if f.grams}<span class="text-muted-foreground"
              >{f.grams.toFixed(1)} g</span
            >{/if}
          <!-- The nozzle it was sliced for: abrasive wants a hardened one. -->
          <NozzleInfo
            diameter={f.nozzle}
            hardened={f.abrasive}
            highFlow={f.highFlow}
          />
          <span class="text-xs text-muted-foreground" data-testid="row-status"
            >{t(`mapping.status.${row.status}` as MessageKey, {
              material: material(f.material),
            })}</span
          >
          {#if moved?.filament === f.index}
            <span class="text-xs font-semibold" data-testid="row-moved"
              >{t('mapping.swapped', { n: moved.with })}</span
            >
          {/if}
        </div>
        <div class="flex flex-wrap items-center gap-2 ps-6">
          <SlotPicker
            filament={f}
            {slots}
            {severity}
            value={row.slot?.index}
            label={t('mapping.slotFor', { n: f.index })}
            none={t('mapping.choose')}
            onpick={(slot: number | undefined) => pick(f.index, slot)}
          />
        </div>
        {#each row.backups as backup (backup.slot.index)}
          <div
            class="flex items-center gap-2 ps-6"
            data-testid="mapping-backup"
            data-status={backup.status}
          >
            <Icon node={Link} class="size-4 shrink-0 text-muted-foreground" />
            <span
              class="size-4 shrink-0 rounded-full border bg-muted"
              style:background-color={backup.slot.color}
            ></span>
            <span class="font-semibold">T{backup.slot.index}</span>
            <span
              >{backup.slot.material
                ? filamentLabel(backup.slot.material)
                : t('mapping.unloaded')}</span
            >
            <span class="me-auto text-xs text-muted-foreground"
              >{t(`mapping.status.${backup.status}` as MessageKey, {
                material: material(f.material),
              })}</span
            >
            <Button
              variant="ghost"
              size="sm"
              class="size-9 shrink-0 px-0"
              aria-label={t('mapping.removeBackup')}
              onclick={() =>
                set({
                  ...mapping,
                  [f.index]: (mapping[f.index] ?? []).filter(
                    (x) => x !== backup.slot.index,
                  ),
                })}><Icon node={X} /></Button
            >
          </div>
        {/each}
        {#if row.slot}
          {@const offer = joinable(f, row.slot, slots, mapping, severity)}
          {#if offer.length}
            <div class="flex items-center gap-2 ps-6">
              <Icon node={Link} class="size-4 shrink-0 text-muted-foreground" />
              <SlotPicker
                filament={f}
                slots={offer}
                {severity}
                value={undefined}
                label={t('mapping.backup')}
                placeholder={t('mapping.backup')}
                onpick={(slot: number | undefined) => {
                  if (slot !== undefined)
                    set({
                      ...mapping,
                      [f.index]: [...(mapping[f.index] ?? []), slot],
                    });
                }}
              />
            </div>
          {/if}
        {/if}
      </li>
    {/each}
  </ul>
</section>
