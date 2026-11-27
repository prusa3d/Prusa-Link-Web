<!-- Which printer tool prints which G-code filament: a line per filament the
     file uses, the tool it gets and what that means for the print in plain
     words, and backup spools (spool join) judged against the same filament.
     Filaments without a tool come last. Renders what the resolver says
     (print-check.ts).
     A tool is picked in a sheet over the print dialog: the tools that print
     the filament right away first, then those that need a filament change,
     then, folded, those the printer refuses, with the reason. Picking a tool
     another filament has takes it from that filament, which is then left
     without one; the option says so. Switched-off tools are left out. -->
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
    type Issue,
    type Option,
    type Row,
  } from '../../lib/printer/print-check';
  import type {
    GcodeFilament,
    Mapping,
    PrinterTool,
    Severity,
  } from '../../lib/printer/tool-mapping';
  import { Button } from '../../lib/ui/button';
  import { Icon } from '../../lib/ui/icon';
  import { Dialog } from '../../lib/ui/dialog';
  import { Check, Pencil, Split, X } from '../../lib/ui/icon/icons';

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

  /// The filament whose tool, or backup, is being picked.
  let picking = $state<{ row: Row; backup: boolean } | undefined>();

  const filaments = $derived(rows.map((r) => r.filament));
  const sorted = $derived(
    [...rows].sort(
      (a, b) => +(a.status === 'unmapped') - +(b.status === 'unmapped'),
    ),
  );
  const material = (m: string) => (m ? filamentLabel(m) : t('mapping.unknown'));
  const REASONS: Partial<Record<Issue['key'], MessageKey>> = {
    nozzleDiameter: 'mapping.reason.nozzle',
    nozzleHardened: 'mapping.reason.hardened',
    nozzleHighFlow: 'mapping.reason.highFlow',
  };
  const TEXT = {
    ok: 'text-state-done-text',
    change: 'text-state-attention-text',
    bad: 'text-state-fault-text',
  };

  /// What tool `slot` means for filament `f`, in plain words.
  function say(
    f: GcodeFilament,
    o: Pick<Option, 'slot' | 'status' | 'issues'>,
  ) {
    const nozzle = o.issues.find((i) => REASONS[i.key]);
    const values = {
      material: material(f.material),
      reason: nozzle
        ? t(REASONS[nozzle.key] ?? 'mapping.reason.nozzle', {
            mm: nozzle.has ?? '',
          })
        : '',
    };
    if (o.status === 'incompatible')
      return { tone: TEXT.bad, text: t('mapping.status.incompatible', values) };
    const ready = o.status === 'match' || o.status === 'colour';
    if (nozzle && ready)
      return { tone: TEXT.change, text: t('mapping.status.warn', values) };
    return {
      tone: ready ? TEXT.ok : TEXT.change,
      text: t(
        ready
          ? (`mapping.status.${o.status}` as MessageKey)
          : 'mapping.status.change',
        values,
      ),
    };
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
    set(
      backup
        ? { ...mapping, [from]: [...(mapping[from] ?? []), slot] }
        : choose(mapping, from, slot),
    );
  }
</script>

