/**
 * DeadlineBanner — banner tenggat penilaian lomba dekor-5r.
 * Dipakai halaman isi (audit + admin) & live score.
 */

import { CalendarClock, Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

export function deadlineInfo(
  deadline: string | null,
  now = new Date()
): { closed: boolean; daysLeft: number | null } {
  if (!deadline) return { closed: false, daysLeft: null };
  const d = new Date(deadline);
  return { closed: now > d, daysLeft: Math.ceil((d.getTime() - now.getTime()) / 86_400_000) };
}

export function DeadlineBanner({ deadline }: { deadline: string | null }) {
  if (!deadline) return null;
  const { closed, daysLeft } = deadlineInfo(deadline);
  if (closed) {
    return (
      <Alert variant="destructive">
        <Lock size={16} />
        <AlertTitle>Penilaian ditutup</AlertTitle>
        <AlertDescription>
          Tenggat penilaian sudah lewat ({formatDate(deadline)}). Penilaian baru tidak bisa dikirim.
          Hubungi admin bila ada koreksi.
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert>
      <CalendarClock size={16} />
      <AlertTitle>Tenggat penilaian</AlertTitle>
      <AlertDescription>
        {formatDate(deadline)} · sisa {daysLeft} hari (penilaian terkunci otomatis setelah tenggat)
      </AlertDescription>
    </Alert>
  );
}
