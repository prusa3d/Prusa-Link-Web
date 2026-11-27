import { Priority, queued } from './queue.svelte';
import { session } from '../auth/session.svelte';

/// The printer's crash dump as a file, named as the printer names it;
/// undefined without one. The API client reads text; the dump is binary.
export async function fetchDump(): Promise<File | undefined> {
  const headers: Record<string, string> = {};
  if (session.key) headers['X-Api-Key'] = session.key;
  const response = await queued(
    () => fetch('/api/v1/diagnostics/dump', { headers }),
    Priority.Action,
  );
  if (!response.ok) return undefined;
  const name =
    /filename\*=UTF-8''([^;]+)/.exec(
      response.headers.get('content-disposition') ?? '',
    )?.[1] ?? 'dump.bin';
  return new File([await response.blob()], decodeURIComponent(name));
}
