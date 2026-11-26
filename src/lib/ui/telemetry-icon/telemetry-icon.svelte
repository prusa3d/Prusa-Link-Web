<!-- Prusa's own filament icons: nozzle and spool from the Prusa Font Awesome
     kit's custom set, heatbed from Prusa Connect. Decorative. -->
<script lang="ts">
  interface Props {
    kind: 'nozzle' | 'bed' | 'spool';
    class?: string;
    /// A Tailwind size class.
    size?: string;
  }

  let { kind, class: extra, size = 'size-4' }: Props = $props();
</script>

{#if kind === 'nozzle'}
  <svg
    viewBox="0 0 352 512"
    aria-hidden="true"
    class={['shrink-0', size, extra]}
    ><path
      fill="currentColor"
      d="M328 288h-72v-62l25-4c4-1 7-5 6-9l-3-16c-1-4-5-7-9-6l-20 4v-40l25-4c4-1 7-5 6-9l-3-16c-1-4-5-7-9-6l-20 4V82l25-4c4-1 7-5 6-9L285 53c-1-4-5-7-9-6l-20 4V24c0-13-11-24-24-24H120c-13 0-24 11-24 24v54l-25 4c-4 1-7 5-6 9l3 16c1 4 5 7 9 6l20-4v40l-25 4c-4 1-7 5-6 9l3 16c1 4 5 7 9 6l20-4v40l-25 4c-4 1-7 5-6 9l3 16c1 4 5 7 9 6l20-4V288H24c-13 0-24 11-24 24v80c0 13 11 24 24 24h40l73 87c5 6 11 9 18 9h42c7 0 14-3 18-9l73-87h40c13 0 24-11 24-24v-80c0-13-11-24-24-24zM112 384v-64h128v64H112zM128 32h96v23l-96 17V32zm0 73l96-17v40l-96 17v-40zm0 72l96-17v40l-96 17v-40zm0 72l96-17V288h-96v-39zM32 384v-64h48v64H32zm160 96h-32l-53-64h139L192 480zm128-96h-48v-64h48v64z"
    /></svg
  >
{:else if kind === 'bed'}
  <svg viewBox="0 0 24 24" aria-hidden="true" class={['shrink-0', size, extra]}
    ><path
      fill="currentColor"
      opacity="0.6"
      d="m8.2,13.8c-1.6,-1.6,-1.8,-2.5,-0.4,-4.2c0.5,-0.6,0.7,-1.2,0.7,-1.8c0,-1.2,-0.9,-2.5,-2.1,-3.9l-1.9,1.8c1.8,2.1,1.6,2.3,0.3,4.1c-0.4,0.6,-0.6,1.2,-0.6,1.8c0,1.5,1.1,2.9,2.2,4l1.8,-1.7l0,0Zm11.3,0c-1.6,-1.6,-1.8,-2.5,-0.4,-4.2c0.5,-0.6,0.7,-1.2,0.7,-1.8c0,-1.2,-0.9,-2.5,-2.1,-3.9l-1.9,1.8c1.8,2.1,1.6,2.3,0.3,4.1c-0.4,0.6,-0.6,1.2,-0.6,1.8c0,1.5,1.1,2.9,2.2,4l1.8,-1.7l0,0Zm-5.7,0c-1.6,-1.6,-1.8,-2.5,-0.4,-4.2c0.5,-0.6,0.7,-1.2,0.7,-1.8c0,-1.2,-0.9,-2.5,-2.1,-3.9l-1.9,1.8c1.8,2.1,1.6,2.3,0.3,4.1c-0.4,0.6,-0.6,1.2,-0.6,1.8c0,1.5,1.1,2.9,2.2,4l1.8,-1.7l0,0Z"
    /><path fill="currentColor" d="m2,17.4l20,0l0,2.8l-20,0Z" /></svg
  >
{:else}
  <svg
    viewBox="0 0 490 512"
    aria-hidden="true"
    class={['shrink-0', size, extra]}
    ><path
      fill="currentColor"
      d="M238 297a59 59 0 1 0 0-119 59 59 0 1 0 0 119zM30 238c0-115 93-208 208-208c115 0 208 93 208 208V505h30V238C475 106 369 0 238 0C106 0 0 106 0 238s106 238 238 238c53 0 103-18 142-48c7-5 8-14 3-21c-5-7-14-8-21-3c-35 26-78 42-125 42c-115 0-208-93-208-208zm74 0a134 134 0 1 1 267 0 134 134 0 1 1 -267 0zM238 74a163 163 0 1 0 0 326 163 163 0 1 0 0-326zM175 174A89 89 0 1 1 300 300 89 89 0 1 1 175 174z"
    /></svg
  >
{/if}
