/**
 * Server function middleware — auth boundary.
 *
 * TanStack Start: route guard (`beforeLoad`) BUKAN data boundary — server fn
 * adalah RPC endpoint yang bisa dipanggil langsung. Semua server fn yang
 * mengakses data privat WAJIB attach middleware ini.
 *
 * - authMiddleware: parse + verifikasi session cookie → inject `auth` ke context.
 * - adminOnly: authMiddleware + role superadmin/admin (guard mutasi admin).
 */
import { createMiddleware } from '@tanstack/react-start';
import type { UserRole } from '../../lib/auth';
import { getSession } from '../functions/auth';

export interface AuthContext {
  role: UserRole | null;
  username: string | null;
}

export const authMiddleware = createMiddleware().server(async ({ next }) => {
  const session = await getSession();
  const auth: AuthContext = { role: session.role, username: session.username };
  return next({ context: { auth } });
});

export const adminOnly = createMiddleware()
  .middleware([authMiddleware])
  .server(async ({ next, context }) => {
    const { auth } = context as { auth: AuthContext };
    if (!auth.role || !['superadmin', 'admin'].includes(auth.role)) {
      throw new Error('Tidak memiliki akses');
    }
    return next({ context: { auth } });
  });
