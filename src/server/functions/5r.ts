/**
 * Server functions — 5R audit: forms, rooms, submissions, periode penilaian.
 *
 * Auth pindah ke src/server/functions/auth.ts (DB users + cookie session).
 * Forms/rooms = static JSON (src/data/5r). Submissions = DB (five_r_submissions).
 *
 * Aturan lomba dekor-5r:
 * - Form dekorasi: SEKALI per (ruangan, auditor) — partial unique index
 *   five_r_submissions_dekorasi_once + pre-check + catch 23505.
 * - Form 5R: SEKALI per (ruangan, form, MINGGU, auditor) — partial unique index
 *   five_r_submissions_5r_weekly + pre-check + catch 23505.
 * - Periode penilaian: start_date/end_date global lomba dekor-5r
 *   (assessment_deadlines). Berlaku SEMUA role; admin bisa set/ubah kapan pun
 *   (setSettings role-checked). week_number dihitung relatif ke start_date.
 */
import { createServerFn } from '@tanstack/react-start';
import { and, desc, eq } from 'drizzle-orm';
import type { FiveRForm, FiveRRoom, FiveRSubmission } from '../../data/5r';
import { fiveRForms, fiveRRooms, getFiveRForm, getFiveRRoom } from '../../data/5r';
import { validatePeriod, weekNumber } from '../../lib/dateUtils';
import { assertDb } from '../db';
import { isUniqueViolation } from '../db/errors';
import { assessmentDeadlines, competitions, fiveRSubmissions } from '../db/schema';
import { adminOnly, authMiddleware } from '../middleware/auth';

export interface FiveRSubmissionStored extends FiveRSubmission {}

const DEKOR_5R_SLUG = 'dekor-5r';
const DEKORASI_FORM_ID = 'dekorasi';

interface AssessmentSettings {
  startDate: Date | null;
  endDate: Date | null;
}

/** Periode penilaian lomba dekor-5r dari DB; null kalau belum di-set. */
async function getSettingsRow(): Promise<AssessmentSettings> {
  const database = assertDb();
  const [row] = await database
    .select({ startDate: assessmentDeadlines.startDate, endDate: assessmentDeadlines.endDate })
    .from(assessmentDeadlines)
    .innerJoin(competitions, eq(assessmentDeadlines.competitionId, competitions.id))
    .where(eq(competitions.slug, DEKOR_5R_SLUG))
    .limit(1);
  return { startDate: row?.startDate ?? null, endDate: row?.endDate ?? null };
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

// ─── Periode penilaian (lomba dekor-5r) ───

export const getSettings = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{ startDate: string | null; endDate: string | null }> => {
    const settings = await getSettingsRow();
    return {
      startDate: settings.startDate ? settings.startDate.toISOString() : null,
      endDate: settings.endDate ? settings.endDate.toISOString() : null,
    };
  }
);

/** Set/hapus periode — HANYA superadmin/admin (role check DI HANDLER: ubah aturan lomba). */
export const setSettings = createServerFn({ method: 'POST' })
  .middleware([adminOnly])
  .validator((d: { startDate: string | null; endDate: string | null }) => d)
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      ok: boolean;
      startDate: string | null;
      endDate: string | null;
      error?: string;
    }> => {
      const database = assertDb();
      const [comp] = await database
        .select({ id: competitions.id })
        .from(competitions)
        .where(eq(competitions.slug, DEKOR_5R_SLUG))
        .limit(1);
      if (!comp)
        return {
          ok: false,
          startDate: null,
          endDate: null,
          error: 'Lomba dekor-5r tidak ditemukan',
        };

      const validation = validatePeriod(data.startDate, data.endDate);
      if (!validation.ok) {
        return { ok: false, startDate: null, endDate: null, error: validation.error };
      }
      const { startDate, endDate } = validation;
      const { auth } = context as { auth: { username: string | null } };

      await database
        .insert(assessmentDeadlines)
        .values({
          competitionId: comp.id,
          startDate,
          endDate,
          note: null,
          updatedBy: auth.username,
        })
        .onConflictDoUpdate({
          target: assessmentDeadlines.competitionId,
          set: { startDate, endDate, updatedBy: auth.username, updatedAt: new Date() },
        });
      return {
        ok: true,
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
      };
    }
  );

