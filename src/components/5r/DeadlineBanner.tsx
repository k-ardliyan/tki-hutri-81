/**
 * DeadlineBanner — banner periode penilaian lomba dekor-5r (start_date/end_date).
 * Redesigned for high-end UI/UX with rich gradient cards and clear status badges.
 */

import { CalendarClock, Clock, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { Badge } from '../ui/badge';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function deadlineInfo(
  deadline: string | null,
  now = new Date()
): { closed: boolean; daysLeft: number | null } {
  if (!deadline) return { closed: false, daysLeft: null };
  const d = new Date(deadline);
  return { closed: now > d, daysLeft: Math.ceil((d.getTime() - now.getTime()) / 86_400_000) };
}

export function DeadlineBanner({
  startDate,
  endDate,
}: {
  startDate: string | null;
  endDate: string | null;
}) {
  if (!startDate && !endDate) return null;

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  const now = new Date();
  const closed = end ? now > end : false;
  const notStarted = start ? now < start : false;
  const { daysLeft } = deadlineInfo(endDate, now);

  if (closed && end) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-rose-300/80 bg-gradient-to-r from-rose-100/90 via-rose-50/60 to-white p-4 shadow-xs dark:bg-rose-950/30 dark:border-rose-900/60">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-xs">
              <Lock size={18} />
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-sm font-extrabold text-rose-950 dark:text-rose-200">
                  Periode Penilaian Telah Berakhir
                </h3>
                <Badge
                  variant="outline"
                  className="bg-rose-200/80 text-rose-900 border-rose-300 px-2 py-0 text-[10px] font-black"
                >
                  Penilaian Ditutup
                </Badge>
              </div>
              <p className="text-xs text-rose-800/90 dark:text-rose-300 leading-relaxed">
                Batas akhir pengisian adalah <strong>{formatDate(end.toISOString())}</strong>. Form
                pengisian baru tidak lagi menerima jawaban.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notStarted && start) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-100/90 via-amber-50/60 to-white p-4 shadow-xs dark:bg-amber-950/30 dark:border-amber-900/60">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
            <Clock size={18} />
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-sm font-extrabold text-amber-950 dark:text-amber-200">
                Periode Penilaian Belum Dimulai
              </h3>
              <Badge
                variant="outline"
                className="bg-amber-200/80 text-amber-900 border-amber-300 px-2 py-0 text-[10px] font-black"
              >
                Belum Aktif
              </Badge>
            </div>
            <p className="text-xs text-amber-800/90 dark:text-amber-300 leading-relaxed">
              Penilaian akan dibuka resmi pada tanggal{' '}
              <strong>{formatDate(start.toISOString())}</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-rose-200/90 bg-gradient-to-r from-rose-50/90 via-white to-amber-50/60 p-4 shadow-xs dark:border-rose-900/40 dark:bg-slate-900/50">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-red to-rose-600 text-white shadow-xs">
            <CalendarClock size={19} />
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-heading text-sm font-black text-slate-900 dark:text-slate-100">
                Periode Penilaian Aktif
              </h3>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <Badge
                variant="outline"
                className="bg-emerald-100 text-emerald-800 border-emerald-300 px-2 py-0 text-[10px] font-bold"
              >
                Sedang Berjalan
              </Badge>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              {startDate ? formatDate(startDate) : 'Awal periode'} &mdash;{' '}
              {endDate ? formatDate(endDate) : 'Akhir periode'}
            </p>
          </div>
        </div>

        {endDate && daysLeft !== null && (
          <div className="flex items-center gap-2 self-start sm:self-auto bg-white/90 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs shrink-0">
            <Clock size={13} className="text-amber-500" />
            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
              Sisa {daysLeft} Hari
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
