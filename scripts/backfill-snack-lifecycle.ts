/**
 * backfill-snack-lifecycle.ts — migrasi data existing ke model lifecycle baru.
 * Wajib dijalankan SETELAH drizzle/0004_snack_lifecycle_entitlements.sql di-apply.
 * PRD §43-48:
 *  - is_active=true  → status='published', published_at=created_at, starts_at=created_at
 *  - is_active=false → status='archived', archived_at=updated_at (kalau ada)
 *  - stock_quota = quota (legacy)
 *  - generate entitlement utk semua sesi published dari employees.is_snack_eligible=true
 *    + karyawan yg sudah punya redemption (source='migration')
 *  - redemption existing: source='MIGRATION', quantity=1 (default schema sudah MIGRATION)
 * Run: bun scripts/backfill-snack-lifecycle.ts
 */
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL tidak ada di .env');
  process.exit(1);
}
const sql = postgres(url, { max: 1, ssl: 'require' });

async function main() {
  const db =
    await sql`select current_database() as db, (select count(*)::int from snack_sessions) as sessions`;
  console.log('DB:', db[0].db, '· sessions:', db[0].sessions);

  // 1. Sesi aktif → published (legacy: is_active=true berarti "aktif sampai ditutup",
  //    jadi ends_at NULL — tanpa auto-close, konsisten dgn perilaku lama).
  const a1 = await sql`
    UPDATE snack_sessions
    SET status = 'published',
        published_at = COALESCE(published_at, created_at),
        starts_at = COALESCE(starts_at, created_at),
        ends_at = NULL,
        stock_quota = COALESCE(stock_quota, CASE WHEN quota > 0 THEN quota END),
        updated_at = now()
    WHERE is_active = true AND status = 'draft'
    RETURNING id, name
  `;
  console.log(`[1] aktif → published: ${a1.length} sesi`);

  // 2. Sesi non-aktif → archived
  const a2 = await sql`
    UPDATE snack_sessions
    SET status = 'archived',
        archived_at = COALESCE(archived_at, updated_at, now()),
        stock_quota = COALESCE(stock_quota, CASE WHEN quota > 0 THEN quota END),
        updated_at = now()
    WHERE is_active = false AND status = 'draft'
    RETURNING id, name
  `;
  console.log(`[2] non-aktif → archived: ${a2.length} sesi`);

  // 3. Sesi tanpa status sama sekali (draft legacy tanpa is_active) → archived
  const a3 = await sql`
    UPDATE snack_sessions
    SET status = 'archived',
        archived_at = COALESCE(archived_at, updated_at, now()),
        updated_at = now()
    WHERE status IS NULL
    RETURNING id
  `;
  console.log(`[3] status null → archived: ${a3.length} sesi`);

  // 4. Generate entitlement untuk semua sesi published
  const published = await sql`SELECT id FROM snack_sessions WHERE status = 'published'`;
  const eligible = await sql`SELECT id FROM employees WHERE is_snack_eligible = true`;
  const eligibleIds = eligible.map((e) => Number((e as { id: number }).id));
  console.log(`[4] sesi published: ${published.length} · karyawan eligible: ${eligibleIds.length}`);

  let inserted = 0;
  for (const s of published) {
    const withRedemption = await sql`
      SELECT DISTINCT employee_id FROM redemptions WHERE session_id = ${s.id}
    `;
    const empIds = new Set<number>([
      ...eligibleIds,
      ...withRedemption.map((r) => Number((r as { employee_id: number }).employee_id)),
    ]);
    for (const employeeId of empIds) {
      const res = await sql`
        INSERT INTO snack_session_entitlements (session_id, employee_id, entitled_qty, source)
        VALUES (${s.id}, ${employeeId}, 1, 'migration')
        ON CONFLICT (session_id, employee_id) DO NOTHING
      `;
      // res.count only for affected; count inserted rows
      inserted += Number(res.count ?? 0);
    }
  }
  console.log(`[4] entitlement inserted: ${inserted}`);

  // 5. Redemption existing → source MIGRATION (default schema; pastikan konsisten)
  const a5 = await sql`
    UPDATE redemptions SET source = 'MIGRATION', quantity = 1 WHERE source IS NULL OR source = ''
    RETURNING id
  `;
  console.log(`[5] redemption source fix: ${a5.length}`);

  // 6. Verifikasi
  const v = await sql`
    SELECT status, count(*)::int AS n FROM snack_sessions GROUP BY status ORDER BY status
  `;
  console.log('[6] status distribution:', JSON.stringify(v));
  const ent = await sql`
    SELECT count(*)::int AS n FROM snack_session_entitlements
  `;
  console.log('[6] total entitlements:', ent[0].n);

  await sql.end();
  console.log('Backfill selesai.');
}

main().catch((e) => {
  console.error('Backfill GAGAL:', e);
  process.exit(1);
});
