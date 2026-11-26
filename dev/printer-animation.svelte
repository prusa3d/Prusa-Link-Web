<script lang="ts">
  import { Rive, RuntimeLoader } from '@rive-app/canvas-lite';
  import wasm from '@rive-app/canvas-lite/rive.wasm?url';

  import coreone from './assets/riv/coreone.riv?url';
  import coreoneIndx from './assets/riv/coreone_indx.riv?url';
  import mk4s from './assets/riv/mk4s.riv?url';
  import xl from './assets/riv/xl.riv?url';

  // Dev only: the mock printer, animated. Plays while printing, holds on
  // pause, and goes back to the first frame for any other state.
  interface Props {
    model: string;
    printerState: string;
  }

  let { model, printerState }: Props = $props();

  const FILES: Record<string, string> = {
    MK4S: mk4s,
    XL: xl,
    XL_2: xl,
    XL_SINGLE: xl,
    COREONE: coreone,
    COREONE_INDX: coreoneIndx,
  };
  const MACHINE = 'State Machine 1';

  RuntimeLoader.setWasmUrl(wasm);

  // The panel hands over fields of a snapshot it replaces every second; a
  // prop read straight in an effect re-runs it each time, which reloaded the
  // animation. Derived values change only when the value does.
  const src = $derived(FILES[model]);
  const machineState = $derived(printerState);

  let canvas: HTMLCanvasElement | undefined = $state();
  let rive: Rive | undefined = $state();

  $effect(() => {
    if (!canvas || !src) return;
    const instance = new Rive({
      src,
      canvas,
      stateMachines: MACHINE,
      autoplay: false,
      onLoad: () => {
        instance.resizeDrawingSurfaceToCanvas();
        rive = instance;
      },
    });
    return () => {
      rive = undefined;
      instance.cleanup();
    };
  });

  $effect(() => {
    if (!rive) return;
    if (machineState === 'PRINTING') {
      rive.play(MACHINE);
    } else if (machineState === 'PAUSED') {
      rive.pause(MACHINE);
    } else {
      rive.reset({ stateMachines: MACHINE, autoplay: false });
    }
  });
</script>

<canvas
  bind:this={canvas}
  class="aspect-square w-full"
  aria-label="{model} {printerState}"
></canvas>
