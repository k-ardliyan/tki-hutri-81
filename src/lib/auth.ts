/**
 * auth.ts — shared auth helpers (browser-safe pure module).
 * bcryptjs jalan di server (createServerFn handler); modul ini hanya helper.
 */
import bcrypt from 'bcryptjs';

export type UserRole = 'superadmin' | 'admin' | 'petugas' | 'audit';

export const SESSION_COOKIE = 'tki5r_session';

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  petugas: 'Petugas',
  audit: 'Audit',
};

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}
