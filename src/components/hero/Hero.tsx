import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { type MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from 'react';
import { motionDuration, motionEase } from '~/lib/motion';
import { useAudienceNavigate } from '../../context/AudienceContext';
import LogoFtp from '../brand/LogoFtp';
import LogoHutRi81 from '../brand/LogoHutRi81';
import LogoTki from '../brand/LogoTki';
import SalatigaRibbonSvg from '../brand/SalatigaRibbonSvg';
import EventStatusReminder from './EventStatusReminder';

function useParallaxTilt() {
  const reduce = useReducedMotion();
  const rotateX = useSpring(useMotionValue(0), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 150, damping: 20 });
  const rafRef = useRef(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const onMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (reduce || !mounted) return;
    const currentTarget = e.currentTarget;
    if (!currentTarget) return;
    const rect = currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      rotateY.set(x * 0.03);
      rotateX.set(-y * 0.03);
    });
  };

  const onMouseLeave = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    rotateX.set(0);
    rotateY.set(0);
  };

  return { rotateX, rotateY, onMouseMove, onMouseLeave, reduce, mounted };
}

export default function Hero() {
  const navigate = useAudienceNavigate();
  const { rotateX, rotateY, onMouseMove, onMouseLeave, reduce, mounted } = useParallaxTilt();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-hero-from via-hero-via to-hero-to text-white">
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
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            className="hero-animate flex flex-wrap items-center gap-2 sm:gap-4 max-w-full"
          >
            <LogoHutRi81
              variant="white"
              animate
              className="h-9 sm:h-16 w-auto drop-shadow-md shrink-0"
            />
            <div className="h-6 sm:h-11 w-px bg-white/35 shrink-0" />
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              <LogoTki variant="white" animate className="h-3.5 sm:h-6 w-auto drop-shadow-md" />
              <svg
                viewBox="0 0 16 16"
                className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 shrink-0 text-white/45 stroke-current"
                fill="none"
                strokeWidth="1.2"
                strokeLinecap="round"
              >
                <line x1="4" y1="4" x2="12" y2="12" />
                <line x1="12" y1="4" x2="4" y2="12" />
              </svg>
              <LogoFtp variant="white" animate className="h-3.5 sm:h-6 w-auto drop-shadow-md" />
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.65, ease: 'easeOut', delay: 0.08 }}
            className="hero-animate space-y-1.5 sm:space-y-2"
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">
              Peringatan Kemerdekaan
            </p>
            <h1 className="font-heading text-2xl sm:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight">
              <span className="inline-block align-baseline rounded-xl bg-white px-2 sm:px-3 py-0.5 text-brand-red shadow-lg my-0.5">
                HUT RI ke-81
              </span>
            </h1>
            <p className="max-w-xl text-[11px] leading-relaxed text-white/90 sm:text-base">
              Lomba, dekor, dan kebersamaan. Semuanya demi satu semangat yang sama.
            </p>
          </motion.div>

          {/* Action Buttons — High Contrast Primary CTA */}
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.65, ease: 'easeOut', delay: 0.16 }}
            className="hero-animate flex flex-col sm:flex-row gap-2 sm:gap-3.5 pt-1 w-full max-w-full"
          >
            <button
              type="button"
              onClick={() => navigate('/lomba')}
              className="group inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 sm:px-6 sm:py-3.5 text-xs sm:text-sm font-extrabold text-brand-red shadow-xl shadow-black/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 active:scale-95 text-center w-full sm:w-auto min-h-[40px] sm:min-h-[44px]"
            >
              <i className="fa-solid fa-book-open text-xs text-brand-red" />
              <span>Lihat panduan lomba</span>
              <i className="fa-solid fa-arrow-right text-xs transition-transform group-hover:translate-x-1 text-brand-red" />
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
          </motion.div>
        </div>

        {/* Right Column: Vertically Centered Event Status & Reminder Card */}
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.65, ease: 'easeOut', delay: 0.24 }}
          className="hero-animate w-full max-w-full overflow-hidden [perspective:1000px] lg:self-center"
        >
          <motion.div
            onMouseMove={reduce || !mounted ? undefined : onMouseMove}
            onMouseLeave={reduce || !mounted ? undefined : onMouseLeave}
            style={mounted && !reduce ? { rotateX, rotateY, willChange: 'transform' } : undefined}
            className="w-full max-w-full"
          >
            <EventStatusReminder />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
