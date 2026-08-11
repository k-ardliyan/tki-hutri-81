import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAudienceNavigate } from '../../context/AudienceContext';
import { useCountdown } from '../../hooks/useCountdown';
import { getEventPhase, SIMULATED_DATES } from '../../lib/eventPhase';

function DynamicCountdown({ targetDate, label }: { targetDate: string | null; label?: string }) {
  const { days, hours, mins, secs, done } = useCountdown(targetDate || '2026-08-13T12:45:00');

  if (!targetDate || done) return null;

  return (
    <div className="mt-3 rounded-2xl border border-white/20 bg-black/25 p-2.5 sm:p-3.5 backdrop-blur-md">
      <div className="mb-1.5 flex items-center justify-between text-[9px] sm:text-[11px] font-extrabold uppercase tracking-wider text-rose-100 gap-1">
        <span className="truncate">{label}</span>
        <span className="flex items-center gap-1 text-[9px] sm:text-[10px] text-amber-300 shrink-0 font-bold">
          <i className="fa-solid fa-clock text-amber-400" /> Live Timer
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1 sm:gap-2 text-center">
        <div className="rounded-xl bg-white/15 border border-white/25 py-1 sm:py-1.5 px-0.5 backdrop-blur-md shadow-inner">
          <span className="font-heading text-base sm:text-2xl font-black text-white drop-shadow-sm">
            {days}
          </span>
          <span className="block text-[7px] sm:text-[9px] font-bold uppercase tracking-wider text-white/80">
            Hari
          </span>
        </div>
        <div className="rounded-xl bg-white/15 border border-white/25 py-1 sm:py-1.5 px-0.5 backdrop-blur-md shadow-inner">
          <span className="font-heading text-base sm:text-2xl font-black text-white drop-shadow-sm">
            {hours}
          </span>
          <span className="block text-[7px] sm:text-[9px] font-bold uppercase tracking-wider text-white/80">
            Jam
          </span>
        </div>
        <div className="rounded-xl bg-white/15 border border-white/25 py-1 sm:py-1.5 px-0.5 backdrop-blur-md shadow-inner">
          <span className="font-heading text-base sm:text-2xl font-black text-white drop-shadow-sm">
            {mins}
          </span>
          <span className="block text-[7px] sm:text-[9px] font-bold uppercase tracking-wider text-white/80">
            Menit
          </span>
        </div>
        <div className="rounded-xl bg-white/15 border border-white/25 py-1 sm:py-1.5 px-0.5 backdrop-blur-md shadow-inner">
          <span className="font-heading text-base sm:text-2xl font-black text-amber-300 drop-shadow-sm">
            {secs}
          </span>
          <span className="block text-[7px] sm:text-[9px] font-bold uppercase tracking-wider text-white/80">
            Detik
          </span>
        </div>
      </div>
    </div>
  );
}

