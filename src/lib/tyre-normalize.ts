// Normalize any accepted tyre-size input into "NNN/NN RNN"
// Accepts: "195/65R15", "195 65 R15", "195-65-15", "195 65", "195/65 R15", etc.
export function normalizeMetricSize(input: string): string | null {
  if (!input) return null;
  const cleaned = input.trim().toUpperCase().replace(/[×X]/g, "");
  const m = cleaned.match(/^(\d{3})\s*[\/\-\s]\s*(\d{2})\s*[\/\-\s]*R?\s*(\d{1,2}(?:\.\d)?)$/);
  if (!m) return null;
  const [, w, p, r] = m;
  return `${w}/${p} R${r}`;
}

export function buildMetricSize(width: number | string, profile: number | string, rim: number | string): string {
  return `${width}/${profile} R${rim}`;
}
