/**
 * Cache role shell /snack — mencegah flash shell salah saat pending navigasi
 * (role dari beforeLoad belum resolve). Module-level + sessionStorage.
 * Clear wajib saat LOGOUT — kalau tidak, ganti akun beda role akan flash shell lama.
 */
let cachedRole: string | null = null;

const KEY = 'tki:role';

export function getSnackRoleCache(): string | null {
  if (cachedRole) return cachedRole;
  if (typeof window !== 'undefined') {
    try {
      return sessionStorage.getItem(KEY);
    } catch {
      /* noop */
    }
  }
  return null;
}

export function setSnackRoleCache(role: string): void {
  cachedRole = role;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(KEY, role);
    } catch {
      /* noop */
    }
  }
}

export function clearSnackRoleCache(): void {
  cachedRole = null;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* noop */
    }
  }
}
