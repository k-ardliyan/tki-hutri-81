/**
 * Integration test — aturan lomba dekor-5r (per-minggu):
 * 1) Form dekorasi: SEKALI per (ruangan, auditor) via partial unique index.
 * 2) Form 5R: SEKALI per (ruangan, form, MINGGU, auditor) via five_r_submissions_5r_weekly.
 * 3) Form 5R: minggu beda → boleh dua-duanya (week_number beda).
 * Data test dihapus setelah selesai. Run: bun scripts/it-dekorasi.ts
 */

import { eq } from 'drizzle-orm';
import { db } from '../src/server/db';
import { fiveRSubmissions } from '../src/server/db/schema';

let failed = 0;
const check = (name: string, cond: boolean, detail?: string) => {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

const TEST_IDS: string[] = [];
const sub = (
  id: string,
  roomId: string,
  formId: string,
  createdBy: string,
  day: string,
  weekNumber = 1
) => ({
  id,
  roomId,
  formId,
  auditor: 'Test Auditor',
  createdBy,
  answers: {},
  notes: {},
  submittedAt: new Date(`${day}T10:00:00+07:00`),
  createdAt: new Date(`${day}T10:00:00+07:00`),
  updatedAt: new Date(`${day}T10:00:00+07:00`),
  weekNumber,
});

async function cleanup() {
  for (const id of TEST_IDS)
    await db!
      .delete(fiveRSubmissions)
      .where(eq(fiveRSubmissions.id, id))
      .catch(() => {});
}

const isUniqueViolation = (e: unknown) => {
  const code = (e as { code?: string }).code ?? (e as { cause?: { code?: string } }).cause?.code;
  return code === '23505';
};

// ── 1) dekorasi sekali per (ruangan, auditor) ──
const a1 = sub('it-dekor-a1', 'sales', 'dekorasi', 'user-x', '2026-08-10');
await db!.insert(fiveRSubmissions).values(a1);
TEST_IDS.push(a1.id);
check('dekorasi (sales, X) masuk', true);

let dupBlocked = false;
try {
  await db!
    .insert(fiveRSubmissions)
    .values(sub('it-dekor-a2', 'sales', 'dekorasi', 'user-x', '2026-08-10'));
  TEST_IDS.push('it-dekor-a2');
} catch (e) {
  dupBlocked = isUniqueViolation(e);
}
check('dekorasi (sales, X) kedua → 23505', dupBlocked);

const a3 = sub('it-dekor-a3', 'sales', 'dekorasi', 'user-y', '2026-08-10');
await db!.insert(fiveRSubmissions).values(a3);
TEST_IDS.push(a3.id);
check('dekorasi (sales, Y) masuk (auditor beda)', true);

// ── 2) 5R SEKALI per (ruangan, form, minggu, auditor) ──
const b1 = sub('it-dekor-b1', 'sales', 'office-smoking', 'user-x', '2026-08-10', 1);
await db!.insert(fiveRSubmissions).values(b1);
TEST_IDS.push(b1.id);
check('office-smoking (sales, X) minggu 1 masuk', true);

let weekDupBlocked = false;
try {
  await db!
    .insert(fiveRSubmissions)
    .values(sub('it-dekor-b2', 'sales', 'office-smoking', 'user-x', '2026-08-11', 1));
  TEST_IDS.push('it-dekor-b2');
} catch (e) {
  weekDupBlocked = isUniqueViolation(e);
}
check('office-smoking (sales, X) minggu 1 kedua → 23505', weekDupBlocked);

// ── 3) 5R minggu beda → boleh ──
const b3 = sub('it-dekor-b3', 'sales', 'office-smoking', 'user-x', '2026-08-17', 2);
await db!.insert(fiveRSubmissions).values(b3);
TEST_IDS.push(b3.id);
check('office-smoking (sales, X) minggu 2 masuk (minggu beda)', true);

const b4 = sub('it-dekor-b4', 'sales', 'office-smoking', 'user-y', '2026-08-10', 1);
await db!.insert(fiveRSubmissions).values(b4);
TEST_IDS.push(b4.id);
check('office-smoking (sales, Y) minggu 1 masuk (auditor beda)', true);

// ── 4) Form beda, minggu sama → boleh (unique per formId) ──
const b5 = sub('it-dekor-b5', 'sales', 'office-non-smoking', 'user-x', '2026-08-10', 1);
await db!.insert(fiveRSubmissions).values(b5);
TEST_IDS.push(b5.id);
check('office-non-smoking (sales, X) minggu 1 masuk (form beda)', true);

// ── Catatan ──
// getSettings/setSettings RPC butuh server runtime — tidak bisa dipanggil dari
// script. Guard role setSettings diverifikasi manual via browser QA (login admin).

await cleanup();
console.log(failed > 0 ? `✗ ${failed} check gagal` : '✓ Semua check lulus');
process.exit(failed > 0 ? 1 : 0);
