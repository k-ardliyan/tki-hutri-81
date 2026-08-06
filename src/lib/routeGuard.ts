/**
 * routeGuard.ts — helper requireRole untuk route beforeLoad.
 * Memanggil getSession (DB/cookie) lalu redirect jika role tidak diizinkan.
 */
import { redirect } from '@tanstack/react-router'
import { getSession } from '../server/functions/auth'
import type { UserRole } from './auth'

export async function requireRole(roles: UserRole[], home?: string) {
  const { role } = await getSession()
  if (!role) throw redirect({ to: '/login' })
  if (!roles.includes(role)) throw redirect({ to: home ?? '/login' })
  return role
}
