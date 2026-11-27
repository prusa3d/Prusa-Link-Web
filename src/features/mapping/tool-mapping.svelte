<!-- Which printer slot prints which G-code filament: a row per filament the
     file uses, the slot it gets and what that means for the print, and
     backup spools (spool join) judged against the same filament. Renders
     what the resolver says (print-check.ts).
     A slot is picked in a sheet over the print dialog: the slots that print
     the filament as loaded first, then those that need a filament change,
     then those the printer refuses, with the reason; each says what picking
     it means before what it holds now. Picking a slot another filament has
     swaps them, and that row says so. Switched-off slots are left out. -->
<script lang="ts">
  import Swatch from './swatch.svelte';
  import NozzleInfo from '../status/nozzle-info.svelte';
  import { t, type MessageKey } from '../../lib/i18n.svelte';
  import { filamentLabel } from '../../lib/printer/filaments';
  import {
    choose,
    joinable,
    judge,
    prune,
    rank,
    type Option,
    type Row,
    type RowStatus,
  } from '../../lib/printer/print-check';
  import type {
    GcodeFilament,
    Mapping,
    PrinterTool,
    Severity,
  } from '../../lib/printer/tool-mapping';
  import { Button } from '../../lib/ui/button';
  import { Icon } from '../../lib/ui/icon';
  import { Badge, type Tone } from '../../lib/ui/badge';
  import { Dialog } from '../../lib/ui/dialog';
  import { ChevronRight, Link, X } from '../../lib/ui/icon/icons';

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

  /// The filament whose slot, or backup, is being picked.
  let picking = $state<{ row: Row; backup: boolean } | undefined>();

  const filaments = $derived(rows.map((r) => r.filament));
  const TONES: Record<RowStatus, Tone> = {
    match: 'done',
    colour: 'quiet',
    change: 'attention',
    empty: 'attention',
    incompatible: 'fault',
    unmapped: 'fault',
  };
  /// Nozzles every row would repeat go unsaid; the file's is in the
  /// dialog's header.
  const alike = (items: readonly (PrinterTool | GcodeFilament)[]) =>
    new Set(
      items.map((i) =>
        JSON.stringify(i, [
          'nozzle',
          'hardened',
          'abrasive',
          'highFlow',
          'highTemp',
        ]),
      ),
    ).size < 2;
  const sameNozzle = $derived(alike(slots.filter((s) => !s.disabled)));
  const material = (m: string) => (m ? filamentLabel(m) : t('mapping.unknown'));
  const GROUPS: MessageKey[] = [
    'mapping.group.ready',
    'mapping.group.change',
    'mapping.status.incompatible',
  ];
  const REASONS: Record<string, MessageKey> = {
    nozzleDiameter: 'mapping.reason.nozzle',
    nozzleHardened: 'mapping.reason.hardened',
    nozzleHighFlow: 'mapping.reason.highFlow',
  };
  /// What a slot is to filament `f`; for one the printer refuses, why.
  function outcome(
    f: GcodeFilament,
    { status, issues }: Pick<Option, 'status' | 'issues'>,
  ) {
    const issue = issues.find((i) => i.level === 'abort');
    return t(
      (issue && REASONS[issue.key]) ??
        (`mapping.status.${status}` as MessageKey),
      { mm: issue?.has ?? '', material: material(f.material) },
    );
  }
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

  function pick(slot: number) {
    if (!picking) return;
    const { row, backup } = picking;
    const from = row.filament.index;
    picking = undefined;
    if (backup) {
      set({ ...mapping, [from]: [...(mapping[from] ?? []), slot] });
      return;
    }
    const other = filaments.find(
      (f) => f.index !== from && mapping[f.index]?.[0] === slot,
    );
    moved =
      other && mapping[from]?.[0] !== undefined
        ? { filament: other.index, with: from }
        : undefined;
    set(choose(mapping, from, slot));
  }
</script>

