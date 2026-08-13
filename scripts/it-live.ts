/**
 * Integration test: bagian inti dari agregasi loader /live (getLivePageData).
 *
 * Tidak memanggil server fn (butuh request context HTTP); langsung verifikasi
 * query-query yang diagregasi:
 *   1. settings (assessment_deadlines utk lomba dekorasi-5r) → deadline
 *   2. daftar kompetisi bagan (balon, air) → comps
 *   3. detail bracket SE + heat + prizes per (kompetisi × kategori) — tidak throw
 *
 * Jalankan: bun run scripts/it-live.ts
 */
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../src/server/db';
import { assessmentDeadlines, competitions, lombaPrizes } from '../src/server/db/schema';
import { type TournamentDb, tournamentService } from '../src/server/services/tournament';
import { heatService } from '../src/server/services/tournament/heat';

const database = db as unknown as TournamentDb;
let failed = 0;
const check = (name: string, cond: boolean, detail?: string) => {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

// ── 1. Kompetisi bagan (balon, air) ──
const compRows = await database
  .select({
    id: competitions.id,
    slug: competitions.slug,
    short: competitions.short,
    title: competitions.title,
  })
  .from(competitions)
  .where(inArray(competitions.slug, ['balon', 'air']))
  .orderBy(competitions.sortOrder);

check('comps memuat balon + air', compRows.length >= 1, `len=${compRows.length}`);
check(
  'comps punya slug valid',
  compRows.every((c) => c.slug === 'balon' || c.slug === 'air')
);

// ── 2. Settings/deadline (lomba dekorasi-5r) ──
const [compDekor] = await database
  .select({ id: competitions.id })
  .from(competitions)
  .where(eq(competitions.slug, 'dekorasi-5r'))
  .limit(1);
let deadline: string | null = null;
if (compDekor) {
  const [row] = await database
    .select({ endDate: assessmentDeadlines.endDate })
    .from(assessmentDeadlines)
    .where(eq(assessmentDeadlines.competitionId, compDekor.id))
    .limit(1);
  deadline = row?.endDate ? row.endDate.toISOString() : null;
}
check('deadline bertipe string|null', deadline === null || typeof deadline === 'string');

// ── 3. Detail bagan per (kompetisi × kategori) — harus TIDAK throw ──
const keys = compRows.flatMap((c) =>
  (['putra', 'putri'] as const).map((k) => ({ competitionId: c.id, kategori: k }))
);
for (const key of keys) {
  const label = `${key.competitionId}:${key.kategori}`;
  try {
    const detail = await tournamentService.detail(database, key.competitionId, key.kategori);
    const heat = await heatService.detail(database, key.competitionId, key.kategori);
    const rows = await database
      .select()
      .from(lombaPrizes)
      .where(
        and(
          eq(lombaPrizes.competitionId, key.competitionId),
          eq(lombaPrizes.kategori, key.kategori)
        )
      )
      .orderBy(lombaPrizes.place);
    const prizes = rows.map((r) => ({ place: r.place, hadiah: r.hadiah }));
    check(
      `detail ${label} shape`,
      detail === null || typeof detail === 'object',
      detail ? `rounds=${detail.rounds.length}` : 'null (belum generate)'
    );
    check(`heat ${label} shape`, heat === null || typeof heat === 'object');
    check(
      `prizes ${label} shape`,
      Array.isArray(prizes) && prizes.every((p) => typeof p.hadiah === 'string')
    );
  } catch (err) {
    failed++;
    console.error(`  ✗ detail ${label} THROW — ${(err as Error).message}`);
  }
}

console.log(failed === 0 ? '\nPASS' : `\nFAIL (${failed})`);
process.exit(failed === 0 ? 0 : 1);
