/**
 * Selfcheck — getEventPhase phase boundaries (pure, no DB).
 * Guards the SSR deterministic fallback date used by Countdown/HomePage/EventStatusReminder.
 * Run: bun scripts/selfcheck-event-phase.ts
 */
import { getEventPhase, PHASES } from '../src/lib/eventPhase';

let failed = 0;
const check = (name: string, cond: boolean, detail?: string) => {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

const id = (d: string | null) => getEventPhase(d).id;

check('01 Ags → PRE_EVENT', id('2026-08-01T09:00:00') === PHASES.PRE_EVENT);
check('03 Ags 10:00 → SOSIALISASI', id('2026-08-03T10:00:00') === PHASES.SOSIALISASI);
check('05 Ags 14:00 → DEKORASI', id('2026-08-05T14:00:00') === PHASES.DEKORASI);
check('11 Ags 09:00 → PENILAIAN_5R_AWAL', id('2026-08-11T09:00:00') === PHASES.PENILAIAN_5R_AWAL);
check('13 Ags 00:30 → HARI_PUNCAK_PRE', id('2026-08-13T00:30:00') === PHASES.HARI_PUNCAK_PRE);
check('13 Ags 13:00 → HARI_PUNCAK_LIVE', id('2026-08-13T13:00:00') === PHASES.HARI_PUNCAK_LIVE);
check('14 Ags → PENILAIAN_5R_LANJUT', id('2026-08-14T09:00:00') === PHASES.PENILAIAN_5R_LANJUT);
check('28 Ags 00:30 → PENGUMUMAN_DAY', id('2026-08-28T00:30:00') === PHASES.PENGUMUMAN_DAY);
check('29 Ags → FINISHED', id('2026-08-29T09:00:00') === PHASES.FINISHED);

// SSR deterministic fallback used by Countdown/HomePage/EventStatusReminder.
// Must be a STABLE phase (not PRE_EVENT) so hydration renders the same
// structure server & client before the post-mount effect computes the real phase.
const fallback = id('2026-08-13T12:00:00');
check(
  'SSR fallback date → HARI_PUNCAK_PRE (stable, non-PRE_EVENT)',
  fallback === PHASES.HARI_PUNCAK_PRE,
  `got ${fallback}`
);

// null → live Date.now() path must not crash and must return a known phase id.
const live = id(null);
check(
  'null (real time) → known phase',
  Object.values(PHASES).includes(live as (typeof PHASES)[keyof typeof PHASES]),
  `got ${live}`
);

console.log(failed > 0 ? `✗ ${failed} check gagal` : '✓ Semua check lulus');
process.exit(failed > 0 ? 1 : 0);
