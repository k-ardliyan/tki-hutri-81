/**
 * Date utilities — shared across 5R pages.
 *
 * createdAt di DB = UTC (from new Date().toISOString()).
 * Filter harus pakai UTC date prefix supaya consistent.
 */

/** UTC date prefix (YYYY-MM-DD) — matches createdAt from DB. */
export function todayPrefix(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
