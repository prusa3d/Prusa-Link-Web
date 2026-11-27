import { api } from '../../lib/api/client';

/// The printer's diagnostics (PrusaLink 2 `crash_dump`): a crash dump from
/// an earlier crash, not yet sent, and logging to /usb/log.txt.
class DiagnosticsStore {
  /// A crash dump waits to be sent.
  dump = $state(false);
  logToFile = $state<boolean | undefined>();

  async refresh() {
    const { data } = await api.GET('/api/v1/diagnostics');
    this.dump = !!data?.crash_dump?.present && !data.crash_dump.exported;
    this.logToFile = data?.log_to_file;
  }

  /// Marks the dump sent; it stays on the printer, as on its screen.
  async dismiss() {
    const { response } = await api.DELETE('/api/v1/diagnostics/dump');
    if (response.ok) this.dump = false;
  }

  async setLog(on: boolean) {
    const { response } = await api.PUT('/api/v1/diagnostics', {
      body: { log_to_file: on },
    });
    if (response.ok) this.logToFile = on;
    return response.ok;
  }
}

export const diagnostics = new DiagnosticsStore();
