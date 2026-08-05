/**
 * Server functions — 5R audit: forms, rooms, submissions, role-based auth.
 *
 * Two roles:
 * - panitia (admin): full access (isi, hasil, delete)
 * - audit (non-admin): read-only (view results, room status)
 *
 * Auth: login username/password per role, cookie HttpOnly `tki5r_role`.
 */
import { createServerFn } from '@tanstack/react-start'
import { getCookie, setCookie } from '@tanstack/react-start/server'
import { fiveRForms, fiveRRooms, getFiveRForm, getFiveRRoom } from '../../data/5r'
import type { FiveRForm, FiveRRoom, FiveRSubmission } from '../../data/5r'

const ROLE_COOKIE = 'tki5r_role'
export type UserRole = 'panitia' | 'audit'

export interface FiveRSubmissionStored extends FiveRSubmission {}

// ─── Data (JSON) ───

export const getForms = createServerFn({ method: 'GET' }).handler(async (): Promise<FiveRForm[]> => {
  return fiveRForms
})

export const getRooms = createServerFn({ method: 'GET' }).handler(async (): Promise<FiveRRoom[]> => {
  return fiveRRooms
})

// ─── Auth ───

/** Get current session role. Returns role or null. */
export const getSession = createServerFn({ method: 'GET' }).handler(async (): Promise<{ role: UserRole | null }> => {
  const role = getCookie(ROLE_COOKIE)
  if (role === 'panitia' || role === 'audit') return { role }
  return { role: null }
})

/** Login with credentials — auto-detect role from env. Sets cookie on success. */
export const login = createServerFn({ method: 'POST' })
  .validator((d: { username: string; password: string }) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; role?: UserRole; error?: string }> => {
    const { username, password } = data

    const panitia = {
      user: process.env.PANITIA_USER ?? 'admin',
      pass: process.env.PANITIA_PASS ?? 'admin123',
    }
    const audit = {
      user: process.env.AUDIT_USER ?? 'audit',
      pass: process.env.AUDIT_PASS ?? 'audit123',
    }

    if (username === panitia.user && password === panitia.pass) {
      setCookie(ROLE_COOKIE, 'panitia', {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      })
      return { ok: true, role: 'panitia' }
    }
    if (username === audit.user && password === audit.pass) {
      setCookie(ROLE_COOKIE, 'audit', {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      })
      return { ok: true, role: 'audit' }
    }
    return { ok: false, error: 'Username atau password salah' }
  })

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  setCookie(ROLE_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return { ok: true }
})

// ─── Submission (stub — localStorage di client; DB nanti) ───

/**
 * Validasi + simpan submission.
 * Saat ini: validasi struktur & skor; storage dilakukan client-side.
 * Saat DB ready: tulis ke tabel five_r_submissions.
 */
export const saveSubmission = createServerFn({ method: 'POST' })
  .validator((d: FiveRSubmission) => d)
  .handler(async ({ data }) => {
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
    // TODO(DB): INSERT INTO five_r_submissions ... return id
    return { ok: true, id: data.id, message: 'Tersimpan (sementara di browser)' }
  })
