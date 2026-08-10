import { useEffect, useRef } from 'react'
import { assets } from '../../assets'
import { gsap, shouldReduceMotion } from '../../lib/gsap'

export default function SalatigaRibbonSvg({ className = 'h-full w-full' }) {
  const containerRef = useRef(null)
  const tuguRef = useRef(null)
  const clockGlowRef = useRef(null)
  const ribbonRedRef = useRef(null)
  const ribbonWhiteRef = useRef(null)
  const particlesRef = useRef<SVGGElement>(null)

  useEffect(() => {
    if (!containerRef.current || shouldReduceMotion()) return undefined

    const ctx = gsap.context(() => {
      // 1. Zoomed Tugu Jam Vector Gentle Float
      if (tuguRef.current) {
        gsap.to(tuguRef.current, {
          y: -8,
          duration: 3.2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        })
      }

      // 2. Glowing Clock Pulse Overlay
      if (clockGlowRef.current) {
        gsap.to(clockGlowRef.current, {
          scale: 1.25,
          opacity: 0.85,
          duration: 1.8,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          transformOrigin: 'center center',
        })
      }

      // 3. Waving Red and White Silk Ribbons
      if (ribbonRedRef.current && ribbonWhiteRef.current) {
        gsap.to(ribbonRedRef.current, {
          y: -12,
          skewX: 2,
          duration: 3.4,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        })
        gsap.to(ribbonWhiteRef.current, {
          y: 10,
          skewX: -2,
          duration: 3.0,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: 0.2,
        })
      }

      // 4. Golden sparkle particles float
      if (particlesRef.current) {
        const dots = particlesRef.current.querySelectorAll('.particle-dot')
        dots.forEach((dot: Element, i: number) => {
          gsap.to(dot, {
            y: `-=${14 + (i % 3) * 8}`,
            x: `+=${(i % 2 === 0 ? 1 : -1) * (8 + (i % 4) * 4)}`,
            opacity: 0.2 + ((i * 3) % 7) * 0.1,
            duration: 2.5 + (i % 3) * 0.7,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            delay: i * 0.15,
          })
        })
      }
    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={containerRef} className={`pointer-events-none ${className}`}>
      <svg
        viewBox="0 0 800 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
      >
        <defs>
          <linearGradient id="salatigaRibbonRed" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF4D4D" opacity="0.65" />
            <stop offset="50%" stopColor="#E11D48" opacity="0.55" />
            <stop offset="100%" stopColor="#9F1239" opacity="0.4" />
          </linearGradient>
          <radialGradient id="clockGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FCD34D" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* LAYER 1 (BEHIND): Waving Red-and-White Silk Ribbons */}
        <g id="ribbons-group">
          <path
            ref={ribbonRedRef}
            d="M -50 90 Q 220 170 480 70 T 850 150 L 850 210 Q 550 130 200 230 T -50 150 Z"
            fill="url(#salatigaRibbonRed)"
          />
          <path
            ref={ribbonWhiteRef}
            d="M -50 150 Q 220 230 580 130 T 850 210 L 850 255 Q 520 175 160 275 T -50 195 Z"
            fill="#FFFFFF"
            opacity="0.35"
          />
        </g>

        {/* LAYER 2 (FOREGROUND): Responsive Tugu Jam Group */}
        <g id="tugu-jam-salatiga-vector" ref={tuguRef}>
          {/* Mobile & Tablet Layout (< 1024px) — Zoomed in, cropped bottom, matching hero aesthetic */}
          <g className="lg:hidden">
            {assets.tuguJamSalatigaSvg && (
              <image
                href={assets.tuguJamSalatigaSvg}
                xlinkHref={assets.tuguJamSalatigaSvg}
                x="370"
                y="-75"
                width="560"
                height="940"
                preserveAspectRatio="xMaxYMin slice"
                opacity="0.82"
                className="drop-shadow-2xl"
              />
            )}
            <circle cx="635" cy="150" r="60" fill="url(#clockGlow)" />
          </g>

          {/* Desktop Layout (>= 1024px) — Ultra Massive & Shifted Further Right */}
          <g className="hidden lg:inline">
            {assets.tuguJamSalatigaSvg && (
              <image
                href={assets.tuguJamSalatigaSvg}
                xlinkHref={assets.tuguJamSalatigaSvg}
                x="455"
                y="-90"
                width="700"
                height="1220"
                preserveAspectRatio="xMidYMin slice"
                opacity="0.85"
                className="drop-shadow-2xl"
              />
            )}
            <circle ref={clockGlowRef} cx="805" cy="225" r="75" fill="url(#clockGlow)" />
          </g>
        </g>

        {/* LAYER 3: Floating Confetti / Sparkles */}
        <g ref={particlesRef} id="particles-group">
          <circle className="particle-dot" cx="160" cy="110" r="3" fill="#FCD34D" />
          <circle className="particle-dot" cx="290" cy="75" r="2.5" fill="#FFFFFF" />
          <circle className="particle-dot" cx="430" cy="150" r="4" fill="#F59E0B" />
          <circle className="particle-dot" cx="550" cy="85" r="3" fill="#FCD34D" />
          <circle className="particle-dot" cx="690" cy="130" r="2" fill="#FFFFFF" />
          <circle className="particle-dot" cx="370" cy="210" r="3.5" fill="#F59E0B" />
        </g>
      </svg>
    </div>
  )
}
