/**
 * Session signing — server-only (jangan import dari client code).
 * Cookie session `{role, username}` ditandatangani HMAC-SHA256 agar tidak
 * bisa dipalsukan. Wajib set SESSION_SECRET di production.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const SECRET = process.env.SESSION_SECRET ?? 'dev-insecure-secret';

if (SECRET === 'dev-insecure-secret') {
  console.warn(
    '[session] SESSION_SECRET belum diset — pakai fallback insecure. Set SESSION_SECRET di production.'
  );
}

export function signSession(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('hex');
}

export function verifySession(payload: string, sig: string): boolean {
  const expected = signSession(payload);
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
