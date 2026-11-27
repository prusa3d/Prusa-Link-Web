<!-- Every tool (or MMU slot) of a printer with several, as Prusa Connect's
     MaterialToolCard draws them: the tool, its nozzle and its badges on top,
     the filament's type in its own colour in a circle. An empty tool's
     dashed circle loads it; Edit opens the tool's actions. The tool in use
     has a ring around its circle, turning while it prints. Temperatures are
     on the printer's picture. -->
<script lang="ts">
  import NozzleInfo from './nozzle-info.svelte';
  import { t } from '../../lib/i18n.svelte';
  import { filamentLabel } from '../../lib/printer/filaments';
  import { textOn, type ToolRow } from '../../lib/printer/tools';
  import { Button } from '../../lib/ui/button';
  import { Icon } from '../../lib/ui/icon';
  import { ArrowDownToLine, Pencil } from '../../lib/ui/icon/icons';
  import { Spinner } from '../../lib/ui/spinner';

  interface Props {
    tools: ToolRow[];
    printing: boolean;
    /// MMU slots, not tools.
    slots?: boolean;
    /// Opens the filament dialog for a tool; unset while the printer cannot.
    onfilament?: ((tool: number) => void) | undefined;
    onunload?: ((tool: number) => void) | undefined;
  }

  let {
    tools,
    printing,
    slots = false,
    onfilament,
    onunload,
  }: Props = $props();
  let menu = $state<number | undefined>();

  const label = (tool: ToolRow) =>
    t(slots ? 'tools.slot' : 'tools.name', { n: tool.index + 1 });

  // The menu closes on Escape, on a click elsewhere and once used.
  $effect(() => {
    if (menu === undefined) return undefined;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return;
      if (
        e.type === 'pointerdown' &&
        (e.target as Element).closest('[data-tool-menu]')
      )
        return;
      menu = undefined;
    };
    addEventListener('keydown', close);
    addEventListener('pointerdown', close);
    return () => {
      removeEventListener('keydown', close);
      removeEventListener('pointerdown', close);
    };
  });

  function act(f: ((tool: number) => void) | undefined, tool: number) {
    menu = undefined;
    f?.(tool);
  }

  /// Up and down move between a menu's items.
  function arrows(e: KeyboardEvent) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = [
      ...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(
        '[role=menuitem]',
      ),
    ];
    const at = items.indexOf(document.activeElement as HTMLElement);
    items[
      (at + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
    ]?.focus();
  }
</script>

<ul
  class="grid gap-2"
  style:grid-template-columns="repeat(auto-fill, minmax(8.5rem, 1fr))"
  data-testid="tool-list"
>
  {#each tools as tool (tool.index)}
    {@const loaded = !!tool.material && tool.material !== '---'}
    <li
      class="relative flex min-w-0 flex-col items-center gap-2 rounded-md border p-2 text-sm"
      data-testid="tool-row"
      data-active={tool.active}
    >
      <div class="flex w-full min-w-0 items-center gap-1 text-xs">
        <span class="min-w-0 flex-1 truncate font-semibold">{label(tool)}</span>
        <NozzleInfo
          diameter={tool.nozzle}
          hardened={tool.hardened}
          highFlow={tool.highFlow}
          highTemp={tool.highTemp}
        />
      </div>
      <div class="relative grid size-18 place-items-center">
        {#if tool.active && printing}
          <Spinner class="absolute inset-0 size-18 text-primary" />
        {:else if tool.active}
          <span
            class="absolute inset-0 rounded-full border-3 border-primary"
            data-testid="tool-active"
          ></span>
        {/if}
        {#if loaded}
          <span
            class="grid size-14 place-items-center rounded-full bg-muted text-sm font-semibold"
            style:background-color={tool.color}
            style:color={textOn(tool.color)}
            data-testid="tool-material"
            >{filamentLabel(tool.material ?? '')}</span
          >
        {:else if onfilament}
          <!-- An empty tool: its circle loads it. -->
          <Button
            variant="ghost"
            class="size-14! rounded-full! border-2! border-dashed! border-border! p-0"
            aria-label={`${t('tools.load')} ${label(tool)}`}
            onclick={() => onfilament(tool.index)}
            ><Icon node={ArrowDownToLine} class="size-6" /></Button
          >
        {:else}
          <span
            class="size-14 rounded-full border-2 border-dashed border-border"
          ></span>
        {/if}
      </div>
      {#if !loaded}
        <p class="text-center text-xs text-muted-foreground">
          {t('tools.none')}
        </p>
      {/if}
      {#if onfilament}
        <div class="mt-auto w-full" data-tool-menu>
          <Button
            variant="ghost"
            size="sm"
            class="w-full min-w-0 max-sm:h-11"
            aria-haspopup="menu"
            aria-expanded={menu === tool.index}
            aria-label={`${t('tools.edit')} ${label(tool)}`}
            onclick={() =>
              (menu = menu === tool.index ? undefined : tool.index)}
            ><Icon node={Pencil} /><span class="truncate"
              >{t('tools.edit')}</span
            ></Button
          >
          {#if menu === tool.index}
            <div
              role="menu"
              tabindex="-1"
              class="absolute inset-x-1 bottom-11 z-20 flex flex-col rounded-md border bg-popover p-1 text-popover-foreground shadow-lg"
              onkeydown={arrows}
            >
              {#if loaded}
                <Button
                  variant="ghost"
                  size="sm"
                  role="menuitem"
                  class="justify-start max-sm:h-11"
                  onclick={() => act(onfilament, tool.index)}
                  ><span class="truncate">{t('filament.change')}</span></Button
                >
                {#if onunload}
                  <Button
                    variant="ghost"
                    size="sm"
                    role="menuitem"
                    class="justify-start max-sm:h-11"
                    onclick={() => act(onunload, tool.index)}
                    ><span class="truncate">{t('filament.unload')}</span
                    ></Button
                  >
                {/if}
              {:else}
                <Button
                  variant="ghost"
                  size="sm"
                  role="menuitem"
                  class="justify-start max-sm:h-11"
                  onclick={() => act(onfilament, tool.index)}
                  ><span class="truncate">{t('tools.load')}</span></Button
                >
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    </li>
  {/each}
</ul>