{#snippet filament(f: GcodeFilament, nozzle: boolean)}
  <Swatch color={f.color} square />
  <span class="flex min-w-0 flex-col">
    <span class="font-semibold">{material(f.material)}</span>
    <span
      class="flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
    >
      <span class="inline-block first-letter:uppercase"
        >{t('print.filamentN', { n: f.index })}</span
      >
      {#if f.grams}· {f.grams.toFixed(1)} g{/if}
      {#if nozzle}
        <!-- The nozzle it was sliced for: abrasive wants a hardened one. -->
        <NozzleInfo
          diameter={f.nozzle}
          hardened={f.abrasive}
          highFlow={f.highFlow}
        />
      {/if}
    </span>
  </span>
{/snippet}

{#snippet loaded(slot: PrinterTool)}
  <span class="flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
    >T{slot.index} · {slot.material
      ? filamentLabel(slot.material)
      : t('mapping.unloaded')}
    {#if !sameNozzle}
      <NozzleInfo
        diameter={slot.nozzle}
        hardened={slot.hardened}
        highFlow={slot.highFlow}
        highTemp={slot.highTemp}
      />
    {/if}
  </span>
{/snippet}

{#snippet verdict(f: GcodeFilament, slot?: PrinterTool, testid?: string)}
  {@const o = slot
    ? judge(f, slot, severity)
    : { status: 'unmapped' as const, issues: [] }}
  <Badge tone={TONES[o.status]} {testid}>{outcome(f, o)}</Badge>
{/snippet}

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
          'flex flex-col gap-2 py-2',
          moved?.filament === f.index && 'bg-state-attention/40',
        ]}
        data-testid="mapping-row"
        data-filament={f.index}
        data-status={row.status}
      >
        <div class="grid items-center gap-2 sm:grid-cols-2">
          <div class="flex min-w-0 items-center gap-2">
            {@render filament(f, !alike(filaments))}
            <Icon
              node={ChevronRight}
              class="ms-auto size-4 text-muted-foreground max-sm:sr-only"
            />
          </div>
          <Button
            variant="ghost"
            class="h-auto min-h-11 justify-start gap-3 border-border! bg-background! px-2 py-1.5 text-start font-normal text-foreground!"
            aria-haspopup="dialog"
            data-testid="slot-picker"
            data-value={row.slot?.index ?? ''}
            onclick={() => (picking = { row, backup: false })}
          >
            <Swatch
              color={row.slot?.material && row.slot.color}
              tool={row.slot?.index}
            />
            <span class="flex min-w-0 flex-col items-start gap-0.5">
              {@render verdict(f, row.slot, 'row-status')}
              {#if row.slot}{@render loaded(row.slot)}{/if}
            </span>
          </Button>
        </div>
        {#if moved?.filament === f.index}
          <span class="text-xs font-semibold" data-testid="row-moved"
            >{t('mapping.swapped', { n: moved.with })}</span
          >
        {/if}
        {#each row.backups as backup (backup.slot.index)}
          <div
            class="flex items-center gap-2 ps-6"
            data-testid="mapping-backup"
            data-status={backup.status}
          >
            <Icon node={Link} class="size-4 shrink-0 text-muted-foreground" />
            <Swatch
              color={backup.slot.material && backup.slot.color}
              tool={backup.slot.index}
            />
            <span class="me-auto flex min-w-0 flex-col items-start gap-0.5">
              {@render verdict(f, backup.slot)}
              {@render loaded(backup.slot)}
            </span>
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
        {#if row.slot && joinable(f, row.slot, slots, mapping, severity).length}
          <Button
            variant="ghost"
            size="sm"
            class="self-start max-sm:h-11"
            aria-haspopup="dialog"
            onclick={() => (picking = { row, backup: true })}
            >{t('mapping.backup')}</Button
          >
        {/if}
      </li>
    {/each}
  </ul>
  {#if picking}
    {@const { row, backup } = picking}
    {@const f = row.filament}
    {@const value = backup ? undefined : row.slot?.index}
    <Dialog
      open
      title={backup
        ? t('mapping.backup')
        : t('mapping.slotFor', { n: f.index })}
      onclose={() => (picking = undefined)}
    >
      <p class="flex items-center gap-2" data-testid="picker-filament">
        {@render filament(f, true)}
      </p>
      <div class="flex flex-col gap-4" data-testid="slot-options">
        {#each rank(f, backup && row.slot ? joinable(f, row.slot, slots, mapping, severity) : slots.filter((s) => !s.disabled), severity) as group, g (g)}
          {#if group.length}
            <section class="flex flex-col gap-1" data-group={g}>
              <h4
                class="border-b py-1 text-xs font-semibold text-muted-foreground uppercase"
              >
                {t(GROUPS[g] ?? 'mapping.status.incompatible')}
              </h4>
              {#each group as o (o.slot.index)}
                {@const picked = o.slot.index === value}
                <Button
                  variant={picked ? 'secondary' : 'ghost'}
                  class="h-auto min-h-14 w-full justify-start gap-3 px-3 py-2 text-start font-normal whitespace-normal"
                  disabled={g === 2}
                  aria-pressed={picked}
                  data-slot={o.slot.index}
                  data-status={o.status}
                  onclick={() => pick(o.slot.index)}
                >
                  <Swatch
                    color={o.slot.material && o.slot.color}
                    tool={o.slot.index}
                  />
                  <span class="flex min-w-0 flex-col items-start">
                    <span
                      class={[
                        'text-base font-semibold',
                        g < 2 && 'text-foreground',
                      ]}>{outcome(f, o)}</span
                    >
                    {@render loaded(o.slot)}
                  </span>
                </Button>
              {/each}
            </section>
          {/if}
        {/each}
      </div>
    </Dialog>
  {/if}
</section>
