/**
 * Server functions — Rundown phases with nested items
 * HUT RI ke-81 · PT TKI x PT FTP
 *
 * Static data fallback until DATABASE_URL is configured.
 */
import { createServerFn } from '@tanstack/react-start';
import { rundown } from '../../data/content';
// import { assertDb } from '../db' // TODO: uncomment when DB ready

/**
 * Returns all rundown phases with nested rundown_items.
 * Shape: Array<{ ...phase, items: rundownItem[] }>
 *
 * TODO: Replace with DB query when DATABASE_URL is set
 */
export const getRundown = createServerFn({ method: 'GET' }).handler(async () => {
  // const db = assertDb() // TODO: uncomment when DB ready
  // TODO: Replace with DB query when DATABASE_URL is set
  //
  // import { eq } from 'drizzle-orm'
  // import { rundownPhases, rundownItems } from '../db/schema'
  //
  // const phases = await db.query.rundownPhases.findMany({
  //   orderBy: (t, { asc }) => [asc(t.sortOrder)],
  //   with: { items: { orderBy: (t, { asc }) => [asc(t.sortOrder)] } },
  // })
  // return phases

  // Static fallback — data already has nested items
  return rundown;
});