// ─── Backward compat: deadline lama = end_date (data sebelum start_date diperkenalkan) ───

export const getDeadline = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{ deadline: string | null }> => {
    const settings = await getSettingsRow();
    return { deadline: settings.endDate ? settings.endDate.toISOString() : null };
  }
);

export const setDeadline = createServerFn({ method: 'POST' })
  .validator((d: { deadline: string | null }) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; deadline: string | null; error?: string }> => {
    // Legacy: pertahankan start_date yang sudah ada (kalau ada). Kalau belum ada,
    // end-only — diizinkan (periode tetap "belum lengkap", submission ditolak).
    const settings = await getSettingsRow();
    const res = await setSettings({
      data: {
        startDate: settings.startDate ? settings.startDate.toISOString() : null,
        endDate: data.deadline,
      },
    });
    return { ok: res.ok, deadline: res.endDate, error: res.error };
  });

// ─── Submissions (DB) ───

/** List semua submission, terbaru dulu. */
export const getSubmissions = createServerFn({ method: 'GET' }).handler(
  async (): Promise<FiveRSubmissionStored[]> => {
    const db = assertDb();
    const rows = await db.select().from(fiveRSubmissions).orderBy(desc(fiveRSubmissions.createdAt));
    const { getSession } = await import('./auth');
    const session = await getSession();
    // Publik (tanpa login): /live scoreboard — sembunyikan field privat.
    // Halaman audit/admin (wajib login) dapat data penuh (createdBy/notes).
    const isPrivate = session.role !== null;
    return rows.map((r) => ({
      id: r.id,
      roomId: r.roomId,
      formId: r.formId,
      auditor: r.auditor,
      answers: r.answers as Record<string, number>,
      notes: isPrivate ? (r.notes as Record<string, string>) : ({} as Record<string, string>),
      submittedAt: r.submittedAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      createdBy: isPrivate ? (r.createdBy ?? null) : null,
      weekNumber: r.weekNumber,
    }));
  }
);

