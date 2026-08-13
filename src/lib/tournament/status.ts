import type { BracketStatus } from './types';
import { isBracketCompleted } from './validation';

/** Transisi status bracket otomatis berdasarkan event. */
export function nextBracketStatus(
  current: BracketStatus,
  event: {
    published: boolean;
    hasAnyResult: boolean;
    finalCompleted: boolean;
    thirdPlaceEnabled: boolean;
    thirdPlaceCompleted: boolean;
  }
): BracketStatus {
  if (current === 'ARCHIVED') return current;
  if (event.published && current === 'DRAFT') return 'PUBLISHED';
  // Final selesai → COMPLETED, didahulukan dari PUBLISHED→IN_PROGRESS supaya
  // bracket kecil (2 peserta = 1 match) tak tersangkut di IN_PROGRESS setelah
  // submit tunggal yang sekaligus menuntaskan final.
  if (isBracketCompleted(event.finalCompleted, event.thirdPlaceEnabled, event.thirdPlaceCompleted))
    return 'COMPLETED';
  if (current === 'PUBLISHED' && event.hasAnyResult) return 'IN_PROGRESS';
  // Koreksi/invalidate membatalkan hasil final → turun dari COMPLETED.
  if (current === 'COMPLETED' && !event.finalCompleted && event.hasAnyResult) return 'IN_PROGRESS';
  return current;
}
