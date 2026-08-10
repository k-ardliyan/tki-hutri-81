/**
 * Server functions — 5R audit: forms, rooms, submissions, tenggat penilaian.
 *
 * Auth pindah ke src/server/functions/auth.ts (DB users + cookie session).
 * Forms/rooms = static JSON (src/data/5r). Submissions = DB (five_r_submissions).
 *
 * Aturan lomba dekor-5r:
 * - Form dekorasi: SEKALI per (ruangan, auditor) — partial unique index
 *   five_r_submissions_dekorasi_once + pre-check + catch 23505.
 * - Tenggat penilaian: deadline global lomba dekor-5r (assessment_deadlines).
 *   Berlaku SEMUA role; admin bisa set/ubah kapan pun (setDeadline role-checked).
 */
import { createServerFn } from '@tanstack/react-start';
import { and, desc, eq } from 'drizzle-orm';
import type { FiveRForm, FiveRRoom, FiveRSubmission } from '../../data/5r';
import { fiveRForms, fiveRRooms, getFiveRForm, getFiveRRoom } from '../../data/5r';
import { assertDb } from '../db';
import { isUniqueViolation } from '../db/errors';
import { assessmentDeadlines, competitions, fiveRSubmissions } from '../db/schema';

export interface FiveRSubmissionStored extends FiveRSubmission {}

const DEKOR_5R_SLUG = 'dekor-5r';
const DEKORASI_FORM_ID = 'dekorasi';

/** Tenggat lomba dekor-5r dari DB; null kalau belum di-set. */
async function getDeadlineRow() {
  const database = assertDb();
  const [row] = await database
    .select({ deadline: assessmentDeadlines.deadline })
    .from(assessmentDeadlines)
    .innerJoin(competitions, eq(assessmentDeadlines.competitionId, competitions.id))
    .where(eq(competitions.slug, DEKOR_5R_SLUG))
    .limit(1);
  return row?.deadline ?? null;
}

// ─── Data (JSON statis) ───

export const getForms = createServerFn({ method: 'GET' }).handler(
  async (): Promise<FiveRForm[]> => {
    return fiveRForms;
  }
);

export const getRooms = createServerFn({ method: 'GET' }).handler(
  async (): Promise<FiveRRoom[]> => {
    return fiveRRooms;
  }
);

// ─── Tenggat penilaian (lomba dekor-5r) ───

export const getDeadline = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{ deadline: string | null }> => {
    const deadline = await getDeadlineRow();
    return { deadline: deadline ? deadline.toISOString() : null };
  }
);

/** Set/hapus tenggat — HANYA superadmin/admin (role check DI HANDLER: ubah aturan lomba). */
export const setDeadline = createServerFn({ method: 'POST' })
  .validator((d: { deadline: string | null }) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; deadline: string | null; error?: string }> => {
    const { getSession } = await import('./auth');
    const session = await getSession();
    if (!session.role || !['superadmin', 'admin'].includes(session.role)) {
      return {
        ok: false,
        deadline: null,
        error: 'Hanya admin yang bisa mengatur tenggat penilaian',
      };
    }
    const database = assertDb();
    const [comp] = await database
      .select({ id: competitions.id })
      .from(competitions)
      .where(eq(competitions.slug, DEKOR_5R_SLUG))
      .limit(1);
    if (!comp) return { ok: false, deadline: null, error: 'Lomba dekor-5r tidak ditemukan' };

    const deadline = data.deadline ? new Date(data.deadline) : null;
    if (deadline && Number.isNaN(deadline.getTime()))
      return { ok: false, deadline: null, error: 'Tanggal tenggat tidak valid' };

    await database
      .insert(assessmentDeadlines)
      .values({ competitionId: comp.id, deadline, note: null, updatedBy: session.username })
      .onConflictDoUpdate({
        target: assessmentDeadlines.competitionId,
        set: { deadline, updatedBy: session.username, updatedAt: new Date() },
      });
    return { ok: true, deadline: deadline ? deadline.toISOString() : null };
  });

// ─── Submissions (DB) ───

