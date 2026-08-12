/** Qualification — tentukan peserta lolos dari hasil sesi/stage (TOP_N_PER_SESSION). */
import type { HeatAdvancementMode, QualifiedParticipant, ResolvedRank } from './types';

export interface QualifyInput {
  mode: HeatAdvancementMode;
  qualifiersPerSession: number;
  /** Per-sesi: ranked results tiap sesi (sudah resolveRanks). */
  bySession: Array<{ sessionId: number | null; ranks: ResolvedRank[] }>;
}

/**
 * Hitung daftar qualifier untuk stage berikutnya.
 * TOP_N_PER_SESSION: ambil N teratas per sesi.
 * TOP_N_OVERALL: gabung semua hasil stage, ambil N teratas keseluruhan.
 * MANUAL: pemanggil menyediakan pilihan manual (mode ini return kosong; service
 *        yang menangani assignment manual).
 */
export function qualify(input: QualifyInput): QualifiedParticipant[] {
  if (input.mode === 'MANUAL') return [];
  if (input.mode === 'TOP_N_OVERALL') {
    const merged = input.bySession.flatMap((s) =>
      s.ranks.map((r) => ({ participantId: r.participantId, rank: r.rank, sessionId: s.sessionId }))
    );
    merged.sort((a, b) => a.rank - b.rank);
    return merged.slice(0, input.qualifiersPerSession).map((m) => ({
      participantId: m.participantId,
      sourceRank: m.rank,
      sourceSessionId: m.sessionId,
    }));
  }
  // TOP_N_PER_SESSION
  const out: QualifiedParticipant[] = [];
  for (const s of input.bySession) {
    const sorted = [...s.ranks].sort((a, b) => a.rank - b.rank);
    for (const r of sorted.slice(0, input.qualifiersPerSession)) {
      out.push({
        participantId: r.participantId,
        sourceRank: r.rank,
        sourceSessionId: s.sessionId,
      });
    }
  }
  return out;
}
