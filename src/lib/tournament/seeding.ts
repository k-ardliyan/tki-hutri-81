import type { SeedingMethod, TournamentParticipant } from './types'

/**
 * Urutan peserta ke posisi seed 1..N.
 * RANDOM: shuffle deterministik sekali (server persist hasilnya ke DB).
 * REGISTRATION_ORDER: urutan input apa adanya.
 * MANUAL: pemanggil menyediakan posisi per peserta.
 */
export function generateSeedOrder(
  method: SeedingMethod,
  participants: TournamentParticipant[],
  manualPositions?: Map<number, number>,
): number[] {
  const ids = participants.map((p) => p.teamId)
  if (method === 'REGISTRATION_ORDER') return ids
  if (method === 'MANUAL') {
    if (!manualPositions) throw new Error('Seeding manual butuh posisi peserta')
    const ordered: Array<number | undefined> = Array(ids.length).fill(undefined)
    for (const [teamId, pos] of manualPositions) {
      if (!Number.isInteger(pos) || pos < 1 || pos > ids.length) throw new Error('Posisi seed tidak valid')
      ordered[pos - 1] = teamId
    }
    if (ordered.some((v) => v === undefined)) throw new Error('Semua peserta harus punya posisi seed')
    return ordered as number[]
  }
  // RANDOM — Fisher-Yates (dipanggil sekali saat generate; hasil disimpan).
  const arr = [...ids]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
