/**
 * Integration: BYE — 5 peserta → bracket 8, 3 BYE auto-advance (shift slot).
 * Shift (BYE-BYE dihindari): M1=71vBYE, M2=73v74, M3=75vBYE, M4=72vBYE.
 */
import { db } from '../src/server/db'
import { brackets, competitions, teams } from '../src/server/db/schema'
import { eq } from 'drizzle-orm'
import { tournamentService, type TournamentDb } from '../src/server/services/tournament'

const td = db as unknown as TournamentDb
let failed = 0
const check = (name: string, cond: boolean, detail?: string) => {
  if (cond) console.log(`  ✓ ${name}`)
  else {
    failed++
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const [comp] = await (db!).select({ id: competitions.id }).from(competitions).where(eq(competitions.slug, 'balon')).limit(1)
const competitionId = comp!.id

// Team IDs dinamis dari DB (seed ulang menggeser sequence — jangan hardcode).
const ids = (await (db!).select({ id: teams.id }).from(teams).where(eq(teams.kategori, 'putri')).orderBy(teams.nomor).limit(5)).map((t) => t.id)
const [P1, P2, P3, P4, P5] = ids

const [ex] = await (db!).select().from(brackets).where(eq(brackets.kategori, 'putri')).limit(1)
if (ex) await tournamentService.remove(td, ex.id)

const { bracketId } = await tournamentService.generate(td, {
  competitionId,
  kategori: 'putri',
  teamIds: ids,
  seedingMethod: 'REGISTRATION_ORDER',
  thirdPlaceEnabled: false,
})
let d = await tournamentService.detail(td, competitionId, 'putri')
check('bracket size 8', d!.bracket.bracketSize === 8)
check('participant 5', d!.bracket.participantCount === 5)
const qf = d!.rounds[0].matches
check('QF 4 match', qf.length === 4)
check(`M1 = ${P1} vs BYE (AUTO)`, qf[0].participant1Id === P1 && qf[0].participant2Id === null && qf[0].status === 'AUTO_ADVANCED' && qf[0].winnerId === P1)
check(`M2 = ${P3} vs ${P4} (READY)`, qf[1].participant1Id === P3 && qf[1].participant2Id === P4 && qf[1].status === 'READY')
check(`M3 = ${P5} vs BYE (AUTO)`, qf[2].participant1Id === P5 && qf[2].participant2Id === null && qf[2].status === 'AUTO_ADVANCED' && qf[2].winnerId === P5)
check(`M4 = ${P2} vs BYE (AUTO, shift)`, qf[3].participant1Id === P2 && qf[3].participant2Id === null && qf[3].status === 'AUTO_ADVANCED' && qf[3].winnerId === P2)
const sf = d!.rounds[1].matches
check(`SF1 = ${P1} vs menunggu M2 (WAITING)`, sf[0].participant1Id === P1 && sf[0].participant2Id === null && sf[0].status === 'WAITING')
check(`SF2 = ${P5} vs ${P2} (READY, BYE advance)`, sf[1].participant1Id === P5 && sf[1].participant2Id === P2 && sf[1].status === 'READY')
check('slots BYE shift (seed 2 pindah ke slot 7)', JSON.stringify(d!.slots.map((s) => (s.bye ? 'B' : String(s.seed)))) === '["1","B","3","4","5","B","2","B"]')
check(`slot 7 = seed 2 (${P2})`, d!.slots.find((s) => s.slot === 7)?.teamId === P2)
check('M4 = seed 2 vs BYE (badge seed)', qf[3].seed1 === 2 && qf[3].seed2 === null)

// Submit match AUTO → harus ditolak.
let autoRejected = false
try {
  await tournamentService.submitResult(td, { matchId: qf[0].id, winnerId: P1, expectedVersion: 1 })
} catch {
  autoRejected = true
}
check('Submit match BYE (AUTO) → ditolak', autoRejected)

await tournamentService.publish(td, bracketId)
d = await tournamentService.detail(td, competitionId, 'putri')
const sf2 = d!.rounds[1].matches
check('SF2 tetap READY setelah publish', sf2[1].status === 'READY')

await tournamentService.remove(td, bracketId)
console.log(failed > 0 ? `✗ ${failed} check gagal` : '✓ Semua BYE check lulus')
process.exit(failed > 0 ? 1 : 0)