{#snippet filament(f: GcodeFilament)}
  <span class="flex min-w-0 flex-wrap items-center gap-x-2">
    <Swatch color={f.color} square />
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
  </span>
{/snippet}

{#snippet tool(slot: PrinterTool)}
  <span class="flex flex-wrap items-center gap-x-1 text-foreground"
    ><span class="font-semibold">{t('tools.name', { n: slot.index })}</span>
    · {slot.material ? filamentLabel(slot.material) : t('mapping.unloaded')}
    <NozzleInfo
      diameter={slot.nozzle}
      hardened={slot.hardened}
      highFlow={slot.highFlow}
      highTemp={slot.highTemp}
    />
  </span>
{/snippet}

<section class="flex flex-col gap-3 text-sm" data-testid="tool-mapping">
  <div class="flex flex-wrap items-center gap-2">
    <h3 class="me-auto font-semibold">{t('mapping.title')}</h3>
    <Button
      variant="secondary"
      size="sm"
      disabled={same(mapping, suggested)}
      onclick={() => (mapping = suggested)}>{t('mapping.reset')}</Button
    >
    <Button
      variant="secondary"
      size="sm"
      disabled={same(mapping, direct)}
      onclick={() => (mapping = direct)}>{t('mapping.direct')}</Button
    >
  </div>
  <ul class="flex flex-col gap-3">
    {#each sorted as row (row.filament.index)}
      {@const f = row.filament}
      {@const said = row.slot
        ? say(f, { slot: row.slot, ...judge(f, row.slot, severity) })
        : { tone: TEXT.bad, text: t('mapping.status.unmapped') }}
      <li
        class="flex flex-col gap-1"
        data-testid="mapping-row"
        data-filament={f.index}
        data-status={row.status}
      >
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span class="flex min-w-0 max-sm:basis-full sm:w-48"
            >{@render filament(f)}</span
          >
          <span class="text-muted-foreground max-sm:hidden" aria-hidden="true"
            >→</span
          >
          <span
            class="flex min-w-0 flex-1 items-center gap-2 max-sm:basis-full"
          >
            <Button
              variant="ghost"
              class="h-auto min-h-11 min-w-0 flex-1 justify-start gap-2 border-border! px-2 py-1 text-start font-normal whitespace-normal"
              aria-haspopup="dialog"
              data-testid="slot-picker"
              data-value={row.slot?.index ?? ''}
              onclick={() => (picking = { row, backup: false })}
            >
              <Swatch
                color={row.slot?.material && row.slot.color}
                tool={row.slot?.index}
              />
              <span class="flex min-w-0 flex-col items-start">
                {#if row.slot}{@render tool(row.slot)}{/if}
                <span
                  class={['font-semibold', said.tone]}
                  data-testid="row-status">{said.text}</span
                >
              </span>
              <Icon node={Pencil} class="ms-auto size-4" />
            </Button>
            {#if row.slot && joinable(f, row.slot, slots, mapping, severity).length}
              <Button
                variant="ghost"
                class="h-11 px-2"
                aria-haspopup="dialog"
                aria-label={t('mapping.backup')}
                title={t('mapping.backup')}
                onclick={() => (picking = { row, backup: true })}
                ><Icon node={Split} /><span class="max-sm:sr-only"
                  >{t('mapping.backup')}</span
                ></Button
              >
            {/if}
          </span>
        </div>
        {#each row.backups as backup (backup.slot.index)}
          {@const b = say(f, {
            slot: backup.slot,
            ...judge(f, backup.slot, severity),
          })}
          <div
            class="flex items-center gap-2 ps-6"
            data-testid="mapping-backup"
            data-status={backup.status}
          >
            <Swatch
              color={backup.slot.material && backup.slot.color}
              tool={backup.slot.index}
            />
            <span class="me-auto flex min-w-0 flex-col items-start">
              <span class="font-semibold"
                >{t('mapping.then', { n: backup.slot.index })}</span
              >
              <span class={['text-xs', b.tone]}>{b.text}</span>
            </span>
            <Button
              variant="ghost"
              class="size-11 shrink-0 px-0"
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
      </li>
    {/each}
  </ul>
  {#if picking}
    {@const { row, backup } = picking}
    {@const f = row.filament}
    {@const value = backup ? undefined : row.slot?.index}
    {@const [ready, change, refused] = rank(
      f,
      backup && row.slot
        ? joinable(f, row.slot, slots, mapping, severity)
        : slots.filter((s) => !s.disabled),
      severity,
    )}
    <Dialog
      open
      title={backup
        ? t('mapping.backup')
        : t('mapping.pickTitle', { n: f.index })}
      onclose={() => (picking = undefined)}
    >
      <p class="flex flex-col gap-2 text-sm" data-testid="picker-filament">
        {@render filament(f)}
        <span>{t('mapping.pickHint')}</span>
      </p>
      <div class="flex flex-col gap-4 text-sm" data-testid="slot-options">
        {#each [ready, change] as group, g (g)}
          {#if group.length}
            <section class="flex flex-col gap-1" data-group={g}>
              <h4
                class="border-b py-1 text-xs font-semibold text-muted-foreground uppercase"
              >
                {t(g ? 'mapping.changeFilaments' : 'mapping.status.match')}
              </h4>
              {#each group as o (o.slot.index)}
                {@const picked = o.slot.index === value}
                {@const said = say(f, o)}
                {@const owner = backup
                  ? undefined
                  : filaments.find(
                      (x) =>
                        x.index !== f.index &&
                        mapping[x.index]?.[0] === o.slot.index,
                    )}
                <Button
                  variant="ghost"
                  class={[
                    'h-auto min-h-14 w-full justify-start gap-3 px-2 py-2 text-start font-normal whitespace-normal',
                    picked && 'bg-accent',
                  ]}
                  aria-pressed={picked}
                  data-slot={o.slot.index}
                  data-status={o.status}
                  onclick={() => pick(o.slot.index)}
                >
                  <Swatch
                    color={o.slot.material && o.slot.color}
                    tool={o.slot.index}
                    selected={picked}
                  />
                  <span class="flex min-w-0 flex-col items-start">
                    <span class={['text-base font-semibold', said.tone]}
                      >{said.text}</span
                    >
                    {@render tool(o.slot)}
                    {#if owner}
                      <span
                        class="text-xs text-state-attention-text"
                        data-testid="taken-by"
                        >{t('mapping.takenBy', { n: owner.index })}</span
                      >
                    {/if}
                  </span>
                  {#if picked}<Icon
                      node={Check}
                      class="ms-auto size-5 text-primary"
                    />{/if}
                </Button>
              {/each}
            </section>
          {/if}
        {/each}
        {#if refused.length}
          <section
            class="flex flex-col gap-1 text-muted-foreground"
            data-group="2"
          >
            <h4 class="border-b py-1 text-xs font-semibold uppercase">
              {t('mapping.status.incompatible', { reason: refused.length })}
            </h4>
            {#each refused as o (o.slot.index)}
              <div
                class="flex items-center gap-2 py-1 text-xs"
                aria-disabled="true"
                data-slot={o.slot.index}
                data-status={o.status}
              >
                <span class="font-semibold"
                  >{t('tools.name', { n: o.slot.index })}</span
                >
                <span>{say(f, o).text}</span>
              </div>
            {/each}
          </section>
        {/if}
      </div>
    </Dialog>
  {/if}
</section>
