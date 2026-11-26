<script lang="ts">
  import { onMount } from 'svelte';

  import { DIALOGS, type MockPatch } from '../mock/control';
  import PrinterAnimation from './printer-animation.svelte';

  // Dev only: drives the mock printer the dev server answers /api with.
  interface Props {
    compact?: boolean;
  }

  let { compact = false }: Props = $props();

  const MODELS = [
    'MK4S',
    'XL',
    'XL_2',
    'XL_SINGLE',
    'COREONE',
    'COREONE_INDX',
  ] as const;
  const MODEL_LABEL: Partial<Record<(typeof MODELS)[number], string>> = {
    XL: 'XL 5 tools',
    XL_2: 'XL 2 tools',
    XL_SINGLE: 'XL 1 tool',
  };
  const STATES = [
    'IDLE',
    'BUSY',
    'PRINTING',
    'PAUSED',
    'FINISHED',
    'STOPPED',
    'ERROR',
    'ATTENTION',
  ] as const satisfies NonNullable<MockPatch['state']>[];
  const SPEEDS = [1, 20, 100, 400];

  interface Snapshot {
    apiKey: string;
    model: string;
    state: string;
    timeScale: number;
    usb: boolean;
    parked: boolean;
    mmu: boolean;
    takesMmu: boolean;
    firmware: string;
    bed: { temp: number; target: number };
    tools: { temp: number; target: number; material: string }[];
    files: { dir: string; name: string; display_name: string }[];
    job?: { progress: number };
    question?: string;
    filamentStep?: 'heating' | 'remove' | 'insert' | 'purging';
    apiV2: boolean;
    chamber?: { temp: number; target: number };
    enclosure?: { temp: number };
    dialog?: { title: string; text: string; code?: string; buttons: string[] };
    objects?: { name: string; canceled: boolean }[];
    currentObject?: number;
    zOffset: number;
    nozzleCheck: 'ignore' | 'warning' | 'abort';
    speed: number;
    flow: number;
    axis: { x: number; y: number };
  }

  let snap = $state<Snapshot | undefined>();

  async function patch(body: MockPatch = {}) {
    const res = Object.keys(body).length
      ? await fetch('/__mock/state', {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
      : await fetch('/__mock/state');
    snap = (await res.json()) as Snapshot;
    if (
      body.model ||
      body.firmware ||
      body.reset ||
      body.mmu !== undefined ||
      body.apiV2 !== undefined ||
      body.chamber !== undefined ||
      body.enclosure !== undefined
    ) {
      dispatchEvent(new Event('prusalink:identity'));
    }
  }

  onMount(() => {
    void patch();
    const id = setInterval(() => void patch(), 1000);
    return () => {
      clearInterval(id);
    };
  });

  const chip = 'rounded-md border px-2.5 py-1 text-sm hover:border-primary';
  const on = 'border-primary bg-primary text-primary-foreground';
</script>

<div
  class={[
    'flex flex-col gap-5 text-sm',
    compact ? 'px-6 py-5' : 'mx-auto max-w-3xl p-6',
  ]}
>
  {#if !compact}<h1 class="text-xl font-semibold">Mock printer</h1>{/if}
  {#if snap}
    <fieldset class="flex min-w-0 flex-col gap-2">
      <legend class="mb-1 font-semibold">Printer</legend>
      <div class="flex flex-wrap gap-1.5">
        {#each MODELS as model (model)}
          <button
            class={[chip, snap.model === model && on]}
            onclick={() => patch({ model })}
            >{MODEL_LABEL[model] ?? model.replace('_', ' ')}</button
          >
        {/each}
        <button class={chip} onclick={() => patch({ reset: true })}
          >Reset</button
        >
      </div>
    </fieldset>
    <fieldset class="flex min-w-0 flex-col gap-2">
      <legend class="mb-1 font-semibold">Hardware</legend>
      <div class="flex flex-wrap gap-1.5">
        <button
          class={[chip, snap.usb && on]}
          onclick={() => patch({ usb: !snap?.usb })}
          >USB drive {snap.usb ? 'in' : 'out'}</button
        >
        {#if snap.takesMmu}
          <button
            type="button"
            class={[chip, snap.mmu && on]}
            onclick={() => patch({ mmu: !snap?.mmu })}
            >MMU3 {snap.mmu ? 'on' : 'off'}</button
          >
        {/if}
        <button
          type="button"
          class={[chip, snap.apiV2 && on]}
          onclick={() => patch({ apiV2: !snap?.apiV2 })}
          >API {snap.apiV2 ? 'v2' : 'v1 (today)'}</button
        >
        <button
          type="button"
          class={[chip, snap.chamber && on]}
          onclick={() => patch({ chamber: !snap?.chamber })}
          >Chamber {snap.chamber ? 'on' : 'off'}</button
        >
        <button
          type="button"
          class={[chip, snap.enclosure && on]}
          onclick={() => patch({ enclosure: !snap?.enclosure })}
          >Enclosure {snap.enclosure ? 'on' : 'off'}</button
        >
        <button
          type="button"
          class={chip}
          title="The printer's nozzle check (hw_checks)"
          onclick={() =>
            patch({
              nozzleCheck: (
                {
                  warning: 'abort',
                  abort: 'ignore',
                  ignore: 'warning',
                } as const
              )[snap?.nozzleCheck ?? 'warning'],
            })}>Nozzle check {snap.nozzleCheck}</button
        >
        <button
          type="button"
          class={chip}
          onclick={() => patch({ firmwareFiles: true })}
          >.bbf files on USB</button
        >
        {#each ['8.0.1', '8.0.2'] as firmware (firmware)}
          <button
            class={[chip, snap.firmware === firmware && on]}
            onclick={() => patch({ firmware })}>FW {firmware}</button
          >
        {/each}
      </div>
    </fieldset>
    <div class="rounded-lg mx-auto w-48 bg-muted/40 p-2">
      <PrinterAnimation model={snap.model} printerState={snap.state} />
    </div>
    <p class="text-muted-foreground">
      PrusaLink password <code class="rounded bg-muted px-1 font-mono"
        >{snap.apiKey}</code
      >
    </p>
    {#if snap.dialog}
      <section
        class="flex flex-col gap-2 rounded-md border-2 border-primary bg-black p-3 text-white"
        aria-label="Printer dialog"
      >
        <p class="font-semibold">
          {snap.dialog.title}{#if snap.dialog.code}
            · {snap.dialog.code}{/if}
        </p>
        <p class="font-mono">{snap.dialog.text}</p>
        <div class="flex flex-wrap gap-1.5">
          {#each snap.dialog.buttons as button (button)}
            <button
              class="rounded-md bg-primary px-2.5 py-1"
              onclick={() => patch({ press: button })}>{button}</button
            >
          {/each}
          <button
            class="rounded-md border border-white/40 px-2.5 py-1"
            onclick={() => patch({ dialog: null })}>Dismiss</button
          >
        </div>
      </section>
    {:else if snap.question}
      <section
        class="flex flex-col gap-2 rounded-md border-2 border-primary bg-black p-3 text-white"
        aria-label="Printer screen"
      >
        <p class="font-mono">{snap.question}</p>
        {#if snap.filamentStep}
          <div class="flex flex-wrap gap-1.5">
            {#if snap.filamentStep === 'remove'}
              <button
                class="rounded-md bg-primary px-2.5 py-1"
                onclick={() => patch({ filament: 'removed' })}
                >Filament removed</button
              >
            {:else if snap.filamentStep === 'insert'}
              <button
                class="rounded-md bg-primary px-2.5 py-1"
                onclick={() => patch({ filament: 'inserted' })}
                >Filament inserted</button
              >
            {/if}
            <button
              class="rounded-md border border-white/40 px-2.5 py-1"
              onclick={() => patch({ filament: 'cancel' })}>Cancel</button
            >
          </div>
        {/if}
      </section>
    {/if}
    <fieldset class="flex min-w-0 flex-col gap-2">
      <legend class="mb-1 font-semibold">Tools</legend>
      <table class="w-full">
        <thead class="text-muted-foreground"
          ><tr
            ><th class="text-start font-normal">Tool</th><th class="font-normal"
              >Temp</th
            ><th class="font-normal">Target</th><th class="font-normal"
              >Material</th
            ></tr
          ></thead
        >
        <tbody>
          {#each snap.tools as tool, index (index)}
            <tr>
              <td>T{index}</td>
              <td class="text-center tabular-nums">{tool.temp.toFixed(0)}</td>
              <td
                ><input
                  class="rounded w-16 border px-1"
                  type="number"
                  value={tool.target}
                  onchange={(e) =>
                    patch({
                      tool: { index, target: Number(e.currentTarget.value) },
                    })}
                /></td
              >
              <td
                ><input
                  class="rounded w-20 border px-1"
                  value={tool.material}
                  onchange={(e) =>
                    patch({ tool: { index, material: e.currentTarget.value } })}
                /></td
              >
            </tr>
          {/each}
          {#if snap.chamber}
            <tr>
              <td>Chamber</td>
              <td class="text-center tabular-nums"
                >{snap.chamber.temp.toFixed(0)}</td
              >
              <td>{snap.chamber.target}</td>
              <td></td>
            </tr>
          {/if}
          <tr>
            <td>Bed</td>
            <td class="text-center tabular-nums">{snap.bed.temp.toFixed(0)}</td>
            <td
              ><input
                class="rounded w-16 border px-1"
                type="number"
                aria-label="Bed target"
                value={snap.bed.target}
                onchange={(e) =>
                  patch({ bed: { target: Number(e.currentTarget.value) } })}
              /></td
            >
            <td></td>
          </tr>
        </tbody>
      </table>
      {#if snap.tools.length > 1}
        <button
          type="button"
          class={[chip, 'mt-2', !snap.parked && on]}
          onclick={() => patch({ parked: !snap?.parked })}
          >{snap.parked ? 'No tool picked' : 'Tool picked'}</button
        >
      {/if}
    </fieldset>
    <fieldset class="flex min-w-0 flex-col gap-2">
      <legend class="mb-1 font-semibold">State</legend>
      <div class="flex flex-wrap gap-1.5">
        {#each STATES as state (state)}
          <button
            class={[chip, snap.state === state && on]}
            onclick={() => patch({ state })}>{state}</button
          >
        {/each}
      </div>
    </fieldset>
    <fieldset class="flex min-w-0 flex-col gap-2">
      <legend class="mb-1 font-semibold">Dialog on the screen</legend>
      <div class="flex flex-wrap gap-1.5">
        {#each Object.entries(DIALOGS) as [key, d] (key)}
          <button
            class={chip}
            onclick={() => patch({ dialog: key as keyof typeof DIALOGS })}
            >{d.title}</button
          >
        {/each}
      </div>
    </fieldset>
    {#if snap.job}
      <fieldset class="flex min-w-0 flex-col gap-2">
        <legend class="mb-1 font-semibold">Job</legend>
        <p class="text-muted-foreground tabular-nums">
          X {snap.axis.x} · Y {snap.axis.y} · speed {snap.speed} % · flow {snap.flow}
          % · Z offset {snap.zOffset} mm
        </p>
        {#each snap.objects ?? [] as o, i (i)}
          <p class={[o.canceled && 'text-muted-foreground line-through']}>
            {i}: {o.name}{#if snap.currentObject === i}
              · printing{/if}
          </p>
        {/each}
      </fieldset>
    {/if}
    <fieldset class="flex min-w-0 flex-col gap-2">
      <legend class="mb-1 font-semibold">Print speed</legend>
      <div class="flex flex-wrap gap-1.5">
        {#each SPEEDS as timeScale (timeScale)}
          <button
            class={[chip, snap.timeScale === timeScale && on]}
            onclick={() => patch({ timeScale })}>{timeScale}×</button
          >
        {/each}
      </div>
    </fieldset>
    <fieldset class="flex min-w-0 flex-col gap-2">
      <legend class="mb-1 font-semibold">Start a print</legend>
      <div class="flex flex-col gap-1">
        {#each snap.files.filter((f) => !f.display_name.startsWith('.')) as file (`${file.dir}/${file.name}/${file.display_name}`)}
          <button
            class="-mx-2 truncate rounded-md px-2 py-1 text-start hover:bg-muted"
            onclick={() =>
              patch({
                startPrint: file.dir ? `${file.dir}/${file.name}` : file.name,
              })}>{file.display_name}</button
          >
        {/each}
      </div>
    </fieldset>
  {/if}
</div>
