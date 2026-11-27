/// The reason in an error response, as the firmware words it: a status
/// page's `message` (or `text`), a refusal's `check`; undefined without one.
export async function reason(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.clone().json()) as Record<string, unknown>;
    const text = body.message ?? body.check ?? body.text;
    return typeof text === 'string' ? text : undefined;
  } catch {
    return undefined;
  }
}
