import { useEffect, useRef } from 'react'
import { gsap, shouldReduceMotion } from '../../lib/gsap'

export default function MonasRibbonSvg({ className = 'h-full w-full' }) {
  const containerRef = useRef(null)
  const peakRef = useRef(null)
  const ribbonRedRef = useRef(null)
  const ribbonWhiteRef = useRef(null)
  const particlesRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || shouldReduceMotion()) return undefined

    const ctx = gsap.context(() => {
      // Monas Golden Peak Pulsing Glow
      if (peakRef.current) {
        gsap.to(peakRef.current, {
          scale: 1.15,
          opacity: 0.95,
          duration: 1.8,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          transformOrigin: 'center center',
        })
      }

      // Ribbon dynamic wave movement
      if (ribbonRedRef.current && ribbonWhiteRef.current) {
        gsap.to(ribbonRedRef.current, {
          y: -12,
          skewX: 2,
          duration: 3.2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        })
        gsap.to(ribbonWhiteRef.current, {
          y: 10,
          skewX: -2,
          duration: 2.8,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: 0.3,
        })
      }

      // Golden sparkle particles float
      if (particlesRef.current) {
        const dots = particlesRef.current.querySelectorAll('.particle-dot')
        dots.forEach((dot, i) => {
          gsap.to(dot, {
            y: `-=${15 + (i % 3) * 10}`,
            x: `+=${(i % 2 === 0 ? 1 : -1) * (10 + (i % 4) * 5)}`,
            opacity: 0.2 + ((i * 3) % 7) * 0.1,
            duration: 2.5 + (i % 3) * 0.8,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            delay: i * 0.2,
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
          <linearGradient id="monasGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF4B8" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
          <linearGradient id="ribbonRedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF4D4D" />
            <stop offset="50%" stopColor="#E11D48" />
            <stop offset="100%" stopColor="#9F1239" />
          </linearGradient>
          <radialGradient id="peakGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FCD34D" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Monas Monument Silhouette */}
        <g id="monas-group" opacity="0.35">
          {/* Base platform */}
          <path d="M 520 540 L 760 540 L 740 500 L 540 500 Z" fill="#ffffff" opacity="0.2" />
          <path d="M 560 500 L 720 500 L 700 440 L 580 440 Z" fill="#ffffff" opacity="0.25" />

          {/* Main Obelisk Shaft */}
          <path d="M 622 440 L 658 440 L 652 220 L 628 220 Z" fill="#ffffff" opacity="0.3" />
          <path d="M 640 440 L 658 440 L 652 220 L 640 220 Z" fill="#000000" opacity="0.15" />

          {/* Flame Platform */}
          <path d="M 618 220 L 662 220 L 654 204 L 626 204 Z" fill="#ffffff" opacity="0.4" />

          {/* Monas Golden Flame Spire */}
          <circle ref={peakRef} cx="640" cy="180" r="28" fill="url(#peakGlow)" />
          <path
            d="M 640 160 C 648 172 654 182 650 196 C 646 204 634 204 630 196 C 626 182 632 172 640 160 Z"
            fill="url(#monasGold)"
          />
        </g>

        {/* Waving Indonesian Red-and-White Silk Ribbon */}
        <g id="ribbons-group">
          {/* Red Ribbon Layer */}
          <path
            ref={ribbonRedRef}
            d="M -50 80 Q 200 160 450 60 T 850 140 L 850 210 Q 550 120 200 230 T -50 150 Z"
            fill="url(#ribbonRedGrad)"
            opacity="0.75"
          />
          {/* White Ribbon Layer */}
          <path
            ref={ribbonWhiteRef}
            d="M -50 150 Q 200 230 550 120 T 850 210 L 850 260 Q 500 170 150 280 T -50 200 Z"
            fill="#FFFFFF"
            opacity="0.85"
          />
        </g>

        {/* Floating Confetti / Golden Sparkles */}
        <g ref={particlesRef} id="particles-group">
          <circle className="particle-dot" cx="150" cy="120" r="3" fill="#FCD34D" />
          <circle className="particle-dot" cx="280" cy="80" r="2.5" fill="#FFFFFF" />
          <circle className="particle-dot" cx="420" cy="160" r="4" fill="#F59E0B" />
          <circle className="particle-dot" cx="540" cy="90" r="3" fill="#FCD34D" />
          <circle className="particle-dot" cx="680" cy="140" r="2" fill="#FFFFFF" />
          <circle className="particle-dot" cx="360" cy="220" r="3.5" fill="#F59E0B" />
        </g>
      </svg>
    </div>
  )
}
