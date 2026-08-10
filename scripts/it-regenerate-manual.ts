/**
 * Integration test — regenerate MANUAL seeding (bug fix: server fn regenerate
 * tidak mengirim manualPositions → generateSeedOrder('MANUAL', undefined) throw).
 * Fix: regenerate MANUAL tanpa posisi baru → pertahankan urutan seed saat ini.
 * Data test dihapus setelah selesai. Run: bun scripts/it-regenerate-manual.ts
 */
import { db } from '../src/server/db'
import { brackets, competitions, teams } from '../src/server/db/schema'
import { tournamentService, type TournamentDb } from '../src/server/services/tournament'
import { eq } from 'drizzle-orm'

let failed = 0
const check = (name: string, cond: boolean, detail?: string) => {
  if (cond) console.log(`  ✓ ${name}`)
  else {
    failed++
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const td = db as unknown as TournamentDb
const bracketIds: number[] = []

async function cleanup() {
  for (const id of bracketIds) await (db!).delete(brackets).where(eq(brackets.id, id)).catch(() => {})
}

try {
  const [comp] = await (db!).select({ id: competitions.id }).from(competitions).where(eq(competitions.slug, 'balon')).limit(1)
  if (!comp) {
    console.log('✗ lomba balon tidak ada di DB — skip')
    process.exit(1)
  }
  const compId = comp.id
  // Bersihkan bracket putra existing (bila ada dari QA sebelumnya).
  const [ex] = await (db!).select({ id: brackets.id }).from(brackets).where(eq(brackets.kategori, 'putra')).limit(1)
  if (ex) await (db!).delete(brackets).where(eq(brackets.id, ex.id)).catch(() => {})

  // Team IDs dinamis dari DB (seed ulang menggeser sequence — jangan hardcode).
  const ids = (await (db!).select({ id: teams.id }).from(teams).where(eq(teams.kategori, 'putra')).orderBy(teams.nomor).limit(8)).map((t) => t.id)
  const [A, B, ...rest] = ids

  // ── setup: bracket MANUAL, posisi ditukar (B di posisi 1, A di posisi 2) ──
  const manual = new Map<number, number>([
    [A, 2],
    [B, 1],
    ...rest.map((id, i) => [id, i + 3] as [number, number]),
  ])
  const { bracketId } = await tournamentService.generate(td, {
    competitionId: compId,
    kategori: 'putra',
    teamIds: ids,
    seedingMethod: 'MANUAL',
    thirdPlaceEnabled: true,
    manualPositions: manual,
  })
  bracketIds.push(bracketId)
  check('generate MANUAL OK', bracketId > 0)

  // ── regenerate TANPA manualPositions (jalur server fn regenerateBracket) ──
  // Dulu throw "Seeding manual butuh posisi peserta" — sekarang pertahankan urutan.
  let regenOk = false
  let regenError = ''
  try {
    await tournamentService.regenerate(td, compId, 'putra')
    regenOk = true
  } catch (e) {
    regenError = e instanceof Error ? e.message : String(e)
  }
  check('regenerate MANUAL tanpa posisi → tidak throw', regenOk, regenError)

  const d = await tournamentService.detail(td, compId, 'putra')
  check('detail ada setelah regenerate', d !== null)
  if (d) {
    // Urutan seed harus dipertahankan: team B = seed 1, team A = seed 2.
    const seed1 = d.seeds.find((s) => s.seed === 1)
    const seed2 = d.seeds.find((s) => s.seed === 2)
    check(`seed 1 = ${B} (urutan dipertahankan)`, seed1?.teamId === B, `got ${seed1?.teamId}`)
    check(`seed 2 = ${A} (urutan dipertahankan)`, seed2?.teamId === A, `got ${seed2?.teamId}`)
    check('seedingMethod tetap MANUAL', d.bracket.seedingMethod === 'MANUAL')
  }
} finally {
  await cleanup()
}

console.log(failed > 0 ? `✗ ${failed} check gagal` : '✓ Semua check lulus')
process.exit(failed > 0 ? 1 : 0)
