import { useEffect, useRef, useState } from 'react'
import { useCountdown } from '../../hooks/useCountdown'
import { gsap, shouldReduceMotion } from '../../lib/gsap'

function Cell({ label, value }) {
  const numRef = useRef(null)

  useEffect(() => {
    if (!numRef.current || shouldReduceMotion()) return

    // Kill any existing tweens on this element before creating a new one
    gsap.killTweensOf(numRef.current)

    gsap.fromTo(
      numRef.current,
      { scale: 1.15, opacity: 0.7 },
      { scale: 1, opacity: 1, duration: 0.25, ease: 'power2.out' },
    )

    const el = numRef.current
    return () => {
      gsap.killTweensOf(el)
    }
  }, [value])

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/70 bg-slate-50/80 px-2 py-3.5 shadow-inner transition hover:border-red-200 hover:bg-red-50/30">
      <div
        ref={numRef}
        className="font-heading text-2xl font-black tracking-tight text-brand-red sm:text-3xl"
      >
        {value}
      </div>
      <div className="mt-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
        {label}
      </div>
    </div>
  )
}

export default function Countdown({
  peakTarget = '2026-08-13T12:45:00',
  eventEndTarget = '2026-08-13T17:00:00',
  awardTarget = '2026-08-28T13:00:00',
  awardEndTarget = '2026-08-28T17:00:00',
}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const peakTime = new Date(peakTarget).getTime()
  const eventEndTime = new Date(eventEndTarget).getTime()
  const awardTime = new Date(awardTarget).getTime()
  const awardEndTime = new Date(awardEndTarget).getTime()

  // Dynamic Phase Handling:
  // 1. PRE_EVENT: Countdown to Peak Event (13 Ags 12.45 WIB)
  // 2. EVENT_IN_PROGRESS: Peak Event in progress (13 Ags 12.45 WIB - 17.00 WIB)
  // 3. COUNTDOWN_AWARD: Automatic countdown to Award Announcement (28 Ags 13.00 WIB)
  // 4. FINISHED: All August events fully completed (After 28 Ags 17.00 WIB)

  let activeTarget = peakTarget
  let phase = 'PRE_EVENT'

  if (now < peakTime) {
    phase = 'PRE_EVENT'
    activeTarget = peakTarget
  } else if (now >= peakTime && now < eventEndTime) {
    phase = 'EVENT_IN_PROGRESS'
  } else if (now >= eventEndTime && now < awardTime) {
    phase = 'COUNTDOWN_AWARD'
    activeTarget = awardTarget
  } else if (now >= awardEndTime) {
    phase = 'FINISHED'
  } else {
    phase = 'COUNTDOWN_AWARD'
    activeTarget = awardEndTarget
  }

  const { days, hours, mins, secs } = useCountdown(activeTarget)

  if (phase === 'EVENT_IN_PROGRESS') {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 text-center shadow-inner">
        <div className="relative mb-2 flex h-4 w-4 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-600" />
        </div>
        <h4 className="font-heading text-xl font-black text-emerald-900 sm:text-2xl">
          Acara Sedang Berlangsung! 🎉
        </h4>
        <p className="mt-1 text-xs font-semibold text-emerald-700">
          Hari Puncak Lomba Kemerdekaan HUT RI ke-81 sedang dilaksanakan. Selamat bertanding!
        </p>
      </div>
    )
  }

  if (phase === 'FINISHED') {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50/80 p-6 text-center shadow-inner">
        <div className="mb-2 text-3xl">🇮🇩 ✨</div>
        <h4 className="font-heading text-xl font-black text-amber-900 sm:text-2xl">
          Rangkaian Acara Telah Selesai
        </h4>
        <p className="mt-1 text-xs font-semibold text-amber-800">
          Seluruh event Agustusan & pengumuman pemenang telah terlaksana. Terima kasih atas partisipasinya!
        </p>
      </div>
    )
  }

  return (
    <div>
      {phase === 'COUNTDOWN_AWARD' && (
        <div className="mb-3 rounded-xl bg-red-50 px-3 py-1.5 text-center text-xs font-extrabold text-brand-red border border-red-200/60 shadow-sm flex items-center justify-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
          </span>
          <span>Hitung Mundur Pengumuman Pemenang</span>
        </div>
      )}
      <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
        <Cell label="Hari" value={days} />
        <Cell label="Jam" value={hours} />
        <Cell label="Menit" value={mins} />
        <Cell label="Detik" value={secs} />
      </div>
    </div>
  )
}
