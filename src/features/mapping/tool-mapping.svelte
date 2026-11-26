<!-- Which printer slot prints which G-code filament, as Prusa Connect's
     start-print tool mapping: each G-code filament with the slots it goes to
     (the first prints, the others join when its spool runs out), and while
     one is being assigned, every slot with what it can do for it. The page
     suggests a mapping; the person can change all of it. -->
<script lang="ts">
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

  interface Props {
    filaments: GcodeFilament[];
    slots: readonly PrinterTool[];
    mapping: Mapping;
    severity: Severity;
    /// Lets the printer change every filament that does not match.
    onchangeall?: (() => void) | undefined;
  }

  let {
    filaments,
    slots,
    mapping = $bindable(),
    severity,
    onchangeall,
  }: Props = $props();
  let assigning = $state<number | undefined>();

  const slotOf = (index: number) => slots.find((s) => s.index === index);
  const mappedTo = (slot: number) =>
    Object.entries(mapping).find(([, to]) => to.includes(slot))?.[0];
  const TONE = {
    exact: 'done',
    similar: 'active',
    material: 'attention',
    nozzle: 'attention',
    refused: 'fault',
  } as const;

  function set(from: number, to: number[]) {
    const next: Mapping = {};
    for (const [f, tools] of Object.entries(mapping)) {
      const left = tools.filter((x) => !to.includes(x));
      if (left.length && Number(f) !== from) next[Number(f)] = left;
    }
    if (to.length) next[from] = to;
    mapping = next;
  }
</script>

{#snippet material(name: string | undefined, color?: string, nozzle?: number)}
  <span
    class="size-4 shrink-0 rounded-sm border bg-muted"
    style:background-color={color}
  ></span>
  <span class="font-semibold"
    >{name ? filamentLabel(name) : t('mapping.unloaded')}</span
  >
  {#if nozzle}<span class="text-muted-foreground">{nozzle} mm</span>{/if}
{/snippet}

<section class="flex flex-col gap-2 text-sm" data-testid="tool-mapping">
  <div class="flex items-center justify-between gap-2">
    <h3 class="font-semibold">{t('mapping.title')}</h3>
    {#if onchangeall}
      <Button variant="ghost" size="sm" onclick={onchangeall}
        >{t('mapping.changeAll')}</Button
      >
    {/if}
  </div>
  <div class="flex gap-6 text-xs text-muted-foreground">
    <span class="flex-1">{t('mapping.gcode')}</span><span class="flex-1"
      >{t('mapping.slots')}</span
    >
  </div>
  <ul class="flex flex-col divide-y border-y">
    {#each filaments as f (f.index)}
      {@const to = mapping[f.index] ?? []}
      <li
        class={[
          'flex items-center gap-2 py-2',
          assigning === f.index && 'bg-muted',
          assigning !== undefined && assigning !== f.index && 'opacity-40',
        ]}
        data-testid="mapping-row"
      >
        <div class="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          <span class="w-4">{f.index}.</span>
          {@render material(f.material, f.color, f.nozzle)}
          {#if f.grams}<span class="text-muted-foreground"
              >{f.grams.toFixed(1)} g</span
            >{/if}
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
        <span aria-hidden="true" class="text-muted-foreground">→</span>
        <div class="flex min-w-0 flex-1 flex-col gap-1">
          {#each to as index (index)}
            {@const slot = slotOf(index)}
            <div class="flex flex-wrap items-center gap-1">
              <span class="w-4">{index}.</span>
              {@render material(slot?.material, slot?.color, slot?.nozzle)}
              {#if slot && index === to[0]}
                {@const how = fit(f, slot, severity)}
                <Badge tone={TONE[how]} testid="mapping-fit"
                  >{t(`mapping.fit.${how}` as MessageKey)}</Badge
                >
              {/if}
            </div>
          {:else}
            <span class="text-muted-foreground italic"
              >{t('mapping.unmapped')}</span
            >
          {/each}
        </div>
      </li>
    {/each}
  </ul>
  {#if assigning !== undefined}
    {@const f = filaments.find((x) => x.index === assigning)}
    {@const mine = mapping[assigning] ?? []}
    <p class="text-xs text-muted-foreground">{t('mapping.slots')}</p>
    <ul class="flex flex-col divide-y border-y" data-testid="mapping-slots">
      {#each slots as slot (slot.index)}
        {@const usable =
          f && slot.material && fit(f, slot, severity) !== 'refused'}
        {@const taken = mappedTo(slot.index) !== undefined}
        {@const own = mine.includes(slot.index)}
        <li class="flex min-h-11 flex-wrap items-center gap-1 py-1">
          <span class="w-4">{slot.index}.</span>
          {@render material(slot.material, slot.color, slot.nozzle)}
          <div class="ms-auto flex gap-1">
            {#if usable && !own && mine.length}
              <Button
                variant="secondary"
                size="sm"
                onclick={() => {
                  set(assigning ?? 0, [slot.index]);
                  assigning = undefined;
                }}>{t('mapping.replace')}</Button
              >
            {/if}
            {#if usable && !taken && !mine.length}
              <Button
                variant="secondary"
                size="sm"
                onclick={() => {
                  set(assigning ?? 0, [slot.index]);
                  assigning = undefined;
                }}>{t('mapping.assign')}</Button
              >
            {/if}
            {#if usable && !taken && mine.length}
              <Button
                variant="secondary"
                size="sm"
                onclick={() => set(assigning ?? 0, [...mine, slot.index])}
                >{t('mapping.join')}</Button
              >
            {/if}
            {#if own}
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
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>
