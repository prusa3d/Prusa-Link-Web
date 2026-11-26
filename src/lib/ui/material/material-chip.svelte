<!-- A filament type, always with the spool icon. -->
<script lang="ts">
  import { TelemetryIcon } from '../telemetry-icon';

  interface Props {
    name: string;
  }

  let { name }: Props = $props();
</script>

<span
  class="inline-flex items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5 font-medium text-foreground"
>
  <TelemetryIcon
    kind="spool"
    size="size-3.5"
    class="text-muted-foreground"
  />{name}
</span>
