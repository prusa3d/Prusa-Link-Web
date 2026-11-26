<!-- Which printer slot prints which G-code filament, as Prusa Connect's
     start-print tool mapping (connect-ui ToolMapping): G-code filaments on
     the left, each spanning the slots it maps to, lines between, and every
     printer slot on the right, the mapped ones first. Assign slot puts the
     slots' actions (Assign slot, Replace, Spool join, Remove mapping) on the
     right; a filament can also be dragged onto a slot, or a mapped slot onto
     another filament. The page suggests a mapping; all of it can change. -->
<script lang="ts">
  import MappingLines from './mapping-lines.svelte';

  import { t, type MessageKey } from '../../lib/i18n.svelte';
  import { filamentLabel } from '../../lib/printer/filaments';
  import {
    fit,
    type GcodeFilament,
    type Mapping,
    type PrinterTool,
    type Severity,
  } from '../../lib/printer/tool-mapping';
  import { Badge } from '../../lib/ui/badge';
  import { Button } from '../../lib/ui/button';
  import { TelemetryIcon } from '../../lib/ui/telemetry-icon';

  interface Props {
    filaments: GcodeFilament[];
    slots: readonly PrinterTool[];
    mapping: Mapping;
    severity: Severity;
    /// Has the printer load a mapped slot with its G-code filament.
    onchangefilament?: ((slot: number) => void) | undefined;
  }

  let {
    filaments,
    slots,
    mapping = $bindable(),
    severity,
    onchangefilament,
  }: Props = $props();
  let assigning = $state<number | undefined>();
  let over = $state<string | undefined>();

  const TONE = {
    exact: 'done',
    similar: 'active',
    material: 'attention',
    nozzle: 'attention',
    refused: 'fault',
  } as const;
  /// Every row is as tall, so the lines meet the slots they join.
  const ROW = '4rem';

  // Connect's order: the mappings with fewer slots first, then the
  // unmapped filaments; on the right the mapped slots in that order, then
  // the rest.
  const layout = $derived.by(() => {
    const mapped = filaments
      .filter((f) => mapping[f.index]?.length)
      .sort(
        (a, b) =>
          (mapping[a.index]?.length ?? 0) - (mapping[b.index]?.length ?? 0),
      );
    let row = 1;
    const left = [];
    for (const f of mapped) {
      const span = mapping[f.index]?.length ?? 1;
      left.push({ f, row, span, mapped: true });
      row += span;
    }
    for (const f of filaments.filter((x) => !mapping[x.index]?.length))
      left.push({ f, row: row++, span: 1, mapped: false });
    const order = mapped.flatMap((f) => mapping[f.index] ?? []);
    // An empty dock is no slot.
    const present = slots.filter((s) => !s.disabled);
    const right = [
      ...order.flatMap((i) => present.filter((s) => s.index === i)),
      ...present.filter((s) => !order.includes(s.index)),
    ];
    return { left, right };
  });

  const ownerOf = (slot: number) =>
    filaments.find((f) => mapping[f.index]?.includes(slot));

  function set(from: number, to: number[]) {
    const next: Mapping = {};
    for (const [f, tools] of Object.entries(mapping)) {
      const left = tools.filter((x) => !to.includes(x));
      if (left.length && Number(f) !== from) next[Number(f)] = left;
    }
    if (to.length) next[from] = to;
    mapping = next;
  }

  const usable = (f: GcodeFilament | undefined, slot: PrinterTool) =>
    !!f && !!slot.material && fit(f, slot, severity) !== 'refused';

  function drop(e: DragEvent, target: { filament?: number; slot?: number }) {
    e.preventDefault();
    over = undefined;
    const [kind, value] = (e.dataTransfer?.getData('text/plain') ?? '').split(
      ':',
    );
    const n = Number(value);
    if (kind === 'f' && target.slot !== undefined) {
      const slot = layout.right.find((s) => s.index === target.slot);
      const f = filaments.find((x) => x.index === n);
      if (slot && usable(f, slot)) set(n, [target.slot]);
    } else if (kind === 's' && target.filament !== undefined) {
      const slot = layout.right.find((s) => s.index === n);
      const f = filaments.find((x) => x.index === target.filament);
      if (slot && usable(f, slot)) set(target.filament, [n]);
    }
  }

  const drag = (e: DragEvent, what: string) => {
    e.dataTransfer?.setData('text/plain', what);
  };
  const allow = (e: DragEvent, key: string) => {
    e.preventDefault();
    over = key;
  };
</script>

