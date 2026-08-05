import { useEffect, useRef } from "react";
import { useLocation } from "@tanstack/react-router";
import {
  useAudienceNavigate,
  useAudience,
} from "../../context/AudienceContext";
import LogoTki from "../brand/LogoTki";
import LogoFtp from "../brand/LogoFtp";
import LogoHutRi81 from "../brand/LogoHutRi81";
import { preloadRoute, makeRouteLoader } from "../ui/routeLoader";
import { gsap, shouldReduceMotion } from "../../lib/gsap";

const NAV = [
  { id: "beranda", label: "Beranda", path: "/beranda" },
  { id: "lomba", label: "Lomba", path: "/lomba" },
  { id: "rundown", label: "Rundown", path: "/rundown" },
  { id: "tim", label: "Tim", path: "/tim" },
];

const LOADERS = {
  beranda: makeRouteLoader(() => import("../../components/pages/HomePage")),
  lomba: makeRouteLoader(() => import("../../components/pages/LombaPage")),
  rundown: makeRouteLoader(
    () => import("../../components/pages/RundownPage"),
  ),
  tim: makeRouteLoader(() => import("../../components/pages/TimPage")),
};

export default function SiteHeader() {
  const navigate = useAudienceNavigate();
  const { isPanitia } = useAudience();
  const { pathname } = useLocation();
  const headerRef = useRef<HTMLElement>(null);
  const brandRef = useRef<HTMLButtonElement>(null);
  const logosRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  const activeId =
    NAV.find((n) => pathname.startsWith(n.path))?.id ?? "beranda";

  useEffect(() => {
    if (!headerRef.current || shouldReduceMotion()) return undefined;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(
        headerRef.current,
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, clearProps: "all" },
      )
        .fromTo(
          logosRef.current,
          { scale: 0.85, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.4,
            ease: "back.out(1.5)",
            clearProps: "all",
          },
          "-=0.2",
        )
        .fromTo(
          brandRef.current?.querySelectorAll(".hdr-text") || [],
          { x: -10, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.35,
            stagger: 0.05,
            clearProps: "all",
          },
          "-=0.25",
        )
        .fromTo(
          navRef.current,
          { opacity: 0, y: -6 },
          { opacity: 1, y: 0, duration: 0.3, clearProps: "all" },
          "-=0.2",
        )
        .fromTo(
          chipRef.current,
          { opacity: 0, scale: 0.85 },
          { opacity: 1, scale: 1, duration: 0.3, clearProps: "all" },
          "-=0.2",
        );

      const liveDot = chipRef.current?.querySelector(".live-dot");
      if (liveDot) {
        gsap.to(liveDot, {
          scale: 1.35,
          opacity: 0.55,
          duration: 1.1,
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut",
        });
      }
    }, headerRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!navRef.current || shouldReduceMotion()) return;
    const active = navRef.current.querySelector('[data-active="true"]');
    if (!active) return;
    gsap.fromTo(
      active,
      { scale: 0.94 },
      { scale: 1, duration: 0.28, ease: "back.out(2)" },
    );
  }, [activeId]);

  return (
    <header
      ref={headerRef}
      className="border-b border-slate-200/80 bg-white/90 shadow-sm shadow-slate-900/5 backdrop-blur-xl sm:sticky sm:top-0 z-40"
    >
      <div className="h-1 w-full bg-gradient-to-r from-brand-deep via-brand-red to-brand-gold" />

      <div className="shell flex h-16 items-center justify-between gap-3 sm:h-[4.25rem]">
        <button
          ref={brandRef}
          type="button"
          onClick={() => navigate("/beranda")}
          className="flex min-w-0 cursor-pointer items-center gap-2.5 text-left transition hover:opacity-90 active:scale-[0.98] sm:gap-3"
        >
          <div
            ref={logosRef}
            className="flex shrink-0 items-center gap-2 sm:gap-3"
          >
            <LogoHutRi81 className="h-9 sm:h-10 w-auto shrink-0" animate />
            <div className="h-5 sm:h-7 w-px bg-slate-200 shrink-0" />
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <LogoTki className="h-3.5 sm:h-4 w-auto shrink-0" animate />
              <svg
                viewBox="0 0 16 16"
                className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 text-slate-400 stroke-current"
                fill="none"
                strokeWidth="1.2"
                strokeLinecap="round"
              >
                <line x1="4" y1="4" x2="12" y2="12" />
                <line x1="12" y1="4" x2="4" y2="12" />
              </svg>
              <LogoFtp className="h-3.5 sm:h-4 w-auto shrink-0" animate />
            </div>
          </div>
        </button>

        <nav
          ref={navRef}
          className="hidden items-center gap-1 rounded-full border border-slate-200/90 bg-slate-100/90 p-1 shadow-inner lg:flex"
        >
          {NAV.map((item) => {
            const active = activeId === item.id;
            const loader = LOADERS[item.id as keyof typeof LOADERS];
            return (
              <button
                key={item.id}
                type="button"
                data-active={active ? "true" : "false"}
                onClick={() => {
                  preloadRoute(loader).catch(() => {});
                  navigate(item.path);
                }}
                className={`cursor-pointer rounded-full px-5 py-1.5 text-xs font-bold transition-all duration-200 active:scale-95 ${
                  active
                    ? "bg-brand-red text-white shadow-md shadow-red-600/25"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {isPanitia && (
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-sky-200/80 bg-sky-50/90 px-3 py-1.5 text-[10px] font-bold text-sky-700 shadow-sm">
              <i className="fa-solid fa-user-gear text-[10px]" />
              <span>Mode Panitia</span>
            </div>
          )}
          <div
            ref={chipRef}
            className="hidden sm:flex items-center gap-2 rounded-full border border-rose-200/80 bg-rose-50/90 px-3.5 py-1.5 text-xs font-bold text-brand-red shadow-sm"
          >
            <span className="live-dot relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-brand-red opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-red" />
            </span>
            <i className="fa-regular fa-calendar text-[11px] text-brand-red" />
            <span>13 Agustus 2026</span>
          </div>
        </div>
      </div>
    </header>
  );
}
