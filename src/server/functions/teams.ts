/**
 * Server functions — Teams and team summary counts
 * HUT RI ke-81 · PT TKI x PT FTP
 *
 * Static data fallback until DATABASE_URL is configured.
 */
import { createServerFn } from '@tanstack/react-start'
import { dataKelompok, summaryKelompok } from '../../data/kelompok'
// import { assertDb } from '../db' // TODO: uncomment when DB ready

/**
 * Returns all teams with nested members.
 * Shape: Array<{ ...team, members: teamMember[] }>
 *
 * TODO: Replace with DB query when DATABASE_URL is set
 */
export const getTeams = createServerFn({ method: 'GET' }).handler(async () => {
  // const db = assertDb() // TODO: uncomment when DB ready
  // TODO: Replace with DB query when DATABASE_URL is set
  //
  // import { eq } from 'drizzle-orm'
  // import { teams, teamMembers } from '../db/schema'
  //
  // return db.query.teams.findMany({
  //   orderBy: (t, { asc }) => [asc(t.kategori), asc(t.nomor)],
  //   with: { members: { orderBy: (t, { asc }) => [asc(t.sortOrder)] } },
  // })

  // Static fallback — dataKelompok already contains nested anggota arrays
  return dataKelompok
})

/**
 * Returns team counts: { total, putra, putri }.
 *
 * TODO: Replace with DB query when DATABASE_URL is set
 */
export const getTeamSummary = createServerFn({ method: 'GET' }).handler(async () => {
  // const db = assertDb() // TODO: uncomment when DB ready
  // TODO: Replace with DB query when DATABASE_URL is set
  //
  // import { sql } from 'drizzle-orm'
  // import { teams } from '../db/schema'
  //
  // const rows = await db
  //   .select({ kategori: teams.kategori, count: sql<number>`count(*)::int` })
  //   .from(teams)
  //   .groupBy(teams.kategori)
  //
  // const putra = rows.find((r) => r.kategori === 'putra')?.count ?? 0
  // const putri = rows.find((r) => r.kategori === 'putri')?.count ?? 0
  // return { total: putra + putri, putra, putri }

  // Static fallback
  return summaryKelompok
})
