/** Podium heat — polymorphic: rank final → podium 1/2/3. */
import type { TournamentPodium } from '../types';
import type { ResolvedRank } from './types';

/**
 * Podium dari hasil final heat.
 * rank1 = rank 1 final, rank2 = rank 2, rank3 = rank 3.
 * (Tidak butuh third-place match — final berisi 2..N peserta sekaligus.)
 */
export function calculateHeatPodium(finalRanks: ResolvedRank[]): TournamentPodium {
  const byRank = new Map(finalRanks.map((r) => [r.rank, r.participantId]));
  return {
    rank1: byRank.get(1) ?? null,
    rank2: byRank.get(2) ?? null,
    rank3: byRank.get(3) ?? null,
  };
}
