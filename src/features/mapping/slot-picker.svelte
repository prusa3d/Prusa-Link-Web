<!-- A listbox of the printer's slots for one G-code filament: each with its
     filament's colour, its nozzle and nozzle badges, and what it is to the
     filament. A native select cannot show colours. Slots the printer would
     refuse are listed with the reason, not to be picked. -->
<script lang="ts">
  import NozzleInfo from '../status/nozzle-info.svelte';
  import { t, type MessageKey } from '../../lib/i18n.svelte';
  import { filamentLabel } from '../../lib/printer/filaments';
  import { judge, type Issue } from '../../lib/printer/print-check';
  import type {
    GcodeFilament,
    PrinterTool,
    Severity,
  } from '../../lib/printer/tool-mapping';
  import { Button } from '../../lib/ui/button';
  import { Icon } from '../../lib/ui/icon';
  import { ChevronDown } from '../../lib/ui/icon/icons';

  interface Props {
    filament: GcodeFilament;
    slots: readonly PrinterTool[];
    /// The picked slot's number.
    value: number | undefined;
    severity: Severity;
    label: string;
    /// Lists "none" first, to unmap.
    none?: string | undefined;
    /// Shown while no slot is picked.
    placeholder?: string | undefined;
    onpick: (slot: number | undefined) => void;
  }

  let {
    filament,
    slots,
    value,
    severity,
    label,
    none,
    placeholder,
    onpick,
  }: Props = $props();
  let open = $state(false);
  let list = $state<HTMLElement>();
  const id = $props.id();

  const material = (m: string) => (m ? filamentLabel(m) : t('mapping.unknown'));
  const reasons: Partial<Record<Issue['key'], MessageKey>> = {
    wrongTool: 'mapping.reason.disabled',
    nozzleDiameter: 'mapping.reason.nozzle',
    nozzleHardened: 'mapping.reason.hardened',
    nozzleHighFlow: 'mapping.reason.highFlow',
  };
  /// What the slot is to the filament, and why not when it cannot be.
  function describe(slot: PrinterTool) {
    const { status, issues } = judge(filament, slot, severity);
    if (status === 'incompatible') {
      const issue = issues.find((i) => i.level === 'abort');
      const key = issue && reasons[issue.key];
      return {
        status,
        text: key
          ? t(key, { mm: issue.has ?? '' })
          : t('mapping.status.incompatible'),
      };
    }
    return {
      status,
      text: t(`mapping.status.${status}` as MessageKey, {
        material: material(filament.material),
      }),
    };
  }
  const options = $derived(
    slots
      .filter((s) => !s.disabled)
      .map((slot) => ({ slot, ...describe(slot) })),
  );
  const picked = $derived(options.find((o) => o.slot.index === value));

  function pick(slot: number | undefined) {
    open = false;
    onpick(slot);
  }

  $effect(() => {
    if (!open) return undefined;
    list
      ?.querySelector<HTMLElement>('[aria-selected=true], [role=option]')
      ?.focus();
    const close = (e: PointerEvent) => {
      if (!(e.target as Element).closest(`[data-picker="${id}"]`)) open = false;
    };
    addEventListener('pointerdown', close);
    return () => removeEventListener('pointerdown', close);
  });

  function keys(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      // Closes the list, not the dialog around it.
      e.preventDefault();
      e.stopPropagation();
      open = false;
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = [
      ...(list?.querySelectorAll<HTMLElement>(
        '[role=option]:not([aria-disabled=true])',
      ) ?? []),
    ];
    const at = items.indexOf(document.activeElement as HTMLElement);
    items[
      (at + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
    ]?.focus();
  }
</script>

{#snippet face(slot: PrinterTool, text: string)}
  <span
    class="size-4 shrink-0 rounded-full border bg-muted"
    style:background-color={slot.color}
  ></span>
  <span class="font-semibold">T{slot.index}</span>
  <span
    >{slot.material
      ? filamentLabel(slot.material)
      : t('mapping.unloaded')}</span
  >
  <NozzleInfo
    class="text-xs"
    diameter={slot.nozzle}
    hardened={slot.hardened}
    highFlow={slot.highFlow}
    highTemp={slot.highTemp}
  />
  <span class="ms-auto truncate text-xs text-muted-foreground">{text}</span>
{/snippet}

<div class="relative min-w-0 flex-1" data-picker={id}>
  <Button
    variant="ghost"
    class="h-11 w-full min-w-0 justify-start border-border! bg-background! px-2 text-base font-normal text-foreground! md:h-9 md:text-sm"
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-label={label}
    data-testid="slot-picker"
    data-value={value ?? ''}
    onclick={() => (open = !open)}
  >
    {#if picked}
      {@render face(picked.slot, picked.text)}
    {:else}
      <span class="text-muted-foreground"
        >{placeholder ?? t('mapping.choose')}</span
      >
    {/if}
    <Icon node={ChevronDown} class="size-4 shrink-0" />
  </Button>
  {#if open}
    <div
      bind:this={list}
      role="listbox"
      tabindex="-1"
      aria-label={label}
      class="absolute inset-x-0 top-full z-30 mt-1 flex max-h-72 flex-col overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-lg"
      onkeydown={keys}
    >
      {#if none}
        <div
          role="option"
          tabindex="0"
          aria-selected={value === undefined}
          class="flex min-h-11 cursor-pointer items-center rounded-sm px-2 text-muted-foreground hover:bg-muted focus:bg-muted md:min-h-9"
          onclick={() => pick(undefined)}
          onkeydown={(e) => e.key === 'Enter' && pick(undefined)}
        >
          {none}
        </div>
      {/if}
      {#each options as o (o.slot.index)}
        {@const off = o.status === 'incompatible'}
        <div
          role="option"
          tabindex={off ? -1 : 0}
          aria-selected={o.slot.index === value}
          aria-disabled={off}
          data-slot={o.slot.index}
          data-status={o.status}
          class={[
            'flex min-h-11 items-center gap-2 rounded-sm px-2 md:min-h-9',
            off
              ? 'cursor-not-allowed opacity-50'
              : 'cursor-pointer hover:bg-muted focus:bg-muted',
            o.slot.index === value && 'bg-muted',
          ]}
          onclick={() => !off && pick(o.slot.index)}
          onkeydown={(e) => !off && e.key === 'Enter' && pick(o.slot.index)}
        >
          {@render face(o.slot, o.text)}
        </div>
      {/each}
    </div>
  {/if}
</div>
