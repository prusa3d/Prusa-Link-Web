<!-- Every tool of a printer with several, as Prusa Connect's MaterialToolCard
     draws them: the tool and its nozzle on top, the filament's type in its
     own colour in a circle (a dashed one when empty), its name, the tool's
     temperature where it has one, and Load, or Change and Unload. The tool
     in use has a ring around its circle, spinning while it prints. -->
<script lang="ts">
  import { t } from '../../lib/i18n.svelte';
  import { filamentLabel } from '../../lib/printer/filaments';
  import { heaterState } from '../../lib/printer/heating';
  import { textOn, type ToolRow } from '../../lib/printer/tools';
  import { degrees } from '../../lib/units.svelte';
  import { Button } from '../../lib/ui/button';
  import { Spinner } from '../../lib/ui/spinner';
  import { TelemetryIcon } from '../../lib/ui/telemetry-icon';

  interface Props {
    tools: ToolRow[];
    printing: boolean;
    /// Opens the filament dialog for a tool; unset while the printer cannot.
    onfilament?: ((tool: number) => void) | undefined;
    onunload?: ((tool: number) => void) | undefined;
    /// Heats a loaded tool for its filament; unset where it cannot heat.
    onpreheat?: ((tool: ToolRow) => void) | undefined;
  }

  let { tools, printing, onfilament, onunload, onpreheat }: Props = $props();

  const TINT = {
    heating: 'text-warning-text',
    'at-temperature': '',
    cooling: 'text-info-text',
    off: 'text-muted-foreground',
    'not-reported': 'text-muted-foreground',
  };
</script>

<ul
  class="grid gap-2"
  style:grid-template-columns="repeat(auto-fill, minmax(8.5rem, 1fr))"
  data-testid="tool-list"
>
  {#each tools as tool (tool.index)}
    {@const name = `T${String(tool.index + 1)}`}
    {@const loaded = tool.material && tool.material !== '---'}
    <li
      class="flex min-w-0 flex-col items-center gap-2 rounded-md border p-2 text-sm"
      data-testid="tool-row"
      data-active={tool.active}
    >
      <div class="flex w-full items-center gap-1 text-xs">
        <span class="flex-1 font-semibold"
          >{t('tools.name', { n: tool.index + 1 })}</span
        >
        {#if tool.nozzle}
          <span class="text-muted-foreground">{tool.nozzle}</span>
          <TelemetryIcon
            kind="nozzle"
            size="size-3"
            class="text-muted-foreground"
          />
        {/if}
      </div>
      <div class="relative grid size-18 place-items-center">
        {#if tool.active && printing}
          <!-- The tool printing: the loader turns around its filament
               (still where motion is reduced). -->
          <Spinner class="absolute inset-0 size-18 text-primary" />
        {:else if tool.active}
          <span
            class="absolute inset-0 rounded-full border-3 border-primary"
            data-testid="tool-active"
          ></span>
        {/if}
        <span
          class={[
            'grid size-14 place-items-center rounded-full text-sm font-semibold',
            loaded ? 'bg-muted' : 'border-2 border-dashed border-border',
          ]}
          style:background-color={loaded ? tool.color : undefined}
          style:color={loaded ? textOn(tool.color) : undefined}
          data-testid="tool-material"
          >{loaded ? filamentLabel(tool.material ?? '') : ''}</span
        >
      </div>
      <p class={['text-center text-xs', !loaded && 'text-muted-foreground']}>
        {loaded ? filamentLabel(tool.material ?? '') : t('tools.none')}
      </p>
      {#if tool.temp !== undefined}
        {@const state = heaterState(tool.temp, tool.target)}
        <p
          class={['flex items-center gap-1 text-xs tabular-nums', TINT[state]]}
          data-testid="tool-temp"
        >
          <TelemetryIcon kind="nozzle" size="size-3" />{degrees(
            tool.temp,
          )}{#if tool.target}<span class="text-muted-foreground"
              >/ {degrees(tool.target)}</span
            >{/if}
        </p>
      {/if}
      {#if onfilament}
        <!-- Stacked, each as wide as the card, as Connect's cards: no
             language's words run into the next card. -->
        <div class="mt-auto flex w-full min-w-0 flex-col gap-1">
          <Button
            variant="secondary"
            size="sm"
            class="w-full min-w-0 max-sm:h-11"
            aria-label={`${t('filament.title')} ${name}`}
            onclick={() => onfilament(tool.index)}
            ><span class="truncate"
              >{t(loaded ? 'filament.changeShort' : 'tools.load')}</span
            ></Button
          >
          {#if loaded && onunload}
            <Button
              variant="secondary"
              size="sm"
              class="w-full min-w-0 max-sm:h-11"
              aria-label={`${t('filament.unload')} ${name}`}
              onclick={() => onunload(tool.index)}
              ><span class="truncate">{t('filament.unload')}</span></Button
            >
          {/if}
          {#if onpreheat && loaded && tool.temp !== undefined}
            <Button
              variant="ghost"
              size="sm"
              class="w-full min-w-0 max-sm:h-11"
              aria-label={t('tools.preheat', { tool: name })}
              onclick={() => onpreheat(tool)}
              ><TelemetryIcon kind="bed" /><span class="truncate"
                >{t('controls.preheat')}</span
              ></Button
            >
          {/if}
        </div>
      {/if}
    </li>
  {/each}
</ul>
