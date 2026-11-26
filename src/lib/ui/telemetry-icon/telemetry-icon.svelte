<!-- Prusa's own filament icons: nozzle and spool from the Prusa Font Awesome
     kit's custom set, heatbed from Prusa Connect. Decorative. -->
<script lang="ts">
  import { BED_HEAT, BED_PLATE, NOZZLE } from './paths';

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
    ><path fill="currentColor" d={NOZZLE} /></svg
  >
{:else if kind === 'bed'}
  <svg viewBox="0 0 24 24" aria-hidden="true" class={['shrink-0', size, extra]}
    ><path fill="currentColor" opacity="0.6" d={BED_HEAT} /><path
      fill="currentColor"
      d={BED_PLATE}
    /></svg
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
