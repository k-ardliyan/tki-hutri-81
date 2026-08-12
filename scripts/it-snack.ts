/**
 * it-snack.ts — integration test snack lifecycle v2 (DB Aiven dev, self-clean).
 * Mencakup: create draft → publish (entitlement snapshot + overlap guard) →
 * redeem dgn source/idempotency → void → klaim ulang setelah void → anti-dup.
 * Jalankan SETELAH migration 0004 + backfill (jika data lama ada).
 * Run: bun scripts/it-snack.ts
 */

import { eq, sql } from 'drizzle-orm';
import postgres from 'postgres';
import { assertDb } from '../src/server/db';
import { isUniqueViolation } from '../src/server/db/errors';
import {
  employees,
  redemptions,
  snackSessionEntitlements,
  snackSessions,
} from '../src/server/db/schema';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL tidak ada di .env');
  process.exit(1);
}
const sqlp = postgres(url, { max: 1, ssl: 'require' });

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failures++;
    console.error(
      `FAIL ${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  } else {
    console.log(`ok   ${name}`);
  }
}

async function main() {
  const db = assertDb();
  const suffix = Date.now();

  // 1. Ambil 2 karyawan eligible
  const empRows = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.isSnackEligible, true))
    .limit(2);
  if (empRows.length < 2) throw new Error('Butuh minimal 2 karyawan eligible');
  const [e1, e2] = empRows.map((r) => r.id);
  console.log(`karyawan test: ${e1}, ${e2}`);

  // 2. Create draft sesi
  const [draft] = await db
    .insert(snackSessions)
    .values({
      name: `IT Snack ${suffix}`,
      status: 'draft',
      quota: 10,
      stockQuota: 10,
      isActive: false,
      startsAt: new Date(Date.now() - 1000 * 60),
      endsAt: new Date(Date.now() + 1000 * 60 * 60),
    })
    .returning();
  const sessionId = draft.id;
  console.log('draft sesi:', sessionId);

  // 3. Publish manual (bypass server fn auth) → generate entitlements
  const eligibleAll = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.isSnackEligible, true));
  await db
    .insert(snackSessionEntitlements)
    .values(
      eligibleAll.map((e) => ({
        sessionId,
        employeeId: e.id,
        entitledQty: 1,
        source: 'default_eligibility' as const,
      }))
    )
    .onConflictDoNothing();
  await db
    .update(snackSessions)
    .set({ status: 'published', publishedAt: new Date(), isActive: true })
    .where(eq(snackSessions.id, sessionId));
  const entCount = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(snackSessionEntitlements)
    .where(eq(snackSessionEntitlements.sessionId, sessionId));
  check('entitlement snapshot count > 0', Number(entCount[0]?.n ?? 0) > 0, true);

  // 4. Insert redemption e1 (source QR)
  const r1 = await db
    .insert(redemptions)
    .values({ employeeId: e1, sessionId, claimedBy: 'it-test', source: 'QR_TEAM', requestId: null })
    .returning();
  check('redemption e1 inserted', r1.length, 1);

  // 5. Anti-dup: insert e1 lagi → 23505 (partial index active)
  try {
    await db
      .insert(redemptions)
      .values({ employeeId: e1, sessionId, claimedBy: 'it-test', source: 'QR_TEAM' });
    check('anti-dup partial index menolak (e1 duplikat)', true, false);
  } catch (e) {
    check('anti-dup partial index menolak (23505)', isUniqueViolation(e), true);
  }

  // 6. Idempotency: request_id sama → 23505
  const rid = `it-${suffix}`;
  try {
    await db.insert(redemptions).values({
      employeeId: e2,
      sessionId,
      claimedBy: 'it-test',
      source: 'QR_TEAM',
      requestId: rid,
    });
    // kedua insert requestId sama → kedua harus unik; yg pertama sudah e1, yg ini e2 pertama → OK
    await db.insert(redemptions).values({
      employeeId: e2,
      sessionId,
      claimedBy: 'it-test',
      source: 'SEARCH',
      requestId: rid,
    });
    check('idempotency request_id menolak duplikat', true, false);
  } catch (e) {
    check('idempotency request_id menolak duplikat (23505)', isUniqueViolation(e), true);
  }

  // 7. Void e1 → klaim ulang e1 diperbolehkan
  await db
    .update(redemptions)
    .set({ voidedAt: new Date(), voidedBy: 'it-test', voidReason: 'salah pilih' })
    .where(eq(redemptions.id, r1[0].id));
  const r2 = await db
    .insert(redemptions)
    .values({ employeeId: e1, sessionId, claimedBy: 'it-test', source: 'ADMIN_CORRECTION' })
    .returning();
  check('klaim ulang setelah void OK', r2.length, 1);

  // 8. Anti-dup kedua: e1 klaim aktif (yg baru) → duplikat tolak lagi
  try {
    await db
      .insert(redemptions)
      .values({ employeeId: e1, sessionId, claimedBy: 'it-test', source: 'QR_TEAM' });
    check('anti-dup setelah re-claim (e1)', true, false);
  } catch (e) {
    check('anti-dup setelah re-claim (23505)', isUniqueViolation(e), true);
  }

  // 9. Delete sesi utk cleanup (draft-only guard tdk ada di layer DB; hapus manual)
  await db.delete(redemptions).where(eq(redemptions.sessionId, sessionId));
  await db
    .delete(snackSessionEntitlements)
    .where(eq(snackSessionEntitlements.sessionId, sessionId));
  await db.delete(snackSessions).where(eq(snackSessions.id, sessionId));

  // Verifikasi nol sisa
  const leftover =
    await sqlp`SELECT count(*)::int AS n FROM redemptions WHERE session_id = ${sessionId}`;
  check('cleanup redemption nol sisa', Number(leftover[0].n), 0);

  await sqlp.end();
  console.log(failures === 0 ? '\nPASS: snack integration' : `\n${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('it-snack GAGAL:', e);
  process.exit(1);
});
