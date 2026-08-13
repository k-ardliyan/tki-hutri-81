/**
 * live.ts — agregasi data halaman /live (publik).
 *
 * Masalah: loader lama memanggil 12+ server fn terpisah (getRooms, getForms,
 * getSubmissions, getDeadline, getBaganCompetitions + 2×kategori × 3 fn
 * bracket/heat/prizes). Tiap server fn = 1 request HTTP serverless + 1-3
 * query DB. Vercel spin banyak instance → pool Aiven (max_connections=20,
 * free plan) cepat penuh → "remaining connection slots are reserved" →
 * `Failed query` di HP → user harus refresh.
 *
 * Solusi: SATU server fn agregat. Semua query DB dieksekusi dalam 1 request
 * dengan koneksi pool yang sama (postgres.js mengantri pada 1 koneksi),
 * paralelisme dibatasi supaya tidak menyerbu slot.
 */
import { createServerFn } from '@tanstack/react-start';
import { and, eq, inArray } from 'drizzle-orm';
import { fiveRForms, fiveRRooms } from '../../data/5r';
import { assertDb } from '../db';
import { assessmentDeadlines, competitions, fiveRSubmissions, lombaPrizes } from '../db/schema';
import { type TournamentDb, tournamentService } from '../services/tournament';
import { heatService } from '../services/tournament/heat';
import { getSession } from './auth';

type Kategori = 'putra' | 'putri';
type GetPrizesResult = { place: number; hadiah: string }[];

async function loadSettingsRow(database: TournamentDb) {
  const [comp] = await database
    .select({ id: competitions.id })
    .from(competitions)
    .where(eq(competitions.slug, 'dekorasi-5r'))
    .limit(1);
  if (!comp) return null;
  const [row] = await database
    .select({ startDate: assessmentDeadlines.startDate, endDate: assessmentDeadlines.endDate })
    .from(assessmentDeadlines)
    .where(eq(assessmentDeadlines.competitionId, comp.id))
    .limit(1);
  return row ?? null;
}

export const getLivePageData = createServerFn({ method: 'GET' }).handler(async () => {
  const database = assertDb() as unknown as TournamentDb;

  // ── 1. Data statis (tanpa DB) ──
  const forms = fiveRForms;
  const rooms = fiveRRooms;

  // Sesi tidak butuh DB (cookie HMAC) — aman dipanggil duluan.
  const session = await getSession();
  // Publik (tanpa login): /live scoreboard — sembunyikan field privat.
  const isPrivate = session.role !== null;

  // ── 2. Query dasar (3 query) — fallback empty saat DB timeout/quota ──
  let submissionRows: (typeof fiveRSubmissions.$inferSelect)[] = [];
  let settingsRow: { startDate: Date | null; endDate: Date | null } | null = null;
  let compRows: Array<{ id: number; slug: string; short: string; title: string }> = [];
  try {
    [submissionRows, settingsRow, compRows] = await Promise.all([
      database.select().from(fiveRSubmissions).orderBy(fiveRSubmissions.createdAt),
      loadSettingsRow(database),
      database
        .select({
          id: competitions.id,
          slug: competitions.slug,
          short: competitions.short,
          title: competitions.title,
        })
        .from(competitions)
        .where(inArray(competitions.slug, ['balon', 'air']))
        .orderBy(competitions.sortOrder),
    ]);
  } catch {
    // ponytail: DB timeout → scoreboard kosong, rooms/forms statis tetap render.
  }

  const submissions = submissionRows.map((r) => ({
    id: r.id,
    roomId: r.roomId,
    formId: r.formId,
    auditor: r.auditor,
    answers: r.answers as Record<string, number>,
    notes: isPrivate ? (r.notes as Record<string, string>) : ({} as Record<string, string>),
    submittedAt: r.submittedAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  const deadline = settingsRow?.endDate ? settingsRow.endDate.toISOString() : null;

  // ── 3. Detail bagan per (kompetisi × kategori) — sequential aman ──
  const keys: Array<{ competitionId: number; kategori: Kategori }> = compRows.flatMap((c) =>
    (['putra', 'putri'] as const).map((k) => ({ competitionId: c.id, kategori: k }))
  );

  const details: Record<string, Awaited<ReturnType<typeof tournamentService.detail>>> = {};
  const heatDetails: Record<string, Awaited<ReturnType<typeof heatService.detail>>> = {};
  const prizes: Record<string, GetPrizesResult> = {};

  for (const key of keys) {
    const k = `${key.competitionId}:${key.kategori}`;
    // Sequential (bukan paralel) — pool kecil, hindari ledakan koneksi.
    // try/catch per key: detail bagan gagal tidak boleh menggagalkan seluruh
    // halaman — submissions/rooms tetap render, card bagan tampil error state.
    try {
      details[k] = await tournamentService.detail(database, key.competitionId, key.kategori);
      heatDetails[k] = await heatService.detail(database, key.competitionId, key.kategori);
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
      prizes[k] = rows.map((r) => ({ place: r.place, hadiah: r.hadiah }));
    } catch {
      // DB padat/timeout sesaat — biarkan key ini null/empty; UI card tampilkan
      // state "Coba Lagi" (isError dari useBracket/useHeatBracket di client).
      details[k] = null;
      heatDetails[k] = null;
      prizes[k] = [];
    }
  }

  return { rooms, forms, submissions, deadline, comps: compRows, details, heatDetails, prizes };
});
