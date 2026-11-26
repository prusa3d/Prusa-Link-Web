import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';

import StatusPanel from './status-panel.svelte';

describe('StatusPanel', () => {
  it('shows connecting before the first status', async () => {
    const screen = await render(StatusPanel, {
      status: undefined,
      job: undefined,
    });
    await expect
      .element(screen.getByRole('status', { name: 'Connecting…' }))
      .toBeInTheDocument();
  });

  it('shows state and job progress', async () => {
    const screen = await render(StatusPanel, {
      status: {
        state: 'PRINTING',
        temp_nozzle: 215,
        target_nozzle: 215,
        temp_bed: 60,
        target_bed: 60,
      },
      job: { id: 1, progress: 42, time_remaining: 3660, time_printing: 100 },
    });
    await expect
      .element(screen.getByTestId('job-percent'))
      .toHaveTextContent('42 %');
    await expect
      .element(screen.getByTestId('job-progress'))
      .toHaveTextContent('1h 1m left');
  });
});
