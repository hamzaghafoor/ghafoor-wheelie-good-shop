/**
 * Defensive de-duplication helpers.
 *
 * These are a last-resort safety net for list rendering. They do NOT fix
 * duplicated data at its source (RPC joins, concatenated pages, double
 * fetches) — they simply guarantee we never render the same record twice
 * in a UI list.
 *
 * Rules:
 * - Deduplicate by a *stable, unique* key (the database id whenever we have
 *   it). Never merge legitimately-different records that only look similar
 *   (e.g. two engine variants of the same model, or two pack sizes of the
 *   same lubricant).
 * - Preserve the original order of first occurrence — pagination, sort, and
 *   relevance orderings must not change.
 */

export function dedupeBy<T>(items: readonly T[] | undefined | null, key: (item: T) => string | number | null | undefined): T[] {
  if (!items?.length) return [];
  const seen = new Set<string | number>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (k === null || k === undefined || k === "") {
      // No stable key -> keep the row (do not collapse unknowns together).
      out.push(item);
      continue;
    }
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

/** Dedupe records that have an `id` field (vehicles, brands, products, variants, sections, finder options). */
export function dedupeById<T extends { id: string | number }>(items: readonly T[] | undefined | null): T[] {
  return dedupeBy(items, (x) => x.id);
}

/** Dedupe brands by id first, falling back to a case-insensitive normalized name. */
export function dedupeBrands<T extends { id?: string | number | null; name?: string | null }>(items: readonly T[] | undefined | null): T[] {
  if (!items?.length) return [];
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = item.id ? `id:${item.id}` : item.name ? `name:${item.name.trim().toLowerCase()}` : null;
    if (!key) { out.push(item); continue; }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
