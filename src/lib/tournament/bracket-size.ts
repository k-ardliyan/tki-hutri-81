/** Bracket size & round math — single elimination. */

/** Pangkat dua terdekat ≥ n (bracket size standar). */
export function nextPowerOfTwo(n: number): number {
  if (!Number.isInteger(n) || n < 1) throw new Error('Jumlah peserta tidak valid')
  return 2 ** Math.ceil(Math.log2(n))
}

export function calculateBracketSize(participantCount: number): number {
  if (!Number.isInteger(participantCount) || participantCount < 2) throw new Error('Minimal 2 peserta untuk membuat bagan')
  return nextPowerOfTwo(participantCount)
}

/** Jumlah main round (log2 bracket size). */
export function calculateRoundCount(bracketSize: number): number {
  if (bracketSize < 2 || bracketSize % 2 !== 0) throw new Error('Ukuran bagan tidak valid')
  return Math.round(Math.log2(bracketSize))
}

export function calculateByeCount(participantCount: number, bracketSize: number): number {
  return Math.max(0, bracketSize - participantCount)
}
