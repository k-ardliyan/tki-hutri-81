/** Tournament domain types — single elimination (heat reserved). */

export type TournamentFormat = 'SINGLE_ELIMINATION' | 'HEAT_ELIMINATION'

export type BracketStatus = 'DRAFT' | 'PUBLISHED' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED'

export type MatchStatus = 'WAITING' | 'READY' | 'IN_PROGRESS' | 'COMPLETED' | 'AUTO_ADVANCED' | 'CANCELLED'

export type SeedingMethod = 'RANDOM' | 'MANUAL' | 'REGISTRATION_ORDER'

export type ThirdPlaceMode = 'MATCH' | 'NONE'

export type RoundType = 'MAIN' | 'THIRD_PLACE'

export type ResultType = 'NORMAL' | 'BYE' | 'WALKOVER' | 'DISQUALIFIED'

export type ParticipantStatus = 'ACTIVE' | 'RESERVE' | 'WITHDRAWN'

export interface TournamentParticipant {
  teamId: number
  nama: string
}

/** Slot source: peserta langsung, pemenang/kalah match lain, atau BYE. */
export type MatchSlotSource =
  | { type: 'PARTICIPANT'; teamId: number }
  | { type: 'WINNER_OF'; matchId: number }
  | { type: 'LOSER_OF'; matchId: number }
  | { type: 'BYE' }

export interface TournamentMatch {
  id: number
  roundId: number
  matchNumber: number
  /** teamId atau null (belum terisi / BYE). */
  participant1Id: number | null
  participant2Id: number | null
  winnerId: number | null
  loserId: number | null
  status: MatchStatus
  nextMatchId: number | null
  nextMatchSlot: 1 | 2 | null
  version: number
}

export interface TournamentRound {
  id: number
  roundNumber: number
  roundType: RoundType
  name: string
  matches: TournamentMatch[]
}

export interface TournamentPodium {
  rank1: number | null
  rank2: number | null
  rank3: number | null
}

export interface BracketMeta {
  id: number
  status: BracketStatus
  format: TournamentFormat
  seedingMethod: SeedingMethod
  thirdPlaceEnabled: boolean
  participantCount: number
  bracketSize: number
}

export interface BracketDetail {
  bracket: BracketMeta
  rounds: TournamentRound[]
  thirdPlaceMatch: TournamentMatch | null
  podium: TournamentPodium
  participants: TournamentParticipant[]
}

// ─── View types (normalized getBracket response, dipakai UI) ───

export interface MatchView {
  id: number
  matchNumber: number
  participant1Id: number | null
  participant2Id: number | null
  participant1Nama: string | null
  participant2Nama: string | null
  /** Nomor seed asal (undian) tiap peserta — hanya bermakna round 1. */
  seed1: number | null
  seed2: number | null
  winnerId: number | null
  loserId: number | null
  status: MatchStatus
  nextMatchId: number | null
  nextMatchSlot: 1 | 2 | null
  version: number
}

export interface RoundView {
  id: number
  roundNumber: number
  roundType: RoundType
  name: string
  matches: MatchView[]
}

export interface SeedView {
  seed: number
  teamId: number
  nama: string
}

export interface SlotView {
  slot: number
  teamId: number | null
  seed: number | null
  nama: string | null
  bye: boolean
}

export interface BracketDetailView {
  bracket: BracketMeta
  rounds: RoundView[]
  thirdPlaceMatch: MatchView | null
  podium: TournamentPodium
  participants: TournamentParticipant[]
  /** Urutan undian (seed 1..N). */
  seeds: SeedView[]
  /** Peta slot round 1 (1..bracketSize) — BYE shift tercermin di sini. */
  slots: SlotView[]
}