export default function EventStatusReminder({
  onPhaseChange,
}: {
  onPhaseChange?: (data: ReturnType<typeof getEventPhase>) => void;
}) {
  const navigate = useAudienceNavigate();
  const [selectedSimDate, setSelectedSimDate] = useState<string | null>(null);
  const [phaseData, setPhaseData] = useState(() => getEventPhase(null));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleCloseModal = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setIsClosing(false);
    }, 280);
  }, [isClosing]);

  useEffect(() => {
    // getEventPhase JS accepts string | null but TS infers only null from default param
    const data = getEventPhase(selectedSimDate as Parameters<typeof getEventPhase>[0]);
    setPhaseData(data);
    if (onPhaseChange) {
      onPhaseChange(data);
    }
  }, [selectedSimDate, onPhaseChange]);

  // Prevent background scroll and add Escape key listener for accessibility
  useEffect(() => {
    if (!isModalOpen) return undefined;

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen, handleCloseModal]);

  return (
    <>
      {/* Sleek Authentic iOS Frosted Glass Card */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/35 bg-white/20 p-4 sm:p-6 text-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] backdrop-blur-2xl w-full max-w-full">
        {/* Subtle Ambient Radial Glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-rose-500/15 blur-3xl" />

        {/* Top Live Badge */}
        <div className="relative z-10 mb-2.5 flex flex-wrap items-center justify-between gap-1.5 border-b border-white/20 pb-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] sm:text-[11px] font-extrabold tracking-wider border backdrop-blur-md shadow-sm min-w-0 max-w-full ${phaseData.badgeColor}`}
          >
            <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-white" />
            </span>
            <span className="truncate leading-tight">{phaseData.badgeLabel}</span>
          </span>
          <span className="text-[9px] sm:text-[10px] font-black text-amber-300 uppercase tracking-widest flex items-center gap-1 shrink-0">
            <i className="fa-solid fa-fire text-amber-400 text-xs" />
            Active
          </span>
        </div>

        {/* Headline & Subtitle */}
        <div className="relative z-10 space-y-0.5 sm:space-y-1">
          <h3 className="font-heading text-base sm:text-2xl font-black tracking-tight text-white leading-tight drop-shadow-sm">
            {phaseData.title}
          </h3>
          <p className="text-[11px] leading-relaxed text-white/90 sm:text-sm font-medium">
            {phaseData.subtitle}
          </p>
        </div>

        {/* Live Milestone Countdown Timer */}
        {phaseData.targetDate && (
          <DynamicCountdown targetDate={phaseData.targetDate} label={phaseData.targetLabel} />
        )}

        {/* Compact Action Bar */}
        <div className="relative z-10 mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            aria-expanded={isModalOpen}
            className="group min-h-[40px] sm:min-h-[44px] inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-red px-3 py-2 sm:px-4 sm:py-2.5 text-[11px] sm:text-xs font-extrabold text-white shadow-lg shadow-red-900/30 transition hover:bg-red-700 active:scale-95 text-center"
          >
            <i className="fa-solid fa-bell text-white text-xs" />
            <span>Lihat Pengingat ({phaseData.reminders.length})</span>
          </button>

          {phaseData.action && (
            <button
              type="button"
              onClick={() => navigate(phaseData.action.link)}
              className="group min-h-[40px] sm:min-h-[44px] inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/15 px-3 py-2 sm:px-4 sm:py-2.5 text-[11px] sm:text-xs font-extrabold text-white backdrop-blur-md transition hover:bg-white/25 active:scale-95 text-center"
            >
              <span>{phaseData.action.label}</span>
              <i className="fa-solid fa-arrow-right text-[10px] transition-transform group-hover:translate-x-1" />
            </button>
          )}
        </div>

        {/* Compact Demo Date Simulator Bar (Hidden by default, code preserved for testing) */}
        {/* Pass showSim = true or edit flag below to unhide */}
        <div className="hidden relative z-10 mt-3.5 border-t border-white/15 pt-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1">
              <i className="fa-solid fa-flask text-amber-400 text-xs" />
              Simulasi Tanggal:
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {SIMULATED_DATES.map((item, index) => {
              const isSelected = selectedSimDate === item.value;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedSimDate(item.value)}
                  className={`min-h-[28px] cursor-pointer rounded-lg px-2 py-0.5 text-[9px] sm:text-[10px] font-bold transition border ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-extrabold shadow-sm'
                      : 'bg-white/10 text-white/90 border-white/15 hover:bg-white/20'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Global Screen Portal Detail Pengingat Bottom Sheet (Matching iOS Glassmorphism & Slide Up / Down Animation) */}
      {isModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className={`fixed inset-0 z-[99998] bg-slate-950/80 backdrop-blur-md ${
                isClosing ? 'animate-fade-out' : 'animate-fade-in'
              }`}
              onClick={handleCloseModal}
            />

            {/* Bottom Sheet Modal Container */}
            <div
              className="fixed inset-x-0 bottom-0 z-[99999] flex flex-col justify-end p-0 sm:p-4 pointer-events-none"
              style={{ minHeight: '-webkit-fill-available' }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-reminder-title"
              aria-describedby="modal-reminder-subtitle"
            >
              <div
                className={`pointer-events-auto relative my-0 sm:my-auto mx-auto w-full max-w-lg max-h-[85dvh] flex flex-col rounded-t-3xl sm:rounded-3xl border-t sm:border border-white/40 bg-white/20 p-4 sm:p-6 text-white shadow-[0_-20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] overflow-hidden ${
                  isClosing ? 'animate-sheet-slide-down' : 'animate-sheet-slide-up'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Decorative Ambient Radial Glow */}
                <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-amber-400/15 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-rose-500/15 blur-3xl" />

                {/* Fixed Drag Handle Bar for Mobile UX */}
                <div className="mx-auto mb-2.5 h-1.5 w-12 shrink-0 rounded-full bg-white/40 sm:hidden" />

                {/* Fixed Modal Header */}
                <div className="relative z-10 flex shrink-0 items-center justify-between border-b border-white/15 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300 shrink-0">
                      <i className="fa-solid fa-bell text-xl" />
                    </div>
                    <div>
                      <h4
                        id="modal-reminder-title"
                        className="font-heading text-lg sm:text-xl font-black text-white leading-tight drop-shadow-sm"
                      >
                        Pengingat Penting Acara
                      </h4>
                      <p id="modal-reminder-subtitle" className="text-[11px] text-white/70">
                        Petunjuk & aturan khusus peserta hari ini
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    aria-label="Tutup pengingat modal"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 shrink-0 cursor-pointer"
                  >
                    <i className="fa-solid fa-xmark text-base" />
                  </button>
                </div>

                {/* Scrollable Inner Content (Only Checklist & Banner Scroll) */}
                <div className="relative z-10 overflow-y-auto flex-1 my-3 pr-1 space-y-3 no-scrollbar max-h-[50dvh]">
                  {/* Modal Active Status Banner */}
                  <div className="rounded-2xl bg-white/10 p-3.5 sm:p-4 border border-white/15 backdrop-blur-md">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase border ${phaseData.badgeColor}`}
                    >
                      {phaseData.badgeLabel}
                    </span>
                    <h5 className="mt-2 font-heading text-base sm:text-lg font-extrabold text-white">
                      {phaseData.title}
                    </h5>
                    <p className="text-xs text-white/85 mt-0.5 leading-relaxed">
                      {phaseData.subtitle}
                    </p>
                  </div>

                  {/* Modal Reminders Checklist */}
                  <div className="space-y-2.5">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                      <i className="fa-solid fa-list-check text-amber-400 text-xs" />
                      <span>Catatan Wajib Peserta Hari Ini:</span>
                    </p>
                    <div className="grid gap-2.5">
                      {phaseData.reminders.map((rem, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 rounded-2xl bg-white/10 p-3.5 border border-white/15 backdrop-blur-md"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300 border border-amber-300/30 text-sm">
                            <i className={`fa-solid ${rem.icon}`} />
                          </div>
                          <div>
                            <h6 className="text-xs font-extrabold text-white">{rem.title}</h6>
                            <p className="text-xs text-white/80 leading-relaxed mt-0.5">
                              {rem.text}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Fixed Footer Actions */}
                <div className="relative z-10 flex shrink-0 flex-wrap gap-2.5 border-t border-white/15 pt-3 mt-auto">
                  {phaseData.action && (
                    <button
                      type="button"
                      onClick={() => {
                        handleCloseModal();
                        setTimeout(() => navigate(phaseData.action.link), 280);
                      }}
                      className="flex-1 min-h-[44px] rounded-xl bg-brand-red px-4 py-3 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-red-900/30 transition hover:bg-red-700 active:scale-95 text-center"
                    >
                      {phaseData.action.label}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="min-h-[44px] rounded-xl border border-white/30 bg-white/15 px-5 py-3 text-xs sm:text-sm font-bold text-white hover:bg-white/25 transition active:scale-95 text-center"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
