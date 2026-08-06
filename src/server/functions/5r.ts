/**
 * Server functions — 5R audit: forms, rooms, submissions.
 *
 * Auth pindah ke src/server/functions/auth.ts (DB users + cookie session).
 * Forms/rooms = static JSON (src/data/5r). Submissions = DB (five_r_submissions).
 */
import { createServerFn } from '@tanstack/react-start'
import { eq, desc } from 'drizzle-orm'
import { fiveRForms, fiveRRooms, getFiveRForm, getFiveRRoom } from '../../data/5r'
import type { FiveRForm, FiveRRoom, FiveRSubmission } from '../../data/5r'
import { assertDb } from '../db'
import { fiveRSubmissions } from '../db/schema'

export interface FiveRSubmissionStored extends FiveRSubmission {}

// ─── Data (JSON statis) ───

export const getForms = createServerFn({ method: 'GET' }).handler(async (): Promise<FiveRForm[]> => {
  return fiveRForms
})

export const getRooms = createServerFn({ method: 'GET' }).handler(async (): Promise<FiveRRoom[]> => {
  return fiveRRooms
})

// ─── Submissions (DB) ───

/** List semua submission, terbaru dulu. */
export const getSubmissions = createServerFn({ method: 'GET' }).handler(async (): Promise<FiveRSubmissionStored[]> => {
  const db = assertDb()
  const rows = await db.select().from(fiveRSubmissions).orderBy(desc(fiveRSubmissions.createdAt))
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
  }))
})

/** Validasi + simpan submission ke DB. */
export const saveSubmission = createServerFn({ method: 'POST' })
  .validator((d: FiveRSubmission) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; id?: string; error?: string }> => {
    const form = getFiveRForm(data.formId)
    const room = getFiveRRoom(data.roomId)
    if (!form) return { ok: false, error: `Form tidak dikenal: ${data.formId}` }
    if (!room) return { ok: false, error: `Ruangan tidak dikenal: ${data.roomId}` }

    const { min, max } = form.scale
    for (const cat of form.categories) {
      for (const c of cat.criteria) {
        const v = data.answers[c.id]
        if (v !== undefined && (typeof v !== 'number' || v < min || v > max)) {
          return { ok: false, error: `Skor invalid untuk kriteria ${c.id}` }
        }
      }
    }

    // Get username from session (server-side, never trust client)
    const { getSession } = await import('./auth')
    const session = await getSession()
    const createdBy = session.username ?? null

    const db = assertDb()
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
      .onConflictDoNothing()
    return { ok: true, id: data.id }
  })

/** Hapus submission by id. */
export const deleteSubmission = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const db = assertDb()
    await db.delete(fiveRSubmissions).where(eq(fiveRSubmissions.id, data.id))
    return { ok: true }
  })
