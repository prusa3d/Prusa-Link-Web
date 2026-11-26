<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import StatusPanel from './status-panel.svelte';

  const { Story } = defineMeta({
    title: 'Status/StatusPanel',
    component: StatusPanel,
  });
</script>

<Story name="Connecting" args={{ status: undefined, job: undefined }} />

<Story
  name="Idle"
  args={{
    status: {
      state: 'IDLE',
      temp_nozzle: 22,
      target_nozzle: 0,
      temp_bed: 22,
      target_bed: 0,
    },
    job: undefined,
  }}
/>

<Story
  name="Printing"
  args={{
    status: {
      state: 'PRINTING',
      temp_nozzle: 215,
      target_nozzle: 215,
      temp_bed: 60,
      target_bed: 60,
    },
    job: { id: 7, progress: 42, time_remaining: 3660, time_printing: 2400 },
  }}
/>
