import type { BracketStatus, MatchStatus, TournamentMatch } from './types'

/** Structural edit hanya saat DRAFT. */
export function canEditStructure(status: BracketStatus): boolean {
  return status === 'DRAFT'
}

/** Match siap menerima hasil: READY / IN_PROGRESS / AUTO_ADVANCED (BYE tetap tercatat). */
export function canSubmitResult(match: TournamentMatch): boolean {
  if (match.status === 'COMPLETED' || match.status === 'CANCELLED') return false
  if (match.status === 'WAITING') return false
  return match.participant1Id !== null && match.participant2Id !== null
}

/** Winner wajib merupakan salah satu peserta match. */
export function winnerBelongsToMatch(match: TournamentMatch, winnerId: number): boolean {
  return match.participant1Id === winnerId || match.participant2Id === winnerId
}

/** Koreksi hasil match completed: wajib lewat flow khusus. */
export function canCorrectResult(status: BracketStatus, matchCompleted: boolean): boolean {
  return status !== 'ARCHIVED' && matchCompleted
}

/** Bracket selesai: final selesai; bila third-place enabled, third-place harus selesai juga. */
export function isBracketCompleted(
  finalCompleted: boolean,
  thirdPlaceEnabled: boolean,
  thirdPlaceCompleted: boolean,
): boolean {
  return finalCompleted && (!thirdPlaceEnabled || thirdPlaceCompleted)
}

/** Invariant: peserta unik di initial slot (tidak boleh dobel). */
export function assertUniqueParticipants(teamIds: number[]): void {
  if (new Set(teamIds).size !== teamIds.length) throw new Error('Peserta tidak boleh dobel dalam satu bagan')
}

export function assertValidSeedPositions(positions: number[], bracketSize: number): void {
  for (const p of positions) {
    if (!Number.isInteger(p) || p < 1 || p > bracketSize) throw new Error('Posisi seed tidak valid')
  }
}

export function statusLabel(status: BracketStatus | MatchStatus): string {
  const map: Record<string, string> = {
    DRAFT: 'Draft',
    PUBLISHED: 'Diterbitkan',
    IN_PROGRESS: 'Berlangsung',
    COMPLETED: 'Selesai',
    ARCHIVED: 'Arsip',
    WAITING: 'Menunggu',
    READY: 'Siap',
    IN_PROGRESS_MATCH: 'Berlangsung',
    AUTO_ADVANCED: 'BYE',
    CANCELLED: 'Dibatalkan',
  }
  return map[status] ?? status
}
