/**
 * Integration test: generate → submit 6 match → koreksi SF1 (invalidate) →
 * verifikasi QF/SF2 utuh + downstream reset → submit ulang → podium.
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
const competitionId = comp?.id ?? 1

// Team IDs dinamis dari DB (seed ulang menggeser sequence — jangan hardcode).
const ids = (await (db!).select({ id: teams.id }).from(teams).where(eq(teams.kategori, 'putra')).orderBy(teams.nomor).limit(8)).map((t) => t.id)
const [A, , C, , E, , G] = ids

// Hapus bracket putra existing (test bersih).
const [ex] = await (db!).select().from(brackets).where(eq(brackets.kategori, 'putra')).limit(1)
if (ex) await tournamentService.remove(td, ex.id)

const { bracketId } = await tournamentService.generate(td, {
  competitionId,
  kategori: 'putra',
  teamIds: ids,
  seedingMethod: 'REGISTRATION_ORDER',
  thirdPlaceEnabled: true,
})
console.log('generate OK, bracket', bracketId)

let detail = await tournamentService.detail(td, competitionId, 'putra')
const main = detail!.rounds.filter((r) => r.roundType === 'MAIN')
check('3 main rounds', main.length === 3)
check('8 match total', main.reduce((a, r) => a + r.matches.length, 0) + (detail!.thirdPlaceMatch ? 1 : 0) === 8)
check('QF semua READY', main[0].matches.every((m) => m.status === 'READY'))
check('SF menunggu', main[1].matches.every((m) => m.status === 'WAITING'))
check('seeds 1..8 = urutan registrasi', JSON.stringify(detail!.seeds.map((s) => s.teamId)) === JSON.stringify(ids))
check('slots 8 tanpa BYE', detail!.slots.length === 8 && detail!.slots.every((s) => !s.bye && s.seed === s.slot))
check('M1 seed1=1 seed2=2', main[0].matches[0].seed1 === 1 && main[0].matches[0].seed2 === 2)

// Publish.
await tournamentService.publish(td, bracketId)

// Submit QF: pemenang = participant1 semua (A,C,E,G).
const submit = async (matchId: number, winnerId: number) => {
  const d = await tournamentService.detail(td, competitionId, 'putra')
  const all = d!.rounds.flatMap((r) => r.matches)
  const m = all.find((x) => x.id === matchId) ?? (d!.thirdPlaceMatch?.id === matchId ? d!.thirdPlaceMatch : null)
  return tournamentService.submitResult(td, { matchId, winnerId, expectedVersion: m!.version })
}
const qf = main[0].matches
for (const m of qf) await submit(m.id, m.participant1Id!)
check(`QF M1 winner=${A}`, (await tournamentService.detail(td, competitionId, 'putra'))!.rounds[0].matches[0].winnerId === A)

detail = await tournamentService.detail(td, competitionId, 'putra')
const sf = detail!.rounds.filter((r) => r.roundType === 'MAIN')[1]
check(`SF1 = ${A} vs ${C}`, sf.matches[0].participant1Id === A && sf.matches[0].participant2Id === C)
check(`SF2 = ${E} vs ${G}`, sf.matches[1].participant1Id === E && sf.matches[1].participant2Id === G)
check('SF READY', sf.matches.every((m) => m.status === 'READY'))

for (const m of sf.matches) await submit(m.id, m.participant1Id!)
detail = await tournamentService.detail(td, competitionId, 'putra')
const final = detail!.rounds.filter((r) => r.roundType === 'MAIN')[2]
check(`Final = ${A} vs ${E}`, final.matches[0].participant1Id === A && final.matches[0].participant2Id === E)
const tp = detail!.thirdPlaceMatch
check(`Third = ${C} vs ${G} (losers SF)`, tp?.participant1Id === C && tp?.participant2Id === G)
check('Final READY', final.matches[0].status === 'READY')
check('Third READY', tp?.status === 'READY')

await submit(final.matches[0].id, A)
await submit(tp!.id, C)
detail = await tournamentService.detail(td, competitionId, 'putra')
check('Status COMPLETED', detail!.bracket.status === 'COMPLETED')
check(`Podium ${A}/${E}/${C}`, JSON.stringify(detail!.podium) === `{"rank1":${A},"rank2":${E},"rank3":${C}}`)

// ── Koreksi SF1: pemenang A → C (invalidate downstream) ──
const sf1 = detail!.rounds.filter((r) => r.roundType === 'MAIN')[1].matches[0]
// Blok tanpa invalidate.
let blocked = false
try {
  await tournamentService.correctResult(td, { matchId: sf1.id, winnerId: C, invalidateDownstream: false })
} catch (e) {
  blocked = e instanceof Error && e.message.includes('membatalkan')
}
check('Koreksi tanpa konfirmasi → blok', blocked)

await tournamentService.correctResult(td, { matchId: sf1.id, winnerId: C, invalidateDownstream: true, reason: 'tes koreksi' })
detail = await tournamentService.detail(td, competitionId, 'putra')
const qfAfter = detail!.rounds.filter((r) => r.roundType === 'MAIN')[0]
const sfAfter = detail!.rounds.filter((r) => r.roundType === 'MAIN')[1]
const finalAfter = detail!.rounds.filter((r) => r.roundType === 'MAIN')[2]
check('QF tetap COMPLETED (tidak tersentuh)', qfAfter.matches.every((m) => m.status === 'COMPLETED'))
check('SF2 tetap COMPLETED (sibling utuh)', sfAfter.matches[1].status === 'COMPLETED')
check(`SF1 winner berubah ${C}`, sfAfter.matches[0].winnerId === C)
check('Final di-reset → READY (siap diinput ulang)', finalAfter.matches[0].status === 'READY')
check(`Final peserta recompute = ${C} vs ${E}`, finalAfter.matches[0].participant1Id === C && finalAfter.matches[0].participant2Id === E)
check('Third di-reset → READY', detail!.thirdPlaceMatch?.status === 'READY')
check(`Third peserta recompute = ${A} vs ${G}`, detail!.thirdPlaceMatch?.participant1Id === A && detail!.thirdPlaceMatch?.participant2Id === G)
check('Status turun IN_PROGRESS', detail!.bracket.status === 'IN_PROGRESS')
check('Podium dikosongkan', JSON.stringify(detail!.podium) === '{"rank1":null,"rank2":null,"rank3":null}')

// Isi ulang final + third → podium baru C/E/A.
await submit(finalAfter.matches[0].id, C)
await submit(detail!.thirdPlaceMatch!.id, A)
detail = await tournamentService.detail(td, competitionId, 'putra')
check('COMPLETED lagi', detail!.bracket.status === 'COMPLETED')
check(`Podium baru ${C}/${E}/${A}`, JSON.stringify(detail!.podium) === `{"rank1":${C},"rank2":${E},"rank3":${A}}`)

// ── Reload stability: seeding deterministik (REGISTRATION_ORDER) ──
const again = await tournamentService.detail(td, competitionId, 'putra')
check('Reload: QF peserta sama', JSON.stringify(again!.rounds[0].matches.map((m) => [m.participant1Id, m.participant2Id])) === JSON.stringify(detail!.rounds[0].matches.map((m) => [m.participant1Id, m.participant2Id])))

// Bersihkan test.
await tournamentService.remove(td, bracketId)
console.log(failed > 0 ? `✗ ${failed} check gagal` : '✓ Semua integration check lulus')
process.exit(failed > 0 ? 1 : 0)
