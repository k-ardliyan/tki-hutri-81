import { useLoaderData } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const phaseColors: Record<string, PhaseColor> = {
  kickoff: {
    label: 'Sosialisasi',
    solid: 'bg-violet-500',
    soft: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-300',
    ring: 'ring-violet-300',
    dot: 'bg-violet-500',
    chip: 'bg-violet-100 text-violet-800 border-violet-200',
    bar: 'bg-violet-500',
    rangeBg: 'bg-violet-100/90',
    rangeBorder: 'border-violet-300',
    hoverCard: 'hover:border-violet-300 hover:bg-violet-50/80',
    activeCard: 'border-violet-400 bg-violet-50 ring-2 ring-violet-200',
  },
  dekor: {
    label: 'Dekorasi',
    solid: 'bg-amber-500',
    soft: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-300',
    ring: 'ring-amber-300',
    dot: 'bg-amber-500',
    chip: 'bg-amber-100 text-amber-900 border-amber-200',
    bar: 'bg-amber-500',
    rangeBg: 'bg-amber-100/90',
    rangeBorder: 'border-amber-300',
    hoverCard: 'hover:border-amber-300 hover:bg-amber-50/80',
    activeCard: 'border-amber-400 bg-amber-50 ring-2 ring-amber-200',
  },
  nilai: {
    label: 'Penilaian 5R',
    solid: 'bg-sky-500',
    soft: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-300',
    ring: 'ring-sky-300',
    dot: 'bg-sky-500',
    chip: 'bg-sky-100 text-sky-800 border-sky-200',
    bar: 'bg-sky-500',
    rangeBg: 'bg-sky-100/90',
    rangeBorder: 'border-sky-300',
    hoverCard: 'hover:border-sky-300 hover:bg-sky-50/80',
    activeCard: 'border-sky-400 bg-sky-50 ring-2 ring-sky-200',
  },
  peak: {
    label: 'Hari puncak',
    solid: 'bg-brand-red',
    soft: 'bg-rose-50',
    text: 'text-brand-red',
    border: 'border-rose-300',
    ring: 'ring-rose-300',
    dot: 'bg-brand-red',
    chip: 'bg-rose-100 text-brand-red border-rose-200',
    bar: 'bg-brand-red',
    rangeBg: 'bg-rose-100/90',
    rangeBorder: 'border-rose-300',
    hoverCard: 'hover:border-rose-300 hover:bg-rose-50/80',
    activeCard: 'border-brand-red bg-rose-50 ring-2 ring-rose-200',
  },
  award: {
    label: 'Pengumuman',
    solid: 'bg-emerald-500',
    soft: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-300',
    ring: 'ring-emerald-300',
    dot: 'bg-emerald-500',
    chip: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    bar: 'bg-emerald-500',
    rangeBg: 'bg-emerald-100/90',
    rangeBorder: 'border-emerald-300',
    hoverCard: 'hover:border-emerald-300 hover:bg-emerald-50/80',
    activeCard: 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200',
  },
};

const calendarEvents = [
  {
    id: 'sosialisasi',
    phase: 'kickoff',
    title: 'Sosialisasi aturan',
    start: '2026-08-03',
    end: '2026-08-03',
    note: 'Senin',
  },
  {
    id: 'dekor',
    phase: 'dekor',
    title: 'Lomba dekorasi ruangan',
    start: '2026-08-04',
    end: '2026-08-07',
    note: 'Selasa-Jumat',
  },
  {
    id: 'nilai',
    phase: 'nilai',
    title: 'Penilaian lomba 5R',
    start: '2026-08-10',
    end: '2026-08-27',
    note: 'Hari kerja · sidak berkala',
    weekdaysOnly: true,
  },
  {
    id: 'puncak',
    phase: 'peak',
    title: 'Hari puncak lapangan',
    start: '2026-08-13',
    end: '2026-08-13',
    note: 'Kamis · 12.45-17.00 WIB',
  },
  {
    id: 'hadiah',
    phase: 'award',
    title: 'Pengumuman & hadiah',
    start: '2026-08-28',
    end: '2026-08-28',
    note: 'Jumat · setelah kajian',
  },
];

const WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const MONTH_VIEWS = [{ year: 2026, month: 7 }];

function parseISO(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function eventsOnDay(isoDay: string) {
  const day = parseISO(isoDay);
  const t = day.getTime();
  const dow = day.getDay();
  return calendarEvents.filter((ev) => {
    const a = parseISO(ev.start).getTime();
    const b = parseISO(ev.end).getTime();
    if (t < a || t > b) return false;
    if (ev.weekdaysOnly && (dow === 0 || dow === 6)) return false;
    return true;
  });
}

function isMultiDay(ev: { start: string; end: string }) {
  return ev.start !== ev.end;
}

function rangeRole(ev: { start: string; end: string }, dayKey: string) {
  if (!isMultiDay(ev)) return 'single';
  if (dayKey === ev.start) return 'start';
  if (dayKey === ev.end) return 'end';
  return 'mid';
}

function buildMonthGrid(year: number, monthIndex: number) {
  const total = daysInMonth(year, monthIndex);
  const first = new Date(year, monthIndex, 1);
  const lead = first.getDay();
  const cells = [];

  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let d = 1; d <= total; d += 1) {
    const date = new Date(year, monthIndex, d);
    const key = toKey(date);
    const events = eventsOnDay(key);
    cells.push({
      day: d,
      key,
      events,
      ranges: events.map((ev) => ({
        ev,
        role: rangeRole(ev, key),
      })),
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function formatShort(iso: string) {
  const d = parseISO(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

function formatLong(iso: string) {
  const d = parseISO(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

interface PhaseColor {
  label: string;
  solid: string;
  soft: string;
  text: string;
  border: string;
  ring: string;
  dot: string;
  chip: string;
  bar: string;
  rangeBg: string;
  rangeBorder: string;
  hoverCard: string;
  activeCard: string;
}

function rangeShellClass(role: string, c: PhaseColor) {
  const base = `absolute inset-y-0.5 ${c.rangeBg} border-y ${c.rangeBorder}`;
  if (role === 'single') return `${base} left-0.5 right-0.5 rounded-xl border`;
  if (role === 'start') return `${base} left-0.5 right-0 rounded-l-xl border-l border-r-0`;
  if (role === 'end') return `${base} left-0 right-0.5 rounded-r-xl border-r border-l-0`;
  return `${base} left-0 right-0 border-x-0`;
}

function PeakDayModal({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: { time: string; title: string; note: string }[];
}) {
  const [mounted, setMounted] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Escape close + body scroll lock while open
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          key="peak-modal"
          className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center p-0 sm:p-4"
          style={{ minHeight: '-webkit-fill-available' }}
        >
          {/* Backdrop */}
          <motion.div
            key="peak-backdrop"
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm cursor-pointer"
            aria-label="Tutup modal"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
          />

          {/* Dialog/Bottom Sheet with Mobile Drag-to-Dismiss */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="peak-modal-title"
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 400) {
                onClose();
              }
            }}
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className="relative z-10 flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl will-change-transform sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-brand-deep to-brand-red px-5 pb-4 pt-2.5 text-white sm:px-6 sm:pb-5 sm:pt-5">
              {/* Drag Handle on Mobile */}
              <div
                className="mb-3 flex justify-center sm:hidden cursor-grab active:cursor-grabbing"
                aria-hidden
              >
                <span className="h-1.5 w-12 rounded-full bg-white/40" />
              </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                    Kamis, 13 Agustus 2026
                  </p>
                  <h3
                    id="peak-modal-title"
                    className="font-heading text-xl font-extrabold sm:text-2xl"
                  >
                    Rundown hari puncak
                  </h3>
                  <p className="mt-1 text-xs text-white/80">12.45-17.00 WIB · Halaman TKI</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white hover:bg-white/25 cursor-pointer transition active:scale-95"
                  aria-label="Tutup"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 no-scrollbar">
              <ol className="relative space-y-0">
                <div className="absolute bottom-3 left-[15px] top-3 w-0.5 bg-rose-200" />
                {items.map((item: { time: string; title: string; note: string }, idx: number) => (
                  <li key={item.time} className="peak-step relative flex gap-3 pb-4 last:pb-0">
                    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-red text-xs font-black text-white shadow-sm">
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1 rounded-2xl border border-rose-100 bg-rose-50/50 px-3.5 py-3">
                      <p className="text-xs font-bold text-brand-red">{item.time}</p>
                      <p className="mt-0.5 text-sm font-bold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.note}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="border-t border-slate-100 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:px-6">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer active:scale-98"
              >
                Tutup
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default function RundownPage() {
  const { rundown } = useLoaderData({ from: '/rundown' });
  const [hoverEventId, setHoverEventId] = useState<string | null>(null);
  const [hoverPhase, setHoverPhase] = useState<string | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const [peakModalOpen, setPeakModalOpen] = useState(false);
  const calRef = useRef<HTMLDivElement>(null);

  const monthMeta = MONTH_VIEWS[0];
  const grid = useMemo(() => buildMonthGrid(monthMeta.year, monthMeta.month), []);

  const peakPhase = useMemo(() => rundown.find((p) => p.id === 'phase-peak'), [rundown.find]);
  const peakItems = peakPhase?.items || [];

  const selectedDayEvents = selectedDayKey ? eventsOnDay(selectedDayKey) : [];
  const selectedDayLabel = selectedDayKey ? formatLong(selectedDayKey) : null;

  const activeEvent = hoverEventId ? calendarEvents.find((e) => e.id === hoverEventId) : null;

  const clearHover = () => {
    setHoverEventId(null);
    setHoverPhase(null);
  };

  const setEventHover = (ev: { id: string; phase: string }) => {
    setHoverEventId(ev.id);
    setHoverPhase(ev.phase);
  };

  const closePopover = () => {
    setSelectedDayKey(null);
    setPopoverPos(null);
  };

  const openDay = (
    cell: { key: string; events: Array<{ id: string; phase: string }> },
    event: React.MouseEvent
  ) => {
    if (!cell?.events?.length) {
      closePopover();
      return;
    }

    const btn = event.currentTarget;
    const cal = calRef.current;
    setSelectedDayKey(cell.key);
    setHoverPhase(cell.events[0].phase);
    if (cell.events.length === 1) setEventHover(cell.events[0]);

    if (!btn || !cal) {
      setPopoverPos({ top: 120, left: 12 });
      return;
    }

    const btnRect = btn.getBoundingClientRect();
    const calRect = cal.getBoundingClientRect();
    const popW = 248;
    const left = Math.min(
      Math.max(8, btnRect.left - calRect.left + btnRect.width / 2 - popW / 2),
      Math.max(8, calRect.width - popW - 8)
    );
    let top = btnRect.bottom - calRect.top + 8;
    if (top + 160 > calRect.height) top = btnRect.top - calRect.top - 8 - 140;
    setPopoverPos({ top: Math.max(56, top), left });
  };

  useEffect(() => {
    if (!selectedDayKey || !popoverPos) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePopover();
    };
    const onDown = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node)) closePopover();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [selectedDayKey, popoverPos, closePopover]);

  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toKey(today), [today]);
  const todayEvents = useMemo(() => eventsOnDay(todayKey), [todayKey]);

  const todayFormatted = useMemo(() => {
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dayName = dayNames[today.getDay()];
    const d = today.getDate();
    const m = MONTHS[today.getMonth()];
    const y = today.getFullYear();
    return `${dayName}, ${d} ${m} ${y}`;
  }, [today]);

  const handleSelectToday = () => {
    setSelectedDayKey(todayKey);
    const evs = eventsOnDay(todayKey);
    if (evs.length > 0) {
      setHoverPhase(evs[0].phase);
      setHoverEventId(evs[0].id);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ─── Hero Header & Today Indicator ─── */}
      <section className="surface-card px-4 py-5 sm:px-7 sm:py-7">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="section-kicker">Jadwal Rangkaian Acara</p>
            <h2 className="mt-2 font-heading text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Kalender HUT RI ke-81
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Rangkaian kegiatan HUT RI ke-81 dari 3 hingga 28 Agustus 2026. Klik atau pilih tanggal
              pada kalender untuk melihat rincian acara.
            </p>
          </div>

          {/* Today Date Pill / Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-2xl border border-rose-200/90 bg-gradient-to-br from-rose-500/10 via-rose-50/60 to-white p-3.5 sm:p-4 shadow-xs shrink-0">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-red text-white shadow-xs">
              <i className="fa-solid fa-calendar-day text-base" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-brand-red ring-2 ring-white" />
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-brand-red/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-brand-red">
                  Hari Ini
                </span>
                <p className="font-heading text-xs sm:text-sm font-extrabold text-slate-900">
                  {todayFormatted}
                </p>
              </div>
              <p className="mt-0.5 text-xs text-slate-600 max-w-xs truncate font-medium">
                {todayEvents.length > 0
                  ? `Agenda: ${todayEvents.map((e) => e.title).join(', ')}`
                  : 'Tidak ada agenda lomba khusus hari ini'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSelectToday}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-red px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700 active:scale-95 transition cursor-pointer shrink-0 mt-1 sm:mt-0"
            >
              <i className="fa-solid fa-location-crosshairs text-[11px]" />
              <span>Fokus Hari Ini</span>
            </button>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {Object.entries(phaseColors).map(([key, c]) => (
          <button
            key={key}
            type="button"
            onMouseEnter={() => setHoverPhase(key)}
            onMouseLeave={clearHover}
            onFocus={() => setHoverPhase(key)}
            onBlur={clearHover}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 min-h-[36px] text-xs font-bold transition ${
              hoverPhase === key ? `${c.chip} ring-2 ${c.ring}` : c.chip
            }`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <section ref={calRef} className="surface-card relative flex flex-col overflow-visible">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
            <p className="font-heading text-lg font-extrabold text-slate-900">
              {MONTHS[monthMeta.month]} {monthMeta.year}
            </p>
            <button
              type="button"
              onClick={handleSelectToday}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            >
              <span className="h-2 w-2 rounded-full bg-brand-red animate-pulse" />
              <span>
                Hari ini: {today.getDate()} {MONTHS[today.getMonth()].slice(0, 3)}
              </span>
            </button>
          </div>

          <div className="relative flex flex-1 flex-col px-2 py-3 sm:px-3 sm:py-4">
            <div className="mb-1 grid grid-cols-7 gap-0">
              {WEEKDAYS.map((w) => (
                <div
                  key={w}
                  className={`py-1 text-center text-[10px] font-bold uppercase tracking-wide ${
                    w === 'Min' ? 'text-brand-red' : 'text-slate-500'
                  }`}
                >
                  {w}
                </div>
              ))}
            </div>

            <div className="grid flex-1 grid-cols-7 grid-rows-[repeat(6,minmax(0,1fr))] gap-y-1">
              {grid.map((cell, idx) => {
                if (!cell) {
                  return <div key={`empty-${idx}`} className="min-h-[52px] sm:min-h-[58px]" />;
                }

                const phases = [...new Set(cell.events.map((e) => e.phase))];
                const isSelected = selectedDayKey === cell.key;
                const isToday = cell.key === todayKey;
                const isHot =
                  isSelected ||
                  cell.events.some((e) => e.id === hoverEventId) ||
                  phases.includes(hoverPhase ?? '');

                const primaryRange = cell.ranges.find((r) => r.role !== 'single') || cell.ranges[0];
                const primaryEv = primaryRange?.ev;
                const primaryColor = primaryEv ? phaseColors[primaryEv.phase] : null;
                const role = primaryRange?.role;
                const extraEvents = cell.events.filter((e) => !primaryEv || e.id !== primaryEv.id);

                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={(e) => openDay(cell, e)}
                    onMouseEnter={() => {
                      if (cell.events.length === 1) setEventHover(cell.events[0]);
                      else if (phases[0]) setHoverPhase(phases[0]);
                    }}
                    onMouseLeave={clearHover}
                    className={`relative z-0 min-h-[52px] px-0 py-0.5 text-left sm:min-h-[58px] rounded-xl transition ${
                      isToday ? 'ring-2 ring-brand-red/80 ring-offset-1' : ''
                    }`}
                  >
                    {primaryEv && primaryColor && (
                      <span
                        className={`${rangeShellClass(role, primaryColor)} pointer-events-none transition ${
                          isHot ? 'opacity-100 brightness-95' : 'opacity-90'
                        } ${
                          hoverEventId === primaryEv.id || hoverPhase === primaryEv.phase
                            ? `ring-2 ${primaryColor.ring} ring-inset`
                            : ''
                        }`}
                      />
                    )}

                    {!primaryEv && (
                      <span className="pointer-events-none absolute inset-0.5 rounded-xl bg-slate-50/50" />
                    )}

                    <span className="relative z-10 flex h-full flex-col items-center px-1 pt-1">
                      {isToday && (
                        <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-20 rounded-full bg-brand-red px-1 py-0.2 text-[8px] font-black uppercase tracking-wider text-white shadow-xs whitespace-nowrap">
                          Hari ini
                        </span>
                      )}

                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          isSelected
                            ? 'bg-slate-900 text-white'
                            : isToday
                              ? 'bg-brand-red text-white shadow-xs font-black'
                              : isHot && primaryColor
                                ? primaryColor.text
                                : cell.events.length
                                  ? 'text-slate-800'
                                  : 'text-slate-500'
                        }`}
                      >
                        {cell.day}
                      </span>

                      <div className="mt-auto mb-1.5 flex w-full flex-col items-stretch gap-0.5 px-1">
                        {cell.events.slice(0, 2).map((ev) => {
                          const c = phaseColors[ev.phase];
                          const r = rangeRole(ev, cell.key);
                          const barRound =
                            r === 'single'
                              ? 'rounded-full'
                              : r === 'start'
                                ? 'rounded-l-full rounded-r-none'
                                : r === 'end'
                                  ? 'rounded-r-full rounded-l-none'
                                  : 'rounded-none';
                          return (
                            <span
                              key={ev.id}
                              className={`h-1 ${c.bar} ${barRound} ${
                                hoverEventId === ev.id ? 'opacity-100' : 'opacity-85'
                              }`}
                            />
                          );
                        })}
                      </div>

                      {extraEvents.length > 0 && (
                        <span className="absolute right-1 top-1 flex min-w-[16px] items-center justify-center rounded-full bg-slate-900/75 px-1 text-[10px] font-bold text-white">
                          +{extraEvents.length}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedDayKey && popoverPos && selectedDayEvents.length > 0 && (
              <div
                className="absolute z-40 w-[248px] rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/20"
                style={{ top: popoverPos.top, left: popoverPos.left }}
                role="dialog"
                aria-label={`Acara ${selectedDayLabel}`}
              >
                <div className="mb-1.5 flex items-center justify-between gap-2 px-1.5 pt-1">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      {selectedDayLabel}
                    </p>
                    <p className="text-[11px] text-slate-500">{selectedDayEvents.length} acara</p>
                  </div>
                  <button
                    type="button"
                    onClick={closePopover}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Tutup"
                  >
                    <i className="fa-solid fa-xmark text-xs" />
                  </button>
                </div>
                <ul className="max-h-56 space-y-1 overflow-y-auto">
                  {selectedDayEvents.map((ev) => {
                    const c = phaseColors[ev.phase];
                    const on = hoverEventId === ev.id;
                    return (
                      <li key={ev.id}>
                        <button
                          type="button"
                          onClick={() => setEventHover(ev)}
                          onMouseEnter={() => setEventHover(ev)}
                          className={`flex w-full items-start gap-2 rounded-xl border px-2.5 py-2 text-left transition ${
                            on ? c.activeCard : 'border-slate-100 bg-slate-50 hover:bg-white'
                          }`}
                        >
                          <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${c.dot}`} />
                          <div className="min-w-0">
                            <p className={`text-[10px] font-bold ${c.text}`}>{c.label}</p>
                            <p className="text-xs font-bold text-slate-900">{ev.title}</p>
                            <p className="text-[10px] text-slate-500">
                              {ev.start === ev.end
                                ? formatShort(ev.start)
                                : `${formatShort(ev.start)} - ${formatShort(ev.end)}`}
                              {ev.note ? ` · ${ev.note}` : ''}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          <div className="rounded-b-3xl border-t border-slate-100 bg-slate-50/90 px-4 py-3 sm:px-5">
            {activeEvent ? (
              <div className="flex h-full items-start gap-3">
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white ${
                    phaseColors[activeEvent.phase].solid
                  }`}
                >
                  <i className="fa-solid fa-calendar-day text-xs" />
                </span>
                <div className="min-w-0">
                  <p
                    className={`text-[10px] font-bold uppercase tracking-wide ${
                      phaseColors[activeEvent.phase].text
                    }`}
                  >
                    {phaseColors[activeEvent.phase].label}
                  </p>
                  <p className="truncate text-sm font-bold text-slate-900">{activeEvent.title}</p>
                  <p className="line-clamp-2 text-xs text-slate-500">
                    {activeEvent.start === activeEvent.end
                      ? formatLong(activeEvent.start)
                      : `${formatLong(activeEvent.start)} - ${formatLong(activeEvent.end)}`}
                    {activeEvent.note ? ` · ${activeEvent.note}` : ''}
                  </p>
                </div>
              </div>
            ) : selectedDayEvents.length > 0 ? (
              <div className="flex h-full items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-white">
                  <i className="fa-solid fa-layer-group text-xs" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {selectedDayLabel}
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    {selectedDayEvents.length} acara di tanggal ini
                  </p>
                  <p className="text-xs text-slate-500">
                    Pilih salah satu agenda pada jendela pop-up untuk rincian.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-500">
                  <i className="fa-solid fa-hand-pointer text-xs" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Petunjuk Navigasi
                  </p>
                  <p className="text-sm font-semibold text-slate-700">
                    Pilih Tanggal pada Kalender
                  </p>
                  <p className="text-xs text-slate-500">
                    Pilih tanggal yang berwarna pada kalender untuk melihat rincian agenda acara.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Agenda bertanda — primary detail surface (no separate phase list) */}
        <section className="surface-card px-4 py-4 sm:px-5 sm:py-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Daftar Agenda Kegiatan
          </p>
          <ul className="mt-3 space-y-2.5">
            {calendarEvents.map((ev) => {
              const c = phaseColors[ev.phase];
              const hot = hoverEventId === ev.id || hoverPhase === ev.phase;
              const isPeak = ev.id === 'puncak';
              return (
                <li key={ev.id}>
                  <div
                    onMouseEnter={() => setEventHover(ev)}
                    onMouseLeave={clearHover}
                    className={`rounded-2xl border px-3 py-3 transition ${
                      hot ? c.activeCard : `border-slate-200 bg-white ${c.hoverCard}`
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setEventHover(ev)}
                      onFocus={() => setEventHover(ev)}
                      className="flex w-full items-start gap-3 text-left"
                    >
                      <span className={`mt-1 h-10 w-1.5 shrink-0 rounded-full ${c.bar}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${c.chip}`}
                          >
                            {c.label}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            {ev.start === ev.end
                              ? formatShort(ev.start)
                              : `${formatShort(ev.start)}-${formatShort(ev.end)}`}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-bold text-slate-900">{ev.title}</p>
                        {ev.note && <p className="mt-0.5 text-xs text-slate-500">{ev.note}</p>}
                      </div>
                      <i
                        className={`fa-solid fa-calendar-check mt-1 text-sm ${
                          hot ? c.text : 'text-slate-300'
                        }`}
                      />
                    </button>

                    {isPeak && (
                      <div className="mt-3 border-t border-rose-100/80 pt-3 pl-4">
                        <button
                          type="button"
                          onClick={() => setPeakModalOpen(true)}
                          className="inline-flex items-center gap-2 rounded-xl border border-brand-red/20 bg-brand-soft px-3 py-2 text-xs font-bold text-brand-red transition hover:bg-rose-100"
                        >
                          <i className="fa-solid fa-clock" />
                          Lihat rundown jam acara
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <PeakDayModal
        open={peakModalOpen}
        onClose={() => setPeakModalOpen(false)}
        items={peakItems}
      />
    </div>
  );
}