/** List semua submission, terbaru dulu. */
export const getSubmissions = createServerFn({ method: 'GET' }).handler(
  async (): Promise<FiveRSubmissionStored[]> => {
    const db = assertDb();
    const rows = await db.select().from(fiveRSubmissions).orderBy(desc(fiveRSubmissions.createdAt));
    return rows.map((r) => ({
      id: r.id,
      roomId: r.roomId,
      formId: r.formId,
      auditor: r.auditor,
      answers: r.answers as Record<string, number>,
      notes: r.notes as Record<string, string>,
      submittedAt: r.submittedAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      createdBy: r.createdBy ?? null,
    }));
  }
);

/** Validasi + simpan submission ke DB. */
export const saveSubmission = createServerFn({ method: 'POST' })
  .validator((d: FiveRSubmission) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; id?: string; error?: string }> => {
    const form = getFiveRForm(data.formId);
    const room = getFiveRRoom(data.roomId);
    if (!form) return { ok: false, error: `Form tidak dikenal: ${data.formId}` };
    if (!room) return { ok: false, error: `Ruangan tidak dikenal: ${data.roomId}` };

    const { min, max } = form.scale;
    for (const cat of form.categories) {
      for (const c of cat.criteria) {
        const v = data.answers[c.id];
        if (v !== undefined && (typeof v !== 'number' || v < min || v > max)) {
          return { ok: false, error: `Skor invalid untuk kriteria ${c.id}` };
        }
      }
    }

    // Get username from session (server-side, never trust client)
    const { getSession } = await import('./auth');
    const session = await getSession();
    const createdBy = session.username ?? null;

    // Tenggat penilaian — berlaku semua role (admin bisa ubah deadline kapan pun).
    const deadline = await getDeadlineRow();
    if (deadline && new Date() > deadline) {
      return { ok: false, error: 'Penilaian sudah ditutup (melewati tenggat). Hubungi admin.' };
    }

    // Dekorasi: sekali per (ruangan, auditor) — fast path pesan ramah.
    if (data.formId === DEKORASI_FORM_ID && createdBy) {
      const database = assertDb();
      const dup = await database
        .select({ id: fiveRSubmissions.id })
        .from(fiveRSubmissions)
        .where(
          and(
            eq(fiveRSubmissions.roomId, data.roomId),
            eq(fiveRSubmissions.formId, DEKORASI_FORM_ID),
            eq(fiveRSubmissions.createdBy, createdBy)
          )
        )
        .limit(1);
      if (dup.length)
        return {
          ok: false,
          error:
            'Ruangan ini sudah dinilai (lomba dekorasi). Satu ruangan hanya bisa dinilai sekali per auditor.',
        };
    }

    const db = assertDb();
    try {
      await db
        .insert(fiveRSubmissions)
        .values({
          id: data.id,
          roomId: data.roomId,
          formId: data.formId,
          auditor: data.auditor,
          answers: data.answers,
          notes: data.notes,
          submittedAt: new Date(data.submittedAt),
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
          createdBy,
        })
        .onConflictDoNothing();
    } catch (err) {
      if (isUniqueViolation(err)) {
        return {
          ok: false,
          error:
            'Ruangan ini sudah dinilai (lomba dekorasi). Satu ruangan hanya bisa dinilai sekali per auditor.',
        };
      }
      throw err;
    }
    return { ok: true, id: data.id };
  });

/** Hapus submission by id — hanya pemiliknya atau admin; diblokir setelah tenggat. */
export const deleteSubmission = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { getSession } = await import('./auth');
    const session = await getSession();

    const db = assertDb();
    const [row] = await db
      .select()
      .from(fiveRSubmissions)
      .where(eq(fiveRSubmissions.id, data.id))
      .limit(1);
    if (!row) return { ok: true }; // sudah tidak ada — idempotent

    const isAdmin = session.role === 'superadmin' || session.role === 'admin';
    if (!isAdmin && session.username !== row.createdBy) {
      return { ok: false, error: 'Hanya pemilik penilaian atau admin yang bisa menghapus' };
    }

    // Konsisten dgn save: setelah tenggat, penilaian terkunci (semua role).
    const deadline = await getDeadlineRow();
    if (deadline && new Date() > deadline) {
      return { ok: false, error: 'Penilaian sudah ditutup (melewati tenggat). Hubungi admin.' };
    }

    await db.delete(fiveRSubmissions).where(eq(fiveRSubmissions.id, data.id));
    return { ok: true };
  });
