/**
 * Server functions — auth via DB users.
 * Cookie HttpOnly `tki5r_session` berisi { role, username } — username dipakai sebagai claimed_by di snack.
 */
import { createServerFn } from '@tanstack/react-start'
import { getCookie, setCookie } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { assertDb } from '../db'
import { users } from '../db/schema'
import { verifyPassword, SESSION_COOKIE, type UserRole } from '../../lib/auth'

export interface SessionUser {
  role: UserRole | null
  username: string | null
}

/** Get current session. Returns { role, username } or nulls. */
export const getSession = createServerFn({ method: 'GET' }).handler(async (): Promise<SessionUser> => {
  const raw = getCookie(SESSION_COOKIE)
  if (!raw) return { role: null, username: null }
  try {
    const parsed = JSON.parse(raw) as { role?: UserRole; username?: string }
    const validRoles: UserRole[] = ['superadmin', 'admin', 'petugas', 'audit']
    if (!parsed.role || !validRoles.includes(parsed.role)) return { role: null, username: null }
    return { role: parsed.role, username: parsed.username ?? null }
  } catch {
    return { role: null, username: null }
  }
})

/** Login with DB users. Sets session cookie on success. */
export const login = createServerFn({ method: 'POST' })
  .validator((d: { username: string; password: string }) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; role?: UserRole; username?: string; error?: string }> => {
    const { username, password } = data
    const db = assertDb()
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1)
    if (!user || !user.isActive) return { ok: false, error: 'Username atau password salah' }
    const ok = await verifyPassword(password, user.passwordHash)
    if (!ok) return { ok: false, error: 'Username atau password salah' }
    setCookie(SESSION_COOKIE, JSON.stringify({ role: user.role, username: user.username }), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
    return { ok: true, role: user.role, username: user.username }
  })

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  setCookie(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return { ok: true }
})
