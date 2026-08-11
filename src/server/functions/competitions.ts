/**
 * Server functions — Competitions and competition detail
 * HUT RI ke-81 · PT TKI x PT FTP
 *
 * Static data fallback until DATABASE_URL is configured.
 */
import { createServerFn } from '@tanstack/react-start';
import { competitions } from '../../data/content';
// import { assertDb } from '../db' // TODO: uncomment when DB ready

/**
 * Returns all competitions with nested sections.
 *
 * TODO: Replace with DB query when DATABASE_URL is set
 */
export const getCompetitions = createServerFn({ method: 'GET' }).handler(async () => {
  // const db = assertDb() // TODO: uncomment when DB ready
  // TODO: Replace with DB query when DATABASE_URL is set
  //
  // import { eq } from 'drizzle-orm'
  // import { competitions as competitionsTable, competitionSections } from '../db/schema'
  //
  // return db.query.competitions.findMany({
  //   orderBy: (t, { asc }) => [asc(t.sortOrder)],
  //   with: { sections: { orderBy: (t, { asc }) => [asc(t.sortOrder)] } },
  // })

  // Static fallback
  return competitions;
});

/**
 * Returns a single competition by slug with all sections.
 *
 * TODO: Replace with DB query when DATABASE_URL is set
 */
export const getCompetition = createServerFn({ method: 'GET' })
  .validator((slug: string) => ({ slug }))
  .handler(async ({ data }) => {
    // const db = assertDb() // TODO: uncomment when DB ready
    // TODO: Replace with DB query when DATABASE_URL is set
    //
    // import { eq } from 'drizzle-orm'
    // import { competitions as competitionsTable, competitionSections } from '../db/schema'
    //
    // return db.query.competitions.findFirst({
    //   where: eq(competitionsTable.slug, data.slug),
    //   with: { sections: { orderBy: (t, { asc }) => [asc(t.sortOrder)] } },
    // })

    // Static fallback — competitions use id as the slug key
    return competitions.find((c) => c.id === data.slug) ?? null;
  });
