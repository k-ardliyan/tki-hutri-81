/** Status heat — stage PENDING/ACTIVE/COMPLETED + transisi tournament. */
import type { HeatSessionStatus, HeatStageStatus } from './types';

/** Stage aktif pertama = stage[0] saat publish; sisanya PENDING. */
export function initialStageStatuses(stageCount: number): HeatStageStatus[] {
  return Array.from({ length: stageCount }, (_, i) => (i === 0 ? 'ACTIVE' : 'PENDING'));
}

/** Semua sesi stage selesai (COMPLETED/CANCELLED) → stage bisa difinalisasi. */
export function isStagePlayable(sessions: HeatSessionStatus[]): boolean {
  return sessions.every((s) => s === 'COMPLETED' || s === 'CANCELLED');
}

/** Status sesi setelah peserta terisi penuh: WAITING → READY. */
export function sessionStatusWhenFilled(
  current: HeatSessionStatus,
  participantCount: number,
  expectedCount: number
): HeatSessionStatus {
  if (current === 'COMPLETED' || current === 'CANCELLED') return current;
  if (current === 'READY') return 'READY';
  return participantCount >= expectedCount ? 'READY' : 'WAITING';
}
