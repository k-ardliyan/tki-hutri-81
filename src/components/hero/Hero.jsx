import { useEffect, useRef } from 'react'
import Countdown from './Countdown'
import { eventMeta } from '../../data/content'
import LogoHutRi81 from '../brand/LogoHutRi81'
import LogoTki from '../brand/LogoTki'
import SalatigaRibbonSvg from '../brand/SalatigaRibbonSvg'
import { gsap, shouldReduceMotion } from '../../lib/gsap'

export default function Hero({ onExplore }) {
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

      <div className="shell relative z-10 grid gap-8 pt-10 pb-14 sm:pt-14 sm:pb-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        {/* Left Column Content */}
        <div className="space-y-5">
          {/* Animated Dual White Logos Header — Prominent HUT RI 81 + Sleek TKI Logo */}
          <div className="hero-animate flex items-center gap-3.5 sm:gap-4">
            <LogoHutRi81 variant="white" animate className="h-14 sm:h-16 w-auto drop-shadow-md" />
            <div className="h-9 sm:h-11 w-px bg-white/35 shrink-0" />
            <LogoTki variant="white" animate className="h-5 sm:h-6 w-auto drop-shadow-md" />
          </div>

          <div className="hero-animate space-y-2.5">
            <h1 className="font-heading text-3xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.25rem]">
              Peringatan{' '}
              <span className="inline-block rounded-xl bg-white px-3 py-0.5 text-brand-red shadow-lg">
                HUT RI ke-81
              </span>
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-white/90 sm:text-base">
              Rayakan kemerdekaan dengan kerja sama, sportivitas, dan budaya 5R di tempat kerja.
            </p>
          </div>

          {/* 3 Translucent Info Badges */}
          <div className="hero-animate flex flex-wrap gap-2.5 text-xs font-bold text-white">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3.5 py-2 backdrop-blur-md ring-1 ring-white/20">
              <span>🏆</span> Puncak Kamis, 13 Agustus 2026
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3.5 py-2 backdrop-blur-md ring-1 ring-white/20">
              <span>🕒</span> 12.45 WIB
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3.5 py-2 backdrop-blur-md ring-1 ring-white/20">
              <span>📣</span> Pengumuman Jumat, 28 Agustus 2026
            </span>
          </div>

          {/* Action Buttons — High Contrast Primary CTA */}
          <div className="hero-animate flex flex-wrap gap-3.5 pt-1">
            <button
              type="button"
              onClick={() => onExplore?.('lomba')}
              className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-extrabold text-[#990a15] shadow-xl shadow-black/25 transition hover:-translate-y-0.5 hover:bg-slate-100"
            >
              <i className="fa-solid fa-book-open text-xs text-[#990a15]" />
              <span>Lihat panduan lomba</span>
              <i className="fa-solid fa-arrow-right text-xs transition-transform group-hover:translate-x-1 text-[#990a15]" />
            </button>
            <button
              type="button"
              onClick={() => onExplore?.('tim')}
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/20 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/15"
            >
              <i className="fa-solid fa-users text-xs" />
              <span>Daftar tim</span>
              <i className="fa-solid fa-arrow-right text-xs" />
            </button>
          </div>
        </div>

        {/* Right Column: Bottom-Aligned Countdown Card */}
        <div className="hero-animate [perspective:1000px] lg:self-end">
          <div
            ref={cardRef}
            className="rounded-3xl border border-white/90 bg-white p-6 shadow-2xl shadow-slate-950/25 text-slate-800 transition-transform duration-200"
          >
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-brand-red">
                Hitung Mundur Acara Puncak
              </p>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
              </span>
            </div>

            <Countdown target={eventMeta.peakTarget} />

            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <i className="fa-solid fa-location-dot text-brand-red" />
                <span className="font-semibold text-slate-700">Halaman TKI</span>
              </div>
              <div className="font-bold text-slate-900">13 Ags · 12.45 WIB</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
