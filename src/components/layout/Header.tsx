import { useLocation } from '@tanstack/react-router';
import { motion } from 'motion/react';
import { useAudience, useAudienceNavigate } from '../../context/AudienceContext';
import LogoFtp from '../brand/LogoFtp';
import LogoHutRi81 from '../brand/LogoHutRi81';
import LogoTki from '../brand/LogoTki';

const NAV = [
  { id: 'beranda', label: 'Beranda', path: '/' },
  { id: 'lomba', label: 'Lomba', path: '/lomba' },
  { id: 'rundown', label: 'Rundown', path: '/rundown' },
  { id: 'live', label: 'Live Score', path: '/live' },
  { id: 'tim', label: 'Tim', path: '/tim' },
];

export default function SiteHeader() {
  const navigate = useAudienceNavigate();
  const { isPanitia } = useAudience();
  const { pathname } = useLocation();

  const activeId =
    NAV.find((n) => pathname === n.path || (n.path !== '/' && pathname.startsWith(n.path)))?.id ??
    'beranda';

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="border-b border-slate-200/80 bg-white/90 shadow-sm shadow-slate-900/5 backdrop-blur-xl sm:sticky sm:top-0 z-40"
    >
      <div className="h-1 w-full bg-gradient-to-r from-brand-deep via-brand-red to-brand-gold" />

      <div className="shell flex h-16 items-center justify-between gap-3 sm:h-[4.25rem]">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex min-w-0 cursor-pointer items-center gap-2.5 text-left transition hover:opacity-90 active:scale-[0.98] sm:gap-3"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: 'backOut', delay: 0.25 }}
            className="flex shrink-0 items-center gap-2 sm:gap-3"
          >
            <LogoHutRi81 className="h-9 sm:h-10 w-auto shrink-0" animate />
            <div className="h-5 sm:h-7 w-px bg-slate-200 shrink-0" />
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <LogoTki className="h-3.5 sm:h-4 w-auto shrink-0" animate />
              <svg
                viewBox="0 0 16 16"
                className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 text-slate-500 stroke-current"
                fill="none"
                strokeWidth="1.2"
                strokeLinecap="round"
              >
                <line x1="4" y1="4" x2="12" y2="12" />
                <line x1="12" y1="4" x2="4" y2="12" />
              </svg>
              <LogoFtp className="h-3.5 sm:h-4 w-auto shrink-0" animate />
            </div>
          </motion.div>
        </button>

        <motion.nav
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25, ease: 'easeOut' }}
          className="hidden items-center gap-1 rounded-full border border-slate-200/90 bg-slate-100/90 p-1 shadow-inner lg:flex"
        >
          {NAV.map((item) => {
            const active = activeId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-active={active ? 'true' : 'false'}
                onClick={() => {
                  navigate(item.path);
                }}
                className={`relative cursor-pointer rounded-full px-5 py-1.5 text-xs font-bold transition-colors active:scale-95 ${
                  active ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="header-active-nav-pill"
                    transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                    className="absolute inset-0 rounded-full bg-brand-red shadow-md shadow-red-600/25"
                  />
                )}
                <span className="relative z-10">{item.label}</span>
              </button>
            );
          })}
        </motion.nav>

        <div className="flex items-center gap-2">
          {isPanitia && (
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-sky-200/80 bg-sky-50/90 px-3 py-1.5 text-[10px] font-bold text-sky-700 shadow-sm">
              <i className="fa-solid fa-user-gear text-[10px]" />
              <span>Mode Panitia</span>
            </div>
          )}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.25, ease: 'easeOut' }}
            className="hidden sm:flex items-center gap-2 rounded-full border border-rose-200/80 bg-rose-50/90 px-3.5 py-1.5 text-xs font-bold text-brand-red shadow-sm"
          >
            <span className="live-dot animate-live-dot relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-brand-red opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-red" />
            </span>
            <i className="fa-regular fa-calendar text-[11px] text-brand-red" />
            <span>13 Agustus 2026</span>
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
}
