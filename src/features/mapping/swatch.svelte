<!-- A filament's colour: a square for a G-code filament, a circle with its
     number for a printer tool, dashed when nothing is loaded, ringed when
     picked. -->
<script lang="ts">
  import { textOn } from '../../lib/printer/tools';

  interface Props {
    color?: string | undefined;
    tool?: number | undefined;
    square?: boolean;
    selected?: boolean;
  }

  let { color, tool, square = false, selected = false }: Props = $props();
</script>

<span
  class={[
    'grid shrink-0 place-items-center border text-xs font-semibold',
    square ? 'size-5 rounded-sm' : 'size-9 rounded-full',
    !color && 'border-dashed text-muted-foreground',
    selected && 'ring-2 ring-primary ring-offset-2 ring-offset-card',
  ]}
  style:background-color={color}
  style:color={textOn(color)}>{tool ?? ''}</span
>