/** Validasi + simpan submission ke DB. */
export const saveSubmission = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator((d: FiveRSubmission) => d)
  .handler(async ({ data, context }): Promise<{ ok: boolean; id?: string; error?: string }> => {
    const form = getFiveRForm(data.formId);
    const room = getFiveRRoom(data.roomId);
    if (!form) return { ok: false, error: `Form tidak dikenal: ${data.formId}` };
    if (!room) return { ok: false, error: `Ruangan tidak dikenal: ${data.roomId}` };

    const { min, max } = form.scale;
    // Semua kriteria WAJIB diisi (nilai angka) — jangan terima submission parsial.
    const missing: string[] = [];
    for (const cat of form.categories) {
      for (const c of cat.criteria) {
        const v = data.answers[c.id];
        if (v === undefined) {
          missing.push(c.id);
          continue;
        }
        if (typeof v !== 'number' || v < min || v > max) {
          return { ok: false, error: `Skor invalid untuk kriteria ${c.id}` };
        }
      }
    }
    if (missing.length > 0) {
      return {
        ok: false,
        error: `Masih ada ${missing.length} kriteria belum diisi (${missing[0]}${missing.length > 1 ? ', ...' : ''}).`,
      };
    }

    // Get username from session (server-side, never trust client)
    const { auth } = context as { auth: { username: string | null } };
    const createdBy = auth.username ?? null;
    // Wajib login: tanpa createdBy, unique index 5r_weekly/dekorasi_once TIDAK
    // menolak duplikat (NULL != NULL di Postgres unique) → anonymous bisa spam.
    if (!createdBy) {
      return { ok: false, error: 'Sesi tidak valid. Silakan login dulu.' };
    }

    // Periode penilaian — berlaku semua role (admin bisa ubah periode kapan pun).
    // WAJIB start+end: tanpa periode, weekNumber tidak bermakna dan unique index
    // 5r_weekly akan mengunci form 5R jadi "sekali total" (regresi dari bebas per hari).
    const settings = await getSettingsRow();
    const submittedAt = new Date(data.submittedAt);

    if (!settings.startDate || !settings.endDate) {
      return { ok: false, error: 'Periode penilaian belum diatur. Hubungi admin.' };
    }
    if (submittedAt < settings.startDate) {
      return { ok: false, error: 'Penilaian belum dibuka (sebelum tanggal mulai).' };
    }
    if (submittedAt > settings.endDate) {
      return { ok: false, error: 'Penilaian sudah ditutup (melewati periode). Hubungi admin.' };
    }
    // Server time guard: jangan percaya submittedAt client saja — periode yang
    // sudah lewat tetap ditolak walau client kirim timestamp di dalam periode.
    if (new Date() > settings.endDate) {
      return { ok: false, error: 'Penilaian sudah ditutup (melewati periode). Hubungi admin.' };
    }

    const weekNum = weekNumber(submittedAt, settings.startDate);

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

    // 5R: sekali per (ruangan, form, minggu, auditor) — fast path pesan ramah.
    if (data.formId !== DEKORASI_FORM_ID && createdBy) {
      const database = assertDb();
      const dup = await database
        .select({ id: fiveRSubmissions.id })
        .from(fiveRSubmissions)
        .where(
          and(
            eq(fiveRSubmissions.roomId, data.roomId),
            eq(fiveRSubmissions.formId, data.formId),
            eq(fiveRSubmissions.weekNumber, weekNum),
            eq(fiveRSubmissions.createdBy, createdBy)
          )
        )
        .limit(1);
      if (dup.length)
        return {
          ok: false,
          error: `Form ini sudah dinilai untuk minggu ke-${weekNum}. Satu form hanya bisa dinilai sekali per minggu per auditor.`,
        };
    }

    const db = assertDb();
    try {
      const inserted = await db
        .insert(fiveRSubmissions)
        .values({
          id: data.id,
          roomId: data.roomId,
          formId: data.formId,
          auditor: data.auditor,
          answers: data.answers,
          notes: data.notes,
          submittedAt,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
          createdBy,
          weekNumber: weekNum,
        })
        .onConflictDoNothing()
        .returning({ id: fiveRSubmissions.id });

      // onConflictDoNothing TIDAK melempar — konflik (race: dua submit paralel
      // sama-sama lolos pre-check) hanya meng-suppress insert → returning kosong.
      // Jangan return sukses palsu: kalau tidak ada row masuk, lapor error.
      if (inserted.length === 0) {
        return {
          ok: false,
          error:
            data.formId === DEKORASI_FORM_ID
              ? 'Ruangan ini sudah dinilai (lomba dekorasi). Satu ruangan hanya bisa dinilai sekali per auditor.'
              : `Form ini sudah dinilai untuk minggu ke-${weekNum}. Satu form hanya bisa dinilai sekali per minggu per auditor.`,
        };
      }
    } catch (err) {
      if (isUniqueViolation(err)) {
        return {
          ok: false,
          error:
            data.formId === DEKORASI_FORM_ID
              ? 'Ruangan ini sudah dinilai (lomba dekorasi). Satu ruangan hanya bisa dinilai sekali per auditor.'
              : `Form ini sudah dinilai untuk minggu ke-${weekNum}. Satu form hanya bisa dinilai sekali per minggu per auditor.`,
        };
      }
      throw err;
    }
    return { ok: true, id: data.id };
  });

/** Hapus submission by id — hanya pemiliknya atau admin; diblokir setelah tenggat. */
export const deleteSubmission = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    const { auth } = context as { auth: { role: string | null; username: string | null } };

    const db = assertDb();
    const [row] = await db
      .select()
      .from(fiveRSubmissions)
      .where(eq(fiveRSubmissions.id, data.id))
      .limit(1);
    if (!row) return { ok: true }; // sudah tidak ada — idempotent

    const isAdmin = auth.role === 'superadmin' || auth.role === 'admin';
    if (!isAdmin && auth.username !== row.createdBy) {
      return { ok: false, error: 'Hanya pemilik penilaian atau admin yang bisa menghapus' };
    }

    // Konsisten dgn save: setelah periode berakhir, penilaian terkunci (semua role).
    const settings = await getSettingsRow();
    if (settings.endDate && new Date() > settings.endDate) {
      return { ok: false, error: 'Penilaian sudah ditutup (melewati periode). Hubungi admin.' };
    }

    await db.delete(fiveRSubmissions).where(eq(fiveRSubmissions.id, data.id));
    return { ok: true };
  });
