import { useEffect, useRef } from "react";
import LogoTki from "../brand/LogoTki";
import LogoFtp from "../brand/LogoFtp";
import LogoHutRi81 from "../brand/LogoHutRi81";
import { assets } from "../../assets";
import { gsap, shouldReduceMotion } from "../../lib/gsap";

const PARTICLES = [
  { top: '15%', left: '7%', size: 'w-2 h-2', bg: 'bg-amber-300/45', blur: 'blur-[0.5px]' },
  { top: '30%', left: '20%', size: 'w-1.5 h-1.5', bg: 'bg-rose-300/60', blur: '' },
  { top: '68%', left: '12%', size: 'w-2.5 h-2.5', bg: 'bg-white/40', blur: 'blur-[1px]' },
  { top: '82%', left: '26%', size: 'w-1 h-1', bg: 'bg-amber-400/70', blur: '' },
  { top: '20%', left: '46%', size: 'w-2 h-2', bg: 'bg-amber-200/50', blur: 'blur-[0.5px]' },
  { top: '72%', left: '58%', size: 'w-1.5 h-1.5', bg: 'bg-white/50', blur: '' },
  { top: '28%', left: '74%', size: 'w-2 h-2', bg: 'bg-rose-200/50', blur: 'blur-[0.5px]' },
  { top: '16%', left: '86%', size: 'w-2.5 h-2.5', bg: 'bg-amber-300/45', blur: 'blur-[1px]' },
  { top: '78%', left: '82%', size: 'w-1.5 h-1.5', bg: 'bg-amber-400/55', blur: '' },
  { top: '48%', left: '92%', size: 'w-2 h-2', bg: 'bg-white/45', blur: '' },
];

export default function SiteFooter() {
  const rootRef = useRef(null);

  useEffect(() => {
    if (!rootRef.current || shouldReduceMotion()) return undefined;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        rootRef.current.querySelectorAll(".ft-item"),
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.08,
          ease: "power2.out",
          clearProps: "all",
        },
      );

      // Floating ambient particles animation
      const particles = rootRef.current.querySelectorAll(".ft-particle");
      particles.forEach((p, i) => {
        gsap.to(p, {
          y: `-=${12 + (i % 4) * 6}`,
          x: `+=${(i % 2 === 0 ? 1 : -1) * (8 + (i % 3) * 5)}`,
          opacity: 0.3 + (i % 3) * 0.25,
          scale: 0.85 + (i % 3) * 0.3,
          duration: 2.2 + (i % 4) * 0.6,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: (i * 0.15) % 1.2,
        });
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <footer
      ref={rootRef}
      className="relative overflow-hidden bg-gradient-to-br from-[#59040a] via-[#850a12] to-[#6e070e] text-white"
    >
      {/* Background Radial Glow */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full bg-rose-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 -bottom-20 h-96 w-96 rounded-full bg-amber-400/15 blur-3xl" />

      {/* Floating Animated Particles */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {PARTICLES.map((pt, idx) => (
          <span
            key={idx}
            className={`ft-particle absolute rounded-full ${pt.size} ${pt.bg} ${pt.blur}`}
            style={{ top: pt.top, left: pt.left }}
          />
        ))}

        {/* Decorative Sparkle Stars */}
        <span
          className="ft-particle absolute top-8 left-[18%] text-[10px] text-amber-300/40 select-none"
          style={{ transform: 'rotate(12deg)' }}
        >
          ✦
        </span>
        <span
          className="ft-particle absolute bottom-12 left-[42%] text-xs text-white/35 select-none"
        >
          ✦
        </span>
        <span
          className="ft-particle absolute top-10 right-[22%] text-xs text-amber-200/45 select-none"
          style={{ transform: 'rotate(-15deg)' }}
        >
          ✦
        </span>
      </div>

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
          {/* Dual White Logos Header — HUT RI 81 + TKI x FTP */}
          <div className="ft-item flex items-center justify-center gap-3 sm:gap-4">
            <LogoHutRi81
              variant="white"
              className="h-12 sm:h-14 w-auto drop-shadow-md"
              animate
            />
            <div className="h-7 sm:h-9 w-px bg-white/25 shrink-0" />
            <div className="flex items-center gap-2 sm:gap-2.5">
              <LogoTki
                variant="white"
                className="h-4.5 sm:h-5.5 w-auto drop-shadow-md"
                animate
              />
              <svg
                viewBox="0 0 16 16"
                className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 text-white/45 stroke-current"
                fill="none"
                strokeWidth="1.2"
                strokeLinecap="round"
              >
                <line x1="4" y1="4" x2="12" y2="12" />
                <line x1="12" y1="4" x2="4" y2="12" />
              </svg>
              <LogoFtp
                variant="white"
                className="h-4.5 sm:h-5.5 w-auto drop-shadow-md"
                animate
              />
            </div>
          </div>

          {/* Slogan & Subhead */}
          <div className="ft-item max-w-xl space-y-1.5">
            <h3 className="font-heading text-xl font-black tracking-tight sm:text-2xl text-white">
              Semarak Kemerdekaan, Eratkan Kebersamaan.
            </h3>
            <p className="text-xs font-semibold text-white/80">
              Dirgahayu Republik Indonesia ke-81
            </p>
          </div>

          {/* Clean Copyright Footer Divider */}
          <div className="ft-item w-full border-t border-white/15 pt-5 mt-2">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-[11px] sm:text-xs text-white/60 text-center font-medium leading-relaxed">
              <span>© 2026</span>
              <span className="hidden sm:inline text-white/30">•</span>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <span>PT Teknologi Kartu Indonesia</span>
                <span className="text-white/40 font-light text-[10px] sm:text-xs">x</span>
                <span>PT Fokus Teknologi Pembayaran</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
