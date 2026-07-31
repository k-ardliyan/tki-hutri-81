import { useEffect, useRef } from 'react'
import LogoTki from '../brand/LogoTki'
import LogoHutRi81 from '../brand/LogoHutRi81'
import { assets } from '../../assets'
import { gsap, shouldReduceMotion } from '../../lib/gsap'

export default function SiteFooter() {
  const rootRef = useRef(null)

  useEffect(() => {
    if (!rootRef.current || shouldReduceMotion()) return undefined

    const ctx = gsap.context(() => {
      gsap.fromTo(
        rootRef.current.querySelectorAll('.ft-item'),
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out', clearProps: 'all' },
      )
    }, rootRef)

    return () => ctx.revert()
  }, [])

  return (
    <footer
      ref={rootRef}
      className="relative overflow-hidden bg-gradient-to-br from-[#59040a] via-[#850a12] to-[#6e070e] text-white"
    >
      {/* Background Radial Glow */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full bg-rose-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 -bottom-20 h-96 w-96 rounded-full bg-amber-400/15 blur-3xl" />

      {/* Tugu Jam Salatiga Vector Watermark */}
      <div className="pointer-events-none absolute -right-6 -top-12 bottom-0 opacity-25 flex items-start justify-end overflow-hidden">
        {assets.tuguJamSalatigaSvg && (
          <img
            src={assets.tuguJamSalatigaSvg}
            alt=""
            className="h-[185%] w-auto max-w-none object-cover object-top brightness-200 drop-shadow-xl translate-x-6 -translate-y-4"
          />
        )}
      </div>

      <div className="shell relative z-10 pt-8 pb-24 sm:pt-10 lg:pb-10">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Dual White Logos Header */}
          <div className="ft-item flex items-center justify-center gap-4 sm:gap-6">
            <LogoHutRi81 variant="white" className="h-12 w-12 sm:h-14 sm:w-14 drop-shadow-md" animate />
            <div className="h-8 w-px bg-white/25" />
            <LogoTki variant="white" className="h-10 w-10 sm:h-12 sm:w-12 drop-shadow-md" animate />
          </div>

          {/* Slogan & Subhead */}
          <div className="ft-item max-w-xl space-y-1.5">
            <h3 className="font-heading text-xl font-black tracking-tight sm:text-2xl text-white">
              Semangat merdeka, kerja rapi, juara bersama.
            </h3>
            <p className="text-xs font-semibold text-white/80">
              Dirgahayu Republik Indonesia ke-81
            </p>
          </div>

          {/* Clean Copyright Footer Divider */}
          <div className="ft-item w-full border-t border-white/15 pt-5 mt-2">
            <div className="flex items-center justify-center text-xs text-white/60">
              <p>© 2026 PT Teknologi Kartu Indonesia</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
