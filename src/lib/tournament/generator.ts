import { calculateBracketSize, calculateRoundCount } from './bracket-size'
import type { RoundType } from './types'

/** Slot round 1: peserta pada posisi seed (1-based) atau BYE. */
export type InitialSlot = { kind: 'PARTICIPANT'; seedPosition: number } | { kind: 'BYE' }

/** Slot round > 1: referensi ke match round sebelumnya. */
export type DerivedSlot =
  | { kind: 'WINNER_OF'; matchNumber: number }
  | { kind: 'LOSER_OF'; matchNumber: number }

export interface GeneratedMatch {
  roundNumber: number
  roundType: RoundType
  matchNumber: number
  slot1: InitialSlot | DerivedSlot
  slot2: InitialSlot | DerivedSlot
  /** Destination untuk winner: match di round berikutnya. */
  nextRoundNumber: number | null
  nextMatchNumber: number | null
  nextSlot: 1 | 2 | null
}

export interface GeneratedRound {
  roundNumber: number
  roundType: RoundType
  name: string
  matchCount: number
}

export interface GeneratedBracket {
  bracketSize: number
  participantCount: number
  byeCount: number
  rounds: GeneratedRound[]
  matches: GeneratedMatch[]
  thirdPlaceEnabled: boolean
}

/** Nama round standar: Round of X → Quarterfinal → Semifinal → Final. */
export function getRoundName(roundNumber: number, roundCount: number): string {
  if (roundNumber === roundCount) return 'Final'
  if (roundNumber === roundCount - 1) return 'Semifinal'
  if (roundNumber === roundCount - 2) return 'Quarterfinal'
  const remaining = 2 ** (roundCount - roundNumber + 1)
  return `Round of ${remaining}`
}

/**
 * Generate struktur bracket lengkap (sekali, deterministik).
 * Winner match j di round r → match ceil(j/2) di round r+1, slot ganjil=1, genap=2.
 * BYE pada round 1 di-resolve otomatis (lihat resolveByeMatches di server).
 */
export function generateBracketStructure(participantCount: number, thirdPlaceEnabled: boolean): GeneratedBracket {
  const bracketSize = calculateBracketSize(participantCount)
  const roundCount = calculateRoundCount(bracketSize)
  const byeCount = bracketSize - participantCount

  const rounds: GeneratedRound[] = []
  const matches: GeneratedMatch[] = []

  for (let r = 1; r <= roundCount; r++) {
    const matchCount = bracketSize / 2 ** r
    rounds.push({
      roundNumber: r,
      roundType: 'MAIN',
      name: getRoundName(r, roundCount),
      matchCount,
    })

    for (let j = 1; j <= matchCount; j++) {
      const isFirstRound = r === 1
      const slot1: InitialSlot | DerivedSlot = isFirstRound
        ? { kind: 'PARTICIPANT', seedPosition: 2 * j - 1 }
        : { kind: 'WINNER_OF', matchNumber: 2 * j - 1 }
      const slot2: InitialSlot | DerivedSlot = isFirstRound
        ? { kind: 'PARTICIPANT', seedPosition: 2 * j }
        : { kind: 'WINNER_OF', matchNumber: 2 * j }

      const isLastRound = r === roundCount
      matches.push({
        roundNumber: r,
        roundType: 'MAIN',
        matchNumber: j,
        slot1,
        slot2,
        nextRoundNumber: isLastRound ? null : r + 1,
        nextMatchNumber: isLastRound ? null : Math.ceil(j / 2),
        nextSlot: isLastRound ? null : (j % 2 === 1 ? 1 : 2),
      })
    }
  }

  // Third place: loser semifinal 1 vs loser semifinal 2 (setelah final).
  let thirdPlaceRounds: GeneratedRound[] = []
  let thirdPlaceMatches: GeneratedMatch[] = []
  if (thirdPlaceEnabled && roundCount >= 2) {
    const semiMatchCount = 2
    thirdPlaceRounds = [
      { roundNumber: roundCount + 1, roundType: 'THIRD_PLACE', name: 'Perebutan Juara 3', matchCount: 1 },
    ]
    thirdPlaceMatches = [
      {
        roundNumber: roundCount + 1,
        roundType: 'THIRD_PLACE',
        matchNumber: 1,
        slot1: { kind: 'LOSER_OF', matchNumber: 1 },
        slot2: { kind: 'LOSER_OF', matchNumber: semiMatchCount },
        nextRoundNumber: null,
        nextMatchNumber: null,
        nextSlot: null,
      },
    ]
  }

  return {
    bracketSize,
    participantCount,
    byeCount,
    rounds: [...rounds, ...thirdPlaceRounds],
    matches: [...matches, ...thirdPlaceMatches],
    thirdPlaceEnabled,
  }
}
