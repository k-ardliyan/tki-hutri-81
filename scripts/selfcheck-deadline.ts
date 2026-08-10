/**
 * Selfcheck — deadlineInfo (DeadlineBanner): logika tenggat penilaian dekor-5r.
 * Pure function, tanpa framework. Run: bun scripts/selfcheck-deadline.ts
 */
import { deadlineInfo } from '../src/components/5r/DeadlineBanner'

let failed = 0
const check = (name: string, cond: boolean, detail?: string) => {
  if (cond) console.log(`  ✓ ${name}`)
  else {
    failed++
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const base = new Date('2026-08-10T12:00:00+07:00')

// ── null deadline → terbuka, tanpa sisa hari ──
const off = deadlineInfo(null, base)
check('null → closed=false', off.closed === false)
check('null → daysLeft=null', off.daysLeft === null)

// ── deadline masa depan → terbuka + sisa hari ──
const future = deadlineInfo('2026-08-27T23:59:59+07:00', new Date('2026-08-10T12:00:00+07:00'))
check('masa depan → closed=false', future.closed === false)
check('masa depan → daysLeft=18', future.daysLeft === 18, `got ${future.daysLeft}`)

// ── deadline masa lalu → tertutup ──
const past = deadlineInfo('2026-08-09T23:59:59+07:00', new Date('2026-08-10T12:00:00+07:00'))
check('masa lalu → closed=true', past.closed === true)

// ── tepat di deadline (now === deadline) → closed (now > d false) ──
const exact = deadlineInfo('2026-08-10T12:00:00+07:00', new Date('2026-08-10T12:00:00+07:00'))
check('tepat deadline → closed=false (batas inklusif)', exact.closed === false)

// ── sisa hari pembulatan ke atas ──
const frac = deadlineInfo('2026-08-11T06:00:00+07:00', new Date('2026-08-10T12:00:00+07:00'))
check('sisa <1 hari → daysLeft=1 (ceil)', frac.daysLeft === 1, `got ${frac.daysLeft}`)

console.log(failed > 0 ? `✗ ${failed} check gagal` : '✓ Semua check lulus')
process.exit(failed > 0 ? 1 : 0)
