/**
 * Date utilities — shared across 5R pages.
 *
 * createdAt di DB = UTC (from new Date().toISOString()).
 * Filter harus pakai UTC date prefix supaya consistent.
 *
 * Periode penilaian per-minggu:
 * - startDate = tanggal mulai periode (assessment_deadlines.start_date)
 * - weekNumber = 1-based, relatif ke startDate (hari ke-1..7 = minggu 1, dst)
 */

/** UTC date prefix (YYYY-MM-DD) — matches createdAt from DB. */
export function todayPrefix(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

/**
 * Hitung nomor minggu (1-based) dari tanggal relatif ke startDate.
 * Tanggal sebelum startDate → 0 (di luar periode).
 */
export function weekNumber(date: Date, startDate: Date): number {
  if (date < startDate) return 0;
  return Math.floor((date.getTime() - startDate.getTime()) / WEEK_MS) + 1;
}

/** Nomor minggu saat ini relatif ke startDate. */
export function currentWeekNumber(startDate: Date): number {
  return weekNumber(new Date(), startDate);
}

/** Total minggu dalam periode [startDate, endDate]. */
export function totalWeeks(startDate: Date, endDate: Date): number {
  if (endDate < startDate) return 0;
  // Harus KONSISTEN dgn weekNumber: ceil(diff/7d) vs floor(diff/7d)+1 beda di
  // kelipatan 7 hari persis (end = start+7d → ceil=1 tapi weekNumber hari ke-7 = 2).
  // Kalau beda, submission hari ke-7 masuk minggu 2 yang tidak ada di accordion UI.
  return weekNumber(endDate, startDate);
}

/** Rentang tanggal (inklusif) untuk minggu ke-N relatif ke startDate. */
export function weekDateRange(week: number, startDate: Date): { start: Date; end: Date } {
  const start = new Date(startDate);
  start.setDate(start.getDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

/** ISO date prefix (YYYY-MM-DD) untuk filter submission di minggu tertentu. */
export function weekPrefix(week: number, startDate: Date): { start: string; end: string } {
  const range = weekDateRange(week, startDate);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(range.start), end: fmt(range.end) };
}

/** Label tanggal rentang minggu, e.g. "10–16 Agu" (bahasa Indonesia). */
export function formatWeekRange(week: number, startDate: Date): string {
  const { start, end } = weekDateRange(week, startDate);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `${start.toLocaleDateString('id-ID', opts)} – ${end.toLocaleDateString('id-ID', opts)}`;
}

/** Item submission minimal utk agregasi mingguan (hanya butuh weekNumber). */
export interface WeeklySeriesItem {
  weekNumber?: number;
}

/**
 * Seri mingguan penilaian: { date: 'YYYY-MM-DD', count } — date = tanggal mulai
 * tiap minggu relatif ke start_date periode. Chart tetap kompatibel (filter/tick
 * pakai ISO). Tanpa startDate: label fallback `M${week}`.
 *
 * Caller wajib filter form yang TIDAK ikut (mis. dekorasi) sebelum memanggil.
 */
export function buildWeeklySeries(
  items: WeeklySeriesItem[],
  startDate: string | null
): { date: string; count: number }[] {
  const start = startDate ? new Date(startDate) : null;
  const countMap = new Map<number, number>();
  for (const s of items) {
    const week = s.weekNumber ?? 1;
    countMap.set(week, (countMap.get(week) ?? 0) + 1);
  }
  const weeks = start
    ? Array.from({ length: Math.max(1, ...countMap.keys()) }, (_, i) => i + 1)
    : [...countMap.keys()].sort((a, b) => a - b);
  return weeks.map((week) => {
    let key = `M${week}`;
    if (start) {
      const d = new Date(start);
      d.setDate(d.getDate() + (week - 1) * 7);
      key = d.toISOString().slice(0, 10);
    }
    return { date: key, count: countMap.get(week) ?? 0 };
  });
}

/** Hasil validasi periode penilaian (start/end ISO string atau null). */
export type PeriodValidation =
  | { ok: true; startDate: Date | null; endDate: Date | null }
  | { ok: false; error: string };

/**
 * Validasi periode penilaian. Aturan:
 * - Tanggal invalid (NaN) → tolak.
 * - end <= start → tolak.
 * - start-only (mulai tanpa akhir) → tolak: submission ditolak server ("Periode
 *   belum diatur") padahal UI tampil aktif — jebakan admin.
 * - end-only (mulai null, akhir set) → DIIZINKAN = mode legacy setDeadline
 *   (periode tetap "belum lengkap", submission ditolak, sama dgn perilaku lama).
 */
export function validatePeriod(startIso: string | null, endIso: string | null): PeriodValidation {
  const startDate = startIso ? new Date(startIso) : null;
  const endDate = endIso ? new Date(endIso) : null;
  if (
    (startDate && Number.isNaN(startDate.getTime())) ||
    (endDate && Number.isNaN(endDate.getTime()))
  ) {
    return { ok: false, error: 'Tanggal periode tidak valid' };
  }
  if (startDate && endDate && endDate <= startDate) {
    return { ok: false, error: 'Tanggal selesai harus setelah tanggal mulai' };
  }
  if (startDate && !endDate) {
    return {
      ok: false,
      error: 'Periode harus lengkap: isi tanggal mulai DAN selesai, atau kosongkan keduanya',
    };
  }
  return { ok: true, startDate, endDate };
}
