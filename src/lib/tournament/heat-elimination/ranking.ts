/** Ranking resolver — ubah input hasil sesi menjadi peringkat pasti 1..N. */
import type { HeatResultMode, ResolvedRank, SessionResultInput } from './types';

/** Status yang berarti peserta tidak dapat lolos (anggap di bawah peringkat). */
const NON_QUALIFIABLE: ReadonlySet<string> = new Set(['DISQUALIFIED', 'DNS', 'DNF', 'WALKOVER']);

/**
 * Selesaikan peringkat sesuai result mode.
 * - MANUAL_POSITION: rank diinput admin (wajib unik 1..N tanpa celah).
 * - TIME_ASC: waktu terkecil = rank 1 (wajib semua terisi timeMs).
 * - SCORE_DESC: skor terbesar = rank 1 (wajib semua terisi score).
 * Peserta dengan status NON_QUALIFIABLE dilepas dari ranking (dianggap gugur).
 */
export function resolveRanks(inputs: SessionResultInput[], mode: HeatResultMode): ResolvedRank[] {
  if (inputs.length === 0) return [];
  const active = inputs.filter((r) => !NON_QUALIFIABLE.has(r.resultStatus ?? 'NORMAL'));

  if (mode === 'MANUAL_POSITION') {
    const withRank = active.filter((r) => r.rank !== null && r.rank !== undefined);
    if (withRank.length !== active.length)
      throw new Error('Semua peserta wajib diberi peringkat (MANUAL_POSITION)');
    const sorted = [...withRank].sort((a, b) => (a.rank as number) - (b.rank as number));
    const ranks = sorted.map((r) => r.rank as number);
    if (new Set(ranks).size !== ranks.length) throw new Error('Peringkat tidak boleh dobel');
    if (ranks[0] !== 1 || ranks[ranks.length - 1] !== ranks.length)
      throw new Error('Peringkat harus berurutan 1..N tanpa ada yang kosong');
    return sorted.map((r) => ({ participantId: r.participantId, rank: r.rank as number }));
  }

  if (mode === 'TIME_ASC') {
    const withTime = active.filter((r) => r.timeMs !== null && r.timeMs !== undefined);
    if (withTime.length !== active.length)
      throw new Error('Semua peserta wajib diisi waktu (TIME_ASC)');
    return [...withTime]
      .sort((a, b) => (a.timeMs as number) - (b.timeMs as number))
      .map((r, i) => ({ participantId: r.participantId, rank: i + 1 }));
  }

  // SCORE_DESC
  const withScore = active.filter((r) => r.score !== null && r.score !== undefined);
  if (withScore.length !== active.length)
    throw new Error('Semua peserta wajib diisi skor (SCORE_DESC)');
  return [...withScore]
    .sort((a, b) => (b.score as number) - (a.score as number))
    .map((r, i) => ({ participantId: r.participantId, rank: i + 1 }));
}
