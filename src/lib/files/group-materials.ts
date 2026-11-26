/// A multi-tool file names one material per tool: shown as "PLA ×2", not
/// "PLA PLA".
export function groupMaterials(materials: readonly string[]): string[] {
  const counts = new Map<string, number>();
  for (const m of materials) counts.set(m, (counts.get(m) ?? 0) + 1);
  return [...counts].map(([m, n]) => (n > 1 ? `${m} ×${String(n)}` : m));
}
