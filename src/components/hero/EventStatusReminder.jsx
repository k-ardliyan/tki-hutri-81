import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAudienceNavigate } from '../../context/AudienceContext'
import { getEventPhase, SIMULATED_DATES } from '../../lib/eventPhase'
import { useCountdown } from '../../hooks/useCountdown'

function DynamicCountdown({ targetDate, label }) {
  const { days, hours, mins, secs, done } = useCountdown(targetDate || '2026-08-13T12:45:00')

  if (!targetDate || done) return null

  return (
    <div className="mt-3.5 rounded-2xl border border-white/15 bg-slate-950/50 p-3 sm:p-3.5 backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-rose-200/90">
        <span className="truncate max-w-[200px] sm:max-w-none">{label}</span>
        <span className="flex items-center gap-1 text-[10px] text-amber-300 shrink-0">
          <i className="fa-solid fa-clock text-amber-400" /> Live Timer
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-center">
        <div className="rounded-xl bg-white/10 py-1.5 backdrop-blur-sm">
          <span className="font-heading text-lg sm:text-2xl font-black text-white">{days}</span>
          <span className="block text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-300">Hari</span>
        </div>
        <div className="rounded-xl bg-white/10 py-1.5 backdrop-blur-sm">
          <span className="font-heading text-lg sm:text-2xl font-black text-white">{hours}</span>
          <span className="block text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-300">Jam</span>
        </div>
        <div className="rounded-xl bg-white/10 py-1.5 backdrop-blur-sm">
          <span className="font-heading text-lg sm:text-2xl font-black text-white">{mins}</span>
          <span className="block text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-300">Menit</span>
        </div>
        <div className="rounded-xl bg-white/10 py-1.5 backdrop-blur-sm">
          <span className="font-heading text-lg sm:text-2xl font-black text-amber-300">{secs}</span>
          <span className="block text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-300">Detik</span>
        </div>
      </div>
    </div>
  )
}

export default function EventStatusReminder({ onPhaseChange }) {
  const navigate = useAudienceNavigate()
  const [selectedSimDate, setSelectedSimDate] = useState(null)
  const [phaseData, setPhaseData] = useState(() => getEventPhase(null))
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const data = getEventPhase(selectedSimDate)
    setPhaseData(data)
    if (onPhaseChange) {
      onPhaseChange(data)
    }
  }, [selectedSimDate, onPhaseChange])

  // Prevent background scroll when modal is active
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isModalOpen])

  return (
    <>
      {/* Sleek Compact Hero Card */}
      <div className="relative overflow-hidden rounded-3xl border border-white/30 bg-gradient-to-br from-slate-950/95 via-[#800a14]/95 to-[#cc1623]/95 p-5 sm:p-6 text-white shadow-2xl backdrop-blur-xl">
        {/* Decorative Ambient Glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-rose-500/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-amber-500/20 blur-2xl" />

        {/* Top Live Badge */}
        <div className="relative z-10 mb-3 flex items-center justify-between gap-2 border-b border-white/15 pb-2.5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] sm:text-[11px] font-extrabold tracking-wider border backdrop-blur-md shadow-sm max-w-[80%] ${phaseData.badgeColor}`}
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            <span className="truncate">{phaseData.badgeLabel}</span>
          </span>
          <span className="text-[10px] font-extrabold text-amber-300 uppercase tracking-widest flex items-center gap-1">
            <i className="fa-solid fa-fire text-amber-400" />
            Active
          </span>
        </div>

        {/* Headline & Subtitle */}
        <div className="relative z-10 space-y-1">
          <h3 className="font-heading text-lg font-black tracking-tight sm:text-2xl text-white leading-tight">
            {phaseData.title}
          </h3>
          <p className="text-xs leading-relaxed text-white/85 sm:text-sm">
            {phaseData.subtitle}
          </p>
        </div>

        {/* Live Milestone Countdown Timer */}
        {phaseData.targetDate && (
          <DynamicCountdown
            targetDate={phaseData.targetDate}
            label={phaseData.targetLabel}
          />
        )}

        {/* Compact Action Bar */}
        <div className="relative z-10 mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="group min-h-[44px] inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-md transition hover:bg-amber-300 active:scale-95 text-center"
          >
            <i className="fa-solid fa-bell text-amber-950 text-xs" />
            <span>Lihat Pengingat ({phaseData.reminders.length})</span>
          </button>

          {phaseData.action && (
            <button
              type="button"
              onClick={() => navigate(phaseData.action.link)}
              className="group min-h-[44px] inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-xs font-extrabold text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95 text-center"
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
              const isSelected = selectedSimDate === item.value
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
              )
            })}
          </div>
        </div>
      </div>

      {/* Global Screen Portal Detail Pengingat Modal */}
      {isModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-fade-in"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-white/20 bg-slate-900 p-6 text-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/15 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/20 text-amber-400">
                    <i className="fa-solid fa-bell text-xl" />
                  </div>
                  <div>
                    <h4 className="font-heading text-lg font-black text-white">
                      Pengingat Penting Acara
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Petunjuk & aturan khusus peserta hari ini
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-slate-300 transition hover:bg-white/20 hover:text-white"
                >
                  <i className="fa-solid fa-xmark text-base" />
                </button>
              </div>

              {/* Modal Active Status Banner */}
              <div className="my-4 rounded-2xl bg-gradient-to-r from-rose-950/80 to-red-900/70 p-4 border border-rose-500/30">
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase border ${phaseData.badgeColor}`}>
                  {phaseData.badgeLabel}
                </span>
                <h5 className="mt-2 font-heading text-base font-extrabold text-white">
                  {phaseData.title}
                </h5>
                <p className="text-xs text-white/80 mt-0.5 leading-relaxed">
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
                      className="flex items-start gap-3 rounded-2xl bg-white/5 p-3.5 border border-white/10"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/30 text-rose-200 border border-rose-400/40 text-sm">
                        <i className={`fa-solid ${rem.icon}`} />
                      </div>
                      <div>
                        <h6 className="text-xs font-extrabold text-white">
                          {rem.title}
                        </h6>
                        <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
                          {rem.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="mt-6 flex flex-wrap gap-2.5 border-t border-white/15 pt-4">
                {phaseData.action && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false)
                      navigate(phaseData.action.link)
                    }}
                    className="flex-1 rounded-xl bg-brand-red px-4 py-3 text-xs font-extrabold text-white shadow-lg transition hover:bg-red-700"
                  >
                    {phaseData.action.label}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-xs font-bold text-slate-300 hover:bg-white/20 hover:text-white"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}

