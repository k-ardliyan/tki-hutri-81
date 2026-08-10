/**
 * Server functions — Event phases (phase detection & simulation)
 * HUT RI ke-81 · PT TKI x PT FTP
 *
 * Static data fallback until DATABASE_URL is configured.
 */
import { createServerFn } from '@tanstack/react-start';
import { getEventPhase, PHASES, SIMULATED_DATES } from '../../lib/eventPhase';
// import { assertDb } from '../db' // TODO: uncomment when DB ready

/**
 * Returns all event phases ordered by sort_order.
 * Also re-exports the helper functions and simulation dates.
 *
 * TODO: Replace with DB query when DATABASE_URL is set
 */
export const getEventPhases = createServerFn({ method: 'GET' }).handler(async () => {
  // const db = assertDb() // TODO: uncomment when DB ready
  // TODO: Replace with DB query when DATABASE_URL is set
  //
  // import { eq } from 'drizzle-orm'
  // import { eventPhases } from '../db/schema'
  //
  // return db.query.eventPhases.findMany({
  //   orderBy: (t, { asc }) => [asc(t.sortOrder)],
  // })

  // Static fallback
  return Object.values(PHASES);
});

/**
 * Returns the current event phase based on the current date (or a simulated date).
 * Delegates to the static getEventPhase helper for now.
 */
export const getCurrentPhase = createServerFn({ method: 'GET' })
  .validator((simDate: string | null) => ({ simDate }))
  .handler(async ({ data }) => {
    // const db = assertDb() // TODO: uncomment when DB ready
    // TODO: Replace with DB query when DATABASE_URL is set
    //
    // The DB version would look up event_phases by comparing current
    // timestamp against target_date ranges in the table.

    // Static fallback — use the existing helper
    return (getEventPhase as Function)(data.simDate);
  });

/**
 * Returns simulated dates for the admin phase selector.
 */
export const getSimulatedDates = createServerFn({ method: 'GET' }).handler(async () => {
  // const db = assertDb() // TODO: uncomment when DB ready
  // TODO: Replace with DB query when DATABASE_URL is set
  return SIMULATED_DATES;
});
