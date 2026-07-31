import { useEffect, useRef } from 'react'
import { useCountdown } from '../../hooks/useCountdown'
import { gsap, shouldReduceMotion } from '../../lib/gsap'

function Cell({ label, value }) {
  const numRef = useRef(null)

  useEffect(() => {
    if (!numRef.current || shouldReduceMotion()) return

    // ✅ CRITICAL FIX: Kill any existing tweens on this element before creating a new one.
    // Without this, every second a new tween is created without removing the old one,
    // causing thousands of accumulated tweens → GSAP scheduler overload → all animations pause.
    gsap.killTweensOf(numRef.current)

    gsap.fromTo(
      numRef.current,
      { scale: 1.15, opacity: 0.7 },
      { scale: 1, opacity: 1, duration: 0.25, ease: 'power2.out' },
    )

    // Cleanup: kill on unmount / before next run
    return () => {
      gsap.killTweensOf(numRef.current)
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

export default function Countdown({ target }) {
  const { days, hours, mins, secs } = useCountdown(target)
  return (
    <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
      <Cell label="Hari" value={days} />
      <Cell label="Jam" value={hours} />
      <Cell label="Menit" value={mins} />
      <Cell label="Detik" value={secs} />
    </div>
  )
}