{#snippet material(name: string | undefined, color?: string, nozzle?: number)}
  <span
    class={['size-4 shrink-0 rounded-sm border', !name && 'bg-muted']}
    style:background-color={color}
  ></span>
  <span class="truncate font-semibold"
    >{name ? filamentLabel(name) : t('mapping.unloaded')}</span
  >
  {#if nozzle}<span class="text-muted-foreground">{nozzle} mm</span>{/if}
{/snippet}

<section class="flex flex-col gap-2 text-sm" data-testid="tool-mapping">
  <h3 class="font-semibold">{t('mapping.title')}</h3>
  <div
    class="grid gap-x-1 text-xs text-muted-foreground"
    style:grid-template-columns={assigning === undefined
      ? '5fr 2fr 5fr'
      : '3fr 2fr 5fr'}
  >
    <span>{t('mapping.gcode')}</span><span></span><span
      >{t('mapping.slots')}</span
    >
  </div>
  <div
    class="grid gap-x-1 border-t transition-all"
    style:grid-template-columns={assigning === undefined
      ? '5fr 2fr 5fr'
      : '3fr 2fr 5fr'}
    style:grid-auto-rows={ROW}
  >
    {#each layout.left as { f, row, span, mapped } (f.index)}
      <div
        class={[
          'flex min-w-0 flex-col justify-start gap-0.5 border-b px-1 py-1.5',
          assigning === f.index && 'bg-muted',
          assigning !== undefined && assigning !== f.index && 'opacity-40',
          over === `f${String(f.index)}` && 'bg-accent',
        ]}
        style:grid-column="1"
        style:grid-row="{row} / span {span}"
        draggable="true"
        role="listitem"
        data-testid="mapping-row"
        data-filament={f.index}
        ondragstart={(e) => drag(e, `f:${String(f.index)}`)}
        ondragover={(e) => allow(e, `f${String(f.index)}`)}
        ondragleave={() => (over = undefined)}
        ondrop={(e) => drop(e, { filament: f.index })}
      >
        <div class="flex min-w-0 items-center gap-1">
          <span class="w-4 shrink-0">{f.index}.</span>
          {@render material(f.material, f.color)}
        </div>
        <div class="flex items-center gap-1 text-xs text-muted-foreground">
          {#if f.grams}<span>{f.grams.toFixed(1)} g</span>{/if}
          {#if f.nozzle}<span>{f.nozzle} mm</span>{/if}
          {#if !mapped && assigning !== f.index}
            <span class="italic">({t('mapping.unmapped')})</span>
          {/if}
          <Button
            variant="ghost"
            size="sm"
            class="ms-auto"
            onclick={() =>
              (assigning = assigning === f.index ? undefined : f.index)}
            >{t(
              assigning === f.index ? 'mapping.cancel' : 'mapping.assign',
            )}</Button
          >
        </div>
      </div>
      {#if mapped}
        <div
          class="flex items-stretch px-1 text-border"
          style:grid-column="2"
          style:grid-row="{row} / span {span}"
        >
          <MappingLines connections={span} />
        </div>
      {/if}
    {/each}
    {#each layout.right as slot, i (slot.index)}
      {@const owner = ownerOf(slot.index)}
      {@const current = filaments.find((x) => x.index === assigning)}
      {@const mine = assigning === undefined ? [] : (mapping[assigning] ?? [])}
      {@const ok = usable(current, slot)}
      {@const how =
        owner && mapping[owner.index]?.[0] === slot.index
          ? fit(owner, slot, severity)
          : undefined}
      <div
        class={[
          'flex min-w-0 flex-col justify-center gap-0.5 border-b px-1 py-1',
          over === `s${String(slot.index)}` && 'bg-accent',
        ]}
        style:grid-column="3"
        style:grid-row={i + 1}
        draggable={owner !== undefined}
        role="listitem"
        data-testid="mapping-slot"
        data-slot={slot.index}
        ondragstart={(e) => drag(e, `s:${String(slot.index)}`)}
        ondragover={(e) => allow(e, `s${String(slot.index)}`)}
        ondragleave={() => (over = undefined)}
        ondrop={(e) => drop(e, { slot: slot.index })}
      >
        <div class="flex min-w-0 items-center gap-1">
          <span class="w-4 shrink-0">{slot.index}.</span>
          {@render material(slot.material, slot.color, slot.nozzle)}
        </div>
        <div class="flex items-center gap-1 overflow-hidden">
          {#if assigning !== undefined}
            {#if ok && !owner && !mine.length}
              <Button
                variant="secondary"
                size="sm"
                onclick={() => {
                  set(assigning ?? 0, [slot.index]);
                  assigning = undefined;
                }}>{t('mapping.assign')}</Button
              >
            {/if}
            {#if ok && mine.length && !mine.includes(slot.index)}
              <Button
                variant="secondary"
                size="sm"
                onclick={() => {
                  set(assigning ?? 0, [slot.index]);
                  assigning = undefined;
                }}>{t('mapping.replace')}</Button
              >
            {/if}
            {#if ok && !owner && mine.length}
              <Button
                variant="secondary"
                size="sm"
                onclick={() => set(assigning ?? 0, [...mine, slot.index])}
                >{t('mapping.join')}</Button
              >
            {/if}
            {#if mine.includes(slot.index)}
              <Button
                variant="ghost"
                size="sm"
                onclick={() =>
                  set(
                    assigning ?? 0,
                    mine.filter((x) => x !== slot.index),
                  )}>{t('mapping.remove')}</Button
              >
            {/if}
          {:else if how}
            <Badge tone={TONE[how]} testid="mapping-fit"
              >{t(`mapping.fit.${how}` as MessageKey)}</Badge
            >
            {#if onchangefilament && how !== 'exact'}
              <Button
                variant="ghost"
                size="sm"
                class="size-7 px-0"
                aria-label={t('mapping.changeFilament')}
                title={t('mapping.changeFilament')}
                onclick={() => onchangefilament(slot.index)}
                ><TelemetryIcon kind="spool" /></Button
              >
            {/if}
          {/if}
        </div>
      </div>
    {/each}
  </div>
</section>
