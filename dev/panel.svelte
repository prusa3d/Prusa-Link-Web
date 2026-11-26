<script lang="ts">
  import { onMount } from 'svelte';

  import type { MockPatch } from '../mock/control';
  import PrinterAnimation from './printer-animation.svelte';

  // Dev only: drives the mock printer the dev server answers /api with.
  interface Props {
    compact?: boolean;
  }

  let { compact = false }: Props = $props();

  const MODELS = [
    'MK4S',
    'XL',
    'XL_SINGLE',
    'COREONE',
    'COREONE_INDX',
  ] as const;
  const MODEL_LABEL: Partial<Record<(typeof MODELS)[number], string>> = {
    XL: 'XL 5 tools',
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
    if (body.model || body.firmware || body.reset) {
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
    {#if snap.question}
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
