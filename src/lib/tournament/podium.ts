import type { TournamentMatch, TournamentPodium } from './types'

/**
 * Podium derived dari result, bukan disimpan manual.
 * Juara 1 = winner final, Juara 2 = loser final, Juara 3 = winner third-place (bila ada).
 */
export function calculatePodium(finalMatch: TournamentMatch | null, thirdPlaceMatch: TournamentMatch | null): TournamentPodium {
  if (!finalMatch || finalMatch.status !== 'COMPLETED' || finalMatch.winnerId === null) {
    return { rank1: null, rank2: null, rank3: null }
  }
  const rank3 =
    thirdPlaceMatch && thirdPlaceMatch.status === 'COMPLETED' && thirdPlaceMatch.winnerId !== null
      ? thirdPlaceMatch.winnerId
      : null
  return {
    rank1: finalMatch.winnerId,
    rank2: finalMatch.loserId,
    rank3,
  }
}
