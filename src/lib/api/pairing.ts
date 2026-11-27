import { Priority, queued } from './queue.svelte';

/// POST asks the printer to show `code` for pairing, GET reads the result,
/// DELETE withdraws the request. Status 0 when the printer did not answer.
///
/// The pairing endpoints answer without a key. Firmware without them checks
/// the key on every /api/v1 path, and a request with no X-Api-Key gets a
/// Digest challenge, which makes the browser ask for a password itself. A
/// placeholder key gets the ApiKey challenge instead, which it does not.
export async function pairingRequest(
  code: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
): Promise<{ status: number; key?: string | undefined }> {
  try {
    const res = await queued(
      () =>
        fetch(`/api/v1/pairing${method === 'POST' ? '' : `/${code}`}`, {
          method,
          headers: {
            'X-Api-Key': 'pairing',
            'Content-Type': 'application/json',
          },
          ...(method === 'POST' && {
            body: JSON.stringify({ code, client: 'PrusaLink' }),
          }),
        }),
      Priority.Action,
    );
    const body =
      res.status === 200 ? ((await res.json()) as { api_key?: string }) : {};
    return { status: res.status, key: body.api_key };
  } catch {
    return { status: 0 };
  }
}
