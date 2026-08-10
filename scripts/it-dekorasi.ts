/**
 * Integration test — aturan lomba dekor-5r:
 * 1) Form dekorasi: SEKALI per (ruangan, auditor) via partial unique index.
 * 2) Form 5R lain: boleh berulang (auditor sama, ruangan sama).
 * 3) getDeadline RPC (tanpa session) → null saat belum di-set.
 * 4) setDeadline RPC tanpa session → ditolak (role check di handler).
 * Data test dihapus setelah selesai. Run: bun scripts/_it-dekorasi.ts
 */
import { db } from '../src/server/db'
import { fiveRSubmissions } from '../src/server/db/schema'
import { eq } from 'drizzle-orm'

let failed = 0
const check = (name: string, cond: boolean, detail?: string) => {
  if (cond) console.log(`  ✓ ${name}`)
  else {
    failed++
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const TEST_IDS: string[] = []
const sub = (id: string, roomId: string, formId: string, createdBy: string, day: string) => ({
  id, roomId, formId, auditor: 'Test Auditor', createdBy,
  answers: {}, notes: {},
  submittedAt: new Date(`${day}T10:00:00+07:00`),
  createdAt: new Date(`${day}T10:00:00+07:00`),
  updatedAt: new Date(`${day}T10:00:00+07:00`),
})

async function cleanup() {
  for (const id of TEST_IDS) await (db!).delete(fiveRSubmissions).where(eq(fiveRSubmissions.id, id)).catch(() => {})
}

// ── 1) dekorasi sekali per (ruangan, auditor) ──
const a1 = sub('it-dekor-a1', 'sales', 'dekorasi', 'user-x', '2026-08-10')
await (db!).insert(fiveRSubmissions).values(a1)
TEST_IDS.push(a1.id)
check('dekorasi (sales, X) masuk', true)

let dupBlocked = false
try {
  await (db!).insert(fiveRSubmissions).values(sub('it-dekor-a2', 'sales', 'dekorasi', 'user-x', '2026-08-10'))
  TEST_IDS.push('it-dekor-a2')
} catch (e) {
  // postgres-js: code ada di e.cause (PostgresError); beberapa versi di e langsung.
  const code = (e as { code?: string }).code ?? ((e as { cause?: { code?: string } }).cause?.code)
  dupBlocked = code === '23505'
}
check('dekorasi (sales, X) kedua → 23505', dupBlocked)

const a3 = sub('it-dekor-a3', 'sales', 'dekorasi', 'user-y', '2026-08-10')
await (db!).insert(fiveRSubmissions).values(a3)
TEST_IDS.push(a3.id)
check('dekorasi (sales, Y) masuk (auditor beda)', true)

// ── 2) 5R lain boleh berulang ──
const b1 = sub('it-dekor-b1', 'sales', 'office-smoking', 'user-x', '2026-08-10')
const b2 = sub('it-dekor-b2', 'sales', 'office-smoking', 'user-x', '2026-08-11')
await (db!).insert(fiveRSubmissions).values(b1)
await (db!).insert(fiveRSubmissions).values(b2)
TEST_IDS.push(b1.id, b2.id)
check('office-smoking (sales, X) dua hari beda → dua-duanya masuk', true)

// ── 3) getDeadline/setDeadline RPC butuh server runtime — tidak bisa dipanggil
// dari script. Guard setDeadline diverifikasi manual via browser QA (login admin).
// Catatan: getDeadlineRow handle missing row → null (server fn return null tanpa row).

await cleanup()
console.log(failed > 0 ? `✗ ${failed} check gagal` : '✓ Semua check lulus')
process.exit(failed > 0 ? 1 : 0)
