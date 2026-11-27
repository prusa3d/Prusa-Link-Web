<!-- A filament's colour: a square for a G-code filament, a circle with its
     number for a printer slot, dashed when nothing is loaded. -->
<script lang="ts">
  import { textOn } from '../../lib/printer/tools';

  interface Props {
    color?: string | undefined;
    tool?: number | undefined;
    square?: boolean;
  }

  let { color, tool, square = false }: Props = $props();
</script>

<span
  class={[
    'grid shrink-0 place-items-center border text-xs font-semibold',
    square ? 'size-5 rounded-sm' : 'size-9 rounded-full',
    !color && 'border-dashed text-muted-foreground',
  ]}
  style:background-color={color}
  style:color={textOn(color)}>{tool ?? ''}</span
>
