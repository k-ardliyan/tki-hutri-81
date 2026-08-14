/**
 * live.ts — agregasi data halaman /live (publik).
 *
 * Optimasi:
 * - SSR loader hanya mengambil data esensial untuk first paint (5R scoreboard & comps)
 * - Detail bagan (BracketTree & HeatPipelineTree) di-fetch on-demand via React Query
 *   hanya ketika pengguna membuka tab "Bagan Pertandingan", menghemat 20+ query DB di SSR.
 */
import { createServerFn } from '@tanstack/react-start';
import { eq, inArray } from 'drizzle-orm';
import { type FiveRForm, type FiveRRoom, fiveRForms, fiveRRooms } from '../../data/5r';
import { assertDb } from '../db';
import { assessmentDeadlines, competitions, fiveRSubmissions } from '../db/schema';
import type { TournamentDb } from '../services/tournament';
import type { FiveRSubmissionStored } from './5r';

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

export const getLivePageData = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{
    rooms: FiveRRoom[];
    forms: FiveRForm[];
    submissions: FiveRSubmissionStored[];
    deadline: string | null;
    comps: Array<{ id: number; slug: string; short: string; title: string }>;
  }> => {
    const database = assertDb() as unknown as TournamentDb;

    // ── 1. Data statis (tanpa DB) ──
    const forms = fiveRForms;
    const rooms = fiveRRooms;

    // ── 2. Query dasar yang ramping — fallback aman saat DB timeout ──
    let submissionRows: Array<{
      id: string;
      roomId: string;
      formId: string;
      answers: unknown;
    }> = [];
    let settingsRow: { startDate: Date | null; endDate: Date | null } | null = null;
    let compRows: Array<{ id: number; slug: string; short: string; title: string }> = [];

    try {
      [submissionRows, settingsRow, compRows] = await Promise.all([
        database
          .select({
            id: fiveRSubmissions.id,
            roomId: fiveRSubmissions.roomId,
            formId: fiveRSubmissions.formId,
            answers: fiveRSubmissions.answers,
          })
          .from(fiveRSubmissions),
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
      // Fallback: DB timeout → scoreboard kosong, rooms/forms statis tetap render.
    }

    const submissions = submissionRows.map((r) => ({
      id: String(r.id),
      roomId: r.roomId,
      formId: r.formId,
      auditor: '',
      answers: (r.answers ?? {}) as Record<string, number>,
      notes: {} as Record<string, string>,
      submittedAt: '',
      createdAt: '',
      updatedAt: '',
    }));

    const deadline = settingsRow?.endDate ? settingsRow.endDate.toISOString() : null;

    return { rooms, forms, submissions, deadline, comps: compRows };
  }
);
