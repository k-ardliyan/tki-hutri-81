/** Validasi konfigurasi heat — hard errors + soft warnings. */

import { distributeSessions } from './session-distribution';
import { autoGenerateStages } from './stage-generator';
import type { HeatResultMode } from './types';

export interface HeatConfigInput {
  participantCount: number;
  teamsPerSession: number;
  qualifiersPerSession: number;
  finalSize: number;
  resultMode?: HeatResultMode;
}

export interface HeatConfigValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/** Pesan warning utk satu sesi (konteks stage + nomor sesi). */
function warningForSession(
  stageName: string | null,
  sessionIndex: number,
  size: number,
  qualifiersPerSession: number
): string {
  const where = stageName ? `${stageName} Sesi ${sessionIndex}` : `Sesi ${sessionIndex}`;
  if (size === 1) return `${where} hanya berisi 1 peserta (pertandingan tidak berguna).`;
  if (size <= qualifiersPerSession)
    return `${where} berisi ${size} peserta dan lolos ${qualifiersPerSession}: tidak ada yang gugur.`;
  return '';
}

/**
 * Hard validation (PRD §34) + soft warnings.
 * Warning dihitung utk SEMUA stage hasil auto-generate dengan konteks
 * stage + nomor sesi, lalu di-dedup (pesan identik tidak diulang).
 * - sesi dengan 1 peserta (pertandingan tidak berguna);
 * - sesi berisi <= qualifiers (semua lolos tanpa gugur).
 */
export function validateHeatConfig(input: HeatConfigInput): HeatConfigValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { participantCount, teamsPerSession, qualifiersPerSession, finalSize } = input;

  if (!Number.isInteger(participantCount) || participantCount < 2)
    errors.push('Minimal 2 peserta untuk membuat bagan');
  if (!Number.isInteger(teamsPerSession) || teamsPerSession < 2)
    errors.push('Tim maksimum per sesi minimal 2');
  if (
    Number.isInteger(teamsPerSession) &&
    Number.isInteger(participantCount) &&
    teamsPerSession > participantCount
  )
    errors.push(`Tim maksimum per sesi tidak boleh melebihi jumlah peserta (${participantCount})`);
  if (!Number.isInteger(qualifiersPerSession) || qualifiersPerSession < 1)
    errors.push('Tim lolos per sesi minimal 1');
  if (qualifiersPerSession >= teamsPerSession)
    errors.push('Tim lolos harus lebih kecil dari tim maksimum per sesi');
  if (!Number.isInteger(finalSize) || finalSize < 2) errors.push('Ukuran final minimal 2');

  if (errors.length === 0) {
    try {
      // Scan SEMUA stage dari auto-generate (termasuk stage 1) dgn konteks nama.
      const stages = autoGenerateStages(input);
      const seen = new Set<string>();
      for (const stage of stages) {
        stage.sessionSizes.forEach((size, i) => {
          const msg = warningForSession(stage.name, i + 1, size, qualifiersPerSession);
          if (msg && !seen.has(msg)) {
            seen.add(msg);
            warnings.push(msg);
          }
        });
      }
      // Fallback: kalau auto-generate langsung jadi Final (qualifiers >= remaining)
      // dan tidak menghasilkan stage eliminasi, setidaknya warning stage-1 dari
      // distribusi awal tetap tampil.
      if (stages.length === 1) {
        const sizes = distributeSessions(participantCount, teamsPerSession);
        sizes.forEach((size, i) => {
          const msg = warningForSession(null, i + 1, size, qualifiersPerSession);
          if (msg && !seen.has(msg)) {
            seen.add(msg);
            warnings.push(msg);
          }
        });
      }
    } catch {
      // invalid input — sudah di-cover hard errors.
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
