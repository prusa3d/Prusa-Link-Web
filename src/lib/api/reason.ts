/// The reason in an error answer (the API client's `error`), as the
/// firmware words it: a refusal's JSON `check` (or `message`, `text`), or
/// the text of a status page, "409: Conflict\n\nDock position not
/// calibrated".
export function reason(error: unknown): string | undefined {
  if (typeof error === 'string')
    return /^\d{3}: [^\n]*\n\n(.+)/s.exec(error)?.[1]?.trim();
  if (typeof error !== 'object' || !error) return undefined;
  const body = error as Record<string, unknown>;
  const said = body.check ?? body.message ?? body.text;
  return typeof said === 'string' ? said : undefined;
}
