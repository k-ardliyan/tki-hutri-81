/**
 * Apply drizzle migration SQL via postgres.js (tanpa psql).
 * Baca file .sql, split per "--> statement-breakpoint", execute berurutan.
 * Run: bun run scripts/apply-migration.ts
 */
import { readFileSync } from 'node:fs';
import postgres from 'postgres';

const sqlFile = process.argv[2] ?? 'drizzle/0000_init_employee_centric.sql';
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL tidak ada di .env');
  process.exit(1);
}

const sql = postgres(url, { max: 1, ssl: 'require' });

async function main() {
  const content = readFileSync(sqlFile, 'utf-8');
  const statements = content
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(`Applying ${statements.length} statements from ${sqlFile}...`);
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await sql.unsafe(stmt);
      console.log(`  [${i + 1}/${statements.length}] OK`);
    } catch (e) {
      // Ignore "already exists" (idempotent rerun)
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('already exists')) {
        console.log(`  [${i + 1}/${statements.length}] SKIP (already exists)`);
      } else {
        throw new Error(`Statement ${i + 1} gagal:\n${stmt.slice(0, 120)}...\n${msg}`);
      }
    }
  }

  // Verify tables
  const tables =
    await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`;
  console.log(`\nTabel di DB (${tables.length}):`);
  for (const t of tables) console.log(`  - ${t.table_name}`);

  await sql.end();
  console.log('\n✅ Migration selesai!');
}

main().catch((e) => {
  console.error('❌ Gagal:', e.message);
  process.exit(1);
});
