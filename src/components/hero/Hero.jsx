import { useEffect, useRef } from 'react'
import { useAudienceNavigate } from '../../context/AudienceContext'
import EventStatusReminder from './EventStatusReminder'
import LogoHutRi81 from '../brand/LogoHutRi81'
import LogoTki from '../brand/LogoTki'
import LogoFtp from '../brand/LogoFtp'
import SalatigaRibbonSvg from '../brand/SalatigaRibbonSvg'
import { gsap, shouldReduceMotion } from '../../lib/gsap'

export default function Hero() {
  const navigate = useAudienceNavigate()
  const rootRef = useRef(null)
  const cardRef = useRef(null)

  useEffect(() => {
    if (!rootRef.current || shouldReduceMotion()) return undefined

    const ctx = gsap.context(() => {
      // Stagger entrance reveal — fromTo with clearProps:'all' prevents stuck invisible elements
      gsap.fromTo(
        '.hero-animate',
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.65, stagger: 0.08, ease: 'power3.out', clearProps: 'all' },
      )

      // Mouse Parallax 3D Tilt Effect on Countdown Card
      if (cardRef.current) {
        const card = cardRef.current
        const xTo = gsap.quickTo(card, 'rotationY', { duration: 0.4, ease: 'power2.out' })
        const yTo = gsap.quickTo(card, 'rotationX', { duration: 0.4, ease: 'power2.out' })

        const handleMouseMove = (e) => {
          const rect = card.getBoundingClientRect()
          const x = e.clientX - rect.left - rect.width / 2
          const y = e.clientY - rect.top - rect.height / 2
          xTo(x * 0.03)
          yTo(-y * 0.03)
        }

        const handleMouseLeave = () => {
          xTo(0)
          yTo(0)
        }

        card.addEventListener('mousemove', handleMouseMove)
        card.addEventListener('mouseleave', handleMouseLeave)

        return () => {
          card.removeEventListener('mousemove', handleMouseMove)
          card.removeEventListener('mouseleave', handleMouseLeave)
        }
      }
    }, rootRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={rootRef}
      className="relative overflow-hidden bg-gradient-to-br from-[#73050c] via-[#a00e18] to-[#cc1623] text-white"
    >
      {/* Decorative Vector Ribbon & Salatiga Tugu Jam SVG Accent */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-80">
        <SalatigaRibbonSvg />
      </div>

      {/* Subtle Ambient Glow */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-10 h-80 w-80 rounded-full bg-rose-500/10 blur-3xl" />

      <div className="shell relative z-10 grid gap-5 sm:gap-8 pt-6 pb-10 sm:pt-14 sm:pb-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center w-full max-w-6xl overflow-hidden px-3.5 sm:px-6">
        {/* Left Column Content */}
        <div className="space-y-3.5 sm:space-y-5 w-full max-w-full overflow-hidden">
          {/* Animated Dual White Logos Header — Prominent HUT RI 81 + Sleek TKI x FTP Logos */}
          <div className="hero-animate flex flex-wrap items-center gap-2 sm:gap-4 max-w-full">
            <LogoHutRi81 variant="white" animate className="h-9 sm:h-16 w-auto drop-shadow-md shrink-0" />
            <div className="h-6 sm:h-11 w-px bg-white/35 shrink-0" />
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              <LogoTki variant="white" animate className="h-3.5 sm:h-6 w-auto drop-shadow-md" />
              <svg viewBox="0 0 16 16" className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 shrink-0 text-white/45 stroke-current" fill="none" strokeWidth="1.2" strokeLinecap="round">
                <line x1="4" y1="4" x2="12" y2="12" />
                <line x1="12" y1="4" x2="4" y2="12" />
              </svg>
              <LogoFtp variant="white" animate className="h-3.5 sm:h-6 w-auto drop-shadow-md" />
            </div>
          </div>

          <div className="hero-animate space-y-1.5 sm:space-y-2">
            <h1 className="font-heading text-xl sm:text-5xl lg:text-[3.25rem] font-black leading-[1.15] tracking-tight">
              Peringatan{' '}
              <span className="inline-block align-baseline rounded-xl bg-white px-2 sm:px-3 py-0.5 text-brand-red shadow-lg my-0.5">
                HUT RI ke-81
              </span>
            </h1>
            <p className="max-w-xl text-[11px] leading-relaxed text-white/90 sm:text-base">
              Lomba, dekor, dan kebersamaan. Semuanya demi satu semangat yang sama.
            </p>
          </div>

          {/* Action Buttons — High Contrast Primary CTA */}
          <div className="hero-animate flex flex-col sm:flex-row gap-2 sm:gap-3.5 pt-1 w-full max-w-full">
            <button
              type="button"
              onClick={() => navigate('/lomba')}
              className="group inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 sm:px-6 sm:py-3.5 text-xs sm:text-sm font-extrabold text-[#990a15] shadow-xl shadow-black/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 active:scale-95 text-center w-full sm:w-auto min-h-[40px] sm:min-h-[44px]"
            >
              <i className="fa-solid fa-book-open text-xs text-[#990a15]" />
              <span>Lihat panduan lomba</span>
              <i className="fa-solid fa-arrow-right text-xs transition-transform group-hover:translate-x-1 text-[#990a15]" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/tim')}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-white/30 bg-black/20 px-4 py-2.5 sm:px-6 sm:py-3.5 text-xs sm:text-sm font-bold text-white backdrop-blur-md transition-all duration-200 hover:bg-white/15 active:scale-95 text-center w-full sm:w-auto min-h-[40px] sm:min-h-[44px]"
            >
              <i className="fa-solid fa-users text-xs" />
              <span>Daftar tim</span>
              <i className="fa-solid fa-arrow-right text-xs" />
            </button>
          </div>
        </div>

        {/* Right Column: Vertically Centered Event Status & Reminder Card */}
        <div className="hero-animate w-full max-w-full overflow-hidden [perspective:1000px] lg:self-center">
          <div ref={cardRef} className="transition-transform duration-200 w-full max-w-full">
            <EventStatusReminder />
          </div>
        </div>
      </div>
    </section>
  )
}

