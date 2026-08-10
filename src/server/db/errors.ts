/**
 * Error helpers — postgres-js.
 * postgres-js: code di e.cause (PostgresError); beberapa versi di e langsung.
 */
export function isUniqueViolation(err: unknown): boolean {
  const code = (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code
  return code === '23505'
}
