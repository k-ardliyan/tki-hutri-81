/** Seeding / session assignment untuk heat elimination. */
import type { HeatSeedingMethod } from './types';

/** Fisher-Yates shuffle (dipanggil sekali saat generate; hasil disimpan). */
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Urutan serpentine: seed 1..sessionCount ke S1..Sn, blok berikut dibalik.
 * Contoh 4 sesi: 1→S1,2→S2,3→S3,4→S4, 5→S4,6→S3,7→S2,8→S1
 * → flat [1,8,2,7,3,6,4,5] (per-sesi: S1=[1,8], S2=[2,7], S3=[3,6], S4=[4,5]).
 */
export function serpentineOrder(seedOrder: readonly number[], sessionCount: number): number[] {
  const buckets: number[][] = Array.from({ length: sessionCount }, () => []);
  seedOrder.forEach((id, idx) => {
    const block = Math.floor(idx / sessionCount);
    let pos = idx % sessionCount;
    if (block % 2 === 1) pos = sessionCount - 1 - pos;
    buckets[pos].push(id);
  });
  return buckets.flat();
}

export interface AssignInput {
  /** Urutan seed peserta 1..N (untuk RANDOM: acak dulu; MANUAL: urutan apa adanya). */
  participantIds: number[];
  /** Jumlah peserta per sesi — total harus sama dengan participantIds.length. */
  sessionSizes: number[];
  method: HeatSeedingMethod;
  /** MANUAL: teamId → sessionNumber (1-based). */
  manualSessions?: Map<number, number>;
}

/**
 * Distribusikan peserta ke sesi sesuai metode.
 * Return: array per sesi berisi participantIds, urut sesuai sessionSizes.
 *
 * SEEDED_SERPENTINE: seed order dibagi serpentine; kalau sesi preferensi penuh,
 * ke sesi dengan sisa kapasitas terbesar (kapasitas = sessionSizes dihormati).
 */
export function assignToSessions(input: AssignInput): number[][] {
  const { participantIds, sessionSizes, method, manualSessions } = input;
  const totalSlots = sessionSizes.reduce((a, b) => a + b, 0);
  if (totalSlots !== participantIds.length)
    throw new Error('Jumlah slot sesi tidak sama dengan jumlah peserta');

  if (method === 'MANUAL') {
    if (!manualSessions) throw new Error('Seeding manual butuh penempatan sesi peserta');
    const buckets: number[][] = Array.from({ length: sessionSizes.length }, () => []);
    for (const id of participantIds) {
      const session = manualSessions.get(id);
      if (!session || session < 1 || session > sessionSizes.length)
        throw new Error(`Penempatan sesi tidak valid untuk peserta ${id}`);
      buckets[session - 1].push(id);
    }
    for (let i = 0; i < sessionSizes.length; i++) {
      if (buckets[i].length !== sessionSizes[i])
        throw new Error(`Sesi ${i + 1} harus berisi ${sessionSizes[i]} peserta`);
    }
    return buckets;
  }

  if (method === 'SEEDED_SERPENTINE') {
    const n = sessionSizes.length;
    const buckets: number[][] = Array.from({ length: n }, () => []);
    for (let i = 0; i < participantIds.length; i++) {
      const seed = participantIds[i];
      const col = i % n;
      const row = Math.floor(i / n);
      const pref = row % 2 === 0 ? col : n - 1 - col;
      if (buckets[pref].length < sessionSizes[pref]) {
        buckets[pref].push(seed);
      } else {
        // Sesi preferensi penuh → ke sesi dengan sisa kapasitas terbesar.
        let best = -1;
        for (let j = 0; j < n; j++) {
          const rem = sessionSizes[j] - buckets[j].length;
          if (rem > 0 && (best === -1 || rem > sessionSizes[best] - buckets[best].length)) best = j;
        }
        if (best === -1) throw new Error('Tidak ada sesi yang tersedia (serpentine)');
        buckets[best].push(seed);
      }
    }
    return buckets;
  }

  let order: number[] = [...participantIds];
  if (method === 'RANDOM') order = shuffle(participantIds);

  const sessions: number[][] = [];
  let cursor = 0;
  for (const size of sessionSizes) {
    sessions.push(order.slice(cursor, cursor + size));
    cursor += size;
  }
  return sessions;
}
