/** Distribusi peserta ke sesi — balanced, hindari sesi 1 peserta bila memungkinkan. */

/**
 * Bagi `count` peserta ke sesi dengan maksimum `maxPerSession` per sesi.
 * Jumlah sesi = ceil(count / maxPer); selisih ukuran antar sesi ≤ 1; diurutkan menurun.
 *
 * Contoh: 10/4 → [4,3,3]; 11/4 → [4,4,3]; 9/4 → [3,3,3]; 16/4 → [4,4,4,4].
 * Satu-satunya kasus sesi 1 peserta: count = 1 (final legal bila diizinkan konfigurasi).
 */
export function distributeSessions(count: number, maxPerSession: number): number[] {
  if (!Number.isInteger(count) || count < 1) throw new Error('Jumlah peserta tidak valid');
  if (!Number.isInteger(maxPerSession) || maxPerSession < 2)
    throw new Error('Tim maksimum per sesi minimal 2');
  if (count === 1) return [1];
  const sessionCount = Math.ceil(count / maxPerSession);
  const base = Math.floor(count / sessionCount);
  const rem = count % sessionCount;
  const sizes = Array(sessionCount).fill(base);
  for (let i = 0; i < rem; i++) sizes[i] += 1;
  sizes.sort((a, b) => b - a);
  return sizes;
}
