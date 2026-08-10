import type { TournamentMatch } from './types';

/** Destination match & slot untuk winner sebuah match (null = final). */
export function getMatchDestination(
  match: TournamentMatch
): { matchId: number; slot: 1 | 2 } | null {
  if (match.nextMatchId === null || match.nextMatchSlot === null) return null;
  return { matchId: match.nextMatchId, slot: match.nextMatchSlot };
}

/** Destination match & slot untuk loser (hanya semifinal → third place). */
export function getLoserDestination(
  match: TournamentMatch
): { matchId: number; slot: 1 | 2 } | null {
  if (match.nextMatchId === null) return null;
  // Loser tidak lanjut di jalur main; third-place wiring dilakukan service via slot LOSER_OF.
  return null;
}

/**
 * Status sebuah match setelah salah satu slot berubah.
 * Kedua slot terisi → READY; belum → WAITING (atau AUTO_ADVANCED bila salah satu slot BYE).
 */
export function resolveDownstreamStatus(
  match: TournamentMatch,
  slot1IsBye: boolean,
  slot2IsBye: boolean
): TournamentMatch['status'] {
  if (
    match.status === 'COMPLETED' ||
    match.status === 'AUTO_ADVANCED' ||
    match.status === 'CANCELLED'
  ) {
    return match.status;
  }
  if (match.participant1Id !== null && match.participant2Id !== null) return 'READY';
  if (
    (match.participant1Id !== null && slot2IsBye) ||
    (match.participant2Id !== null && slot1IsBye)
  )
    return 'READY';
  return 'WAITING';
}

/** Round selesai bila semua match-nya COMPLETED/AUTO_ADVANCED. */
export function isRoundCompleted(matches: TournamentMatch[]): boolean {
  return (
    matches.length > 0 &&
    matches.every((m) => m.status === 'COMPLETED' || m.status === 'AUTO_ADVANCED')
  );
}
