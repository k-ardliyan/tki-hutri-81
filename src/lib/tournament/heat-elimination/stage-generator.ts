/** Auto stage generation — hitung stage sampai remaining <= finalSize. */
import { distributeSessions } from './session-distribution';
import type { AutoStage, HeatResultMode } from './types';

/** Nama default stage (bisa diganti admin — nama bukan business logic). */
export function defaultStageName(stageNumber: number, totalStages: number): string {
  if (stageNumber === totalStages) return 'Final';
  if (stageNumber === 1) return 'Penyisihan';
  if (stageNumber === totalStages - 1) return 'Semifinal';
  if (stageNumber === totalStages - 2) return 'Perempat Final';
  return `Babak ${stageNumber}`;
}

export interface AutoStageInput {
  participantCount: number;
  teamsPerSession: number;
  qualifiersPerSession: number;
  finalSize: number;
  resultMode?: HeatResultMode;
}

/**
 * Generate stage otomatis (AUTO mode).
 * - Stage eliminasi dibuat selama remaining > finalSize; tiap stage meloloskan
 *   qualifiersPerSession × jumlah sesi peserta.
 * - Stage terakhir = Final (isFinal), berisi seluruh peserta tersisa (≤ finalSize).
 * - Guard: kalau qualifiers >= remaining (tidak ada eliminasi) → langsung Final
 *   (mencegah infinite loop; konfigurasi sehat wajib qualifiers < teamsPerSession).
 */
export function autoGenerateStages(input: AutoStageInput): AutoStage[] {
  const {
    participantCount,
    teamsPerSession,
    qualifiersPerSession,
    finalSize,
    resultMode = 'MANUAL_POSITION',
  } = input;
  if (!Number.isInteger(participantCount) || participantCount < 2)
    throw new Error('Minimal 2 peserta untuk membuat bagan');
  if (!Number.isInteger(teamsPerSession) || teamsPerSession < 2)
    throw new Error('Tim maksimum per sesi minimal 2');
  if (!Number.isInteger(qualifiersPerSession) || qualifiersPerSession < 1)
    throw new Error('Tim lolos per sesi minimal 1');
  if (qualifiersPerSession >= teamsPerSession)
    throw new Error('Tim lolos harus lebih kecil dari tim maksimum per sesi');
  if (!Number.isInteger(finalSize) || finalSize < 2) throw new Error('Ukuran final minimal 2');

  const stages: AutoStage[] = [];
  let remaining = participantCount;
  let stageNumber = 1;

  while (remaining > finalSize) {
    const sizes = distributeSessions(remaining, teamsPerSession);
    const qualifiers = sizes.length * qualifiersPerSession;
    // Tidak ada eliminasi → berhenti, sisa masuk Final (bukan stage eliminasi).
    if (qualifiers >= remaining) break;
    stages.push({
      stageNumber,
      name: '', // diisi setelah total stage diketahui (defaultStageName butuh total)
      teamsPerSession,
      advancementMode: 'TOP_N_PER_SESSION',
      qualifiersPerSession,
      resultMode,
      isFinal: false,
      sessionSizes: sizes,
    });
    remaining = qualifiers;
    stageNumber += 1;
  }

  const totalStages = stageNumber; // stageNumber sudah = index final setelah loop
  const result = stages.map((s) => ({
    ...s,
    name: defaultStageName(s.stageNumber, totalStages),
  }));
  result.push({
    stageNumber,
    name: 'Final',
    teamsPerSession: Math.max(2, Math.min(finalSize, remaining)),
    advancementMode: 'TOP_N_PER_SESSION',
    qualifiersPerSession: 0,
    resultMode,
    isFinal: true,
    sessionSizes: [remaining],
  });
  return result;
}
