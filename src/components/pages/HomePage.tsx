import { useEffect, useRef, useState } from "react";
import { useAudienceNavigate } from "../../context/AudienceContext";
import { competitions } from "../../data/content";
import { summaryKelompok } from "../../data/kelompok";
import { assets } from "../../assets";
import { LazyImage } from "../ui/LazyImage";
import { gsap, shouldReduceMotion } from "../../lib/gsap";
import { getEventPhase, PHASES } from "../../lib/eventPhase";

const STATS = [
  {
    id: "teams",
    icon: "fa-solid fa-users",
    value: summaryKelompok.total,
    label: "Tim Berlaga",
    sub: `${summaryKelompok.putra} putra · ${summaryKelompok.putri} putri`,
  },
  {
    id: "lomba",
    icon: "fa-solid fa-trophy",
    value: "3",
    label: "Cabang Lomba",
    sub: "5R · Balon · Air",
  },
  {
    id: "peak",
    icon: "fa-solid fa-calendar-check",
    value: "13 Ags",
    label: "Hari Puncak",
    sub: "Mulai 12.45 WIB",
  },
  {
    id: "award",
    icon: "fa-solid fa-bullhorn",
    value: "28 Ags",
    label: "Pengumuman",
    sub: "Setelah kajian",
  },
];

const TIMELINE = [
  {
    id: "sosialisasi",
    icon: "fa-solid fa-bullhorn",
    title: "Sosialisasi",
    date: "3 Ags",
    day: "Senin",
    desc: "Penjelasan aturan dan teknis untuk semua tim.",
  },
  {
    id: "dekor",
    icon: "fa-solid fa-paint-roller",
    title: "Dekor",
    date: "4–7 Ags",
    day: "Selasa–Jumat",
    desc: "Bikin dekorasi ruangan bertema kemerdekaan. Tetap jaga 5R.",
  },
  {
    id: "puncak",
    icon: "fa-solid fa-flag-checkered",
    title: "Puncak Acara",
    date: "13 Ags",
    day: "Kamis",
    desc: "Lomba utama lapangan dari jam 12.45 WIB.",
    highlight: true,
  },
  {
    id: "pengumuman",
    icon: "fa-solid fa-trophy",
    title: "Pengumuman",
    date: "28 Ags",
    day: "Jumat",
    desc: "Pembagian hadiah setelah kajian Jumat.",
  },
];

/**
 * IntersectionObserver-based visibility hook for below-fold animations.
 * Returns { ref, isVisible }. GSAP fires only when isVisible becomes true.
 */
function useSectionVisible(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const isVisible = useRef(false);
  const [trigger, setTrigger] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || shouldReduceMotion()) {
      setTrigger(true); // no IO → animate immediately (reduced motion or SSR)
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible.current) {
          isVisible.current = true;
          setTrigger(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: "100px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, trigger };
}

export default function HomePage() {
  const navigate = useAudienceNavigate();
  const rootRef = useRef(null);

  // ── Below-fold visibility ──
  const { ref: lombaSectionRef, trigger: lombaVisible } = useSectionVisible(0.1);
  const { ref: timelineSectionRef, trigger: timelineVisible } = useSectionVisible(0.1);

  // ── Above-fold: immediate GSAP (stats + overview) ──
  useEffect(() => {
    if (!rootRef.current || shouldReduceMotion()) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".stat-card",
        { y: 20, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.08, ease: "back.out(1.7)", clearProps: "all" },
      );
      gsap.fromTo(
        ".overview-anim",
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "power2.out", clearProps: "all" },
      );
    }, rootRef);
    return () => ctx.revert();
  }, []);

  // ── Below-fold: lomba cards (GSAP only when visible) ──
  useEffect(() => {
    if (!lombaVisible || shouldReduceMotion()) return;
    gsap.fromTo(
      ".lomba-card",
      { y: 24, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.55, stagger: 0.1, ease: "power2.out", clearProps: "all" },
    );
  }, [lombaVisible]);

  // ── Below-fold: timeline (GSAP only when visible) ──
  useEffect(() => {
    if (!timelineVisible || shouldReduceMotion()) return;
    gsap.fromTo(
      ".tl-node",
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.5, stagger: 0.12, ease: "back.out(1.8)", clearProps: "all" },
    );
  }, [timelineVisible]);

  return (
    <div ref={rootRef} className="space-y-8 sm:space-y-10">
      {/* 1. Key Stats Bar — Single Merged Card Connected to Hero */}
      <section className="-mt-10 sm:-mt-12 relative z-20">
        <div className="stat-card isolate overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl shadow-slate-950/10 [transform:translateZ(0)]">
          <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 lg:grid-cols-4 lg:divide-y-0 lg:divide-x lg:divide-slate-200/80">
            {STATS.map((item) => (
              <div
                key={item.id}
                className="group flex items-center gap-2.5 p-3.5 sm:gap-3.5 sm:p-5 transition hover:bg-rose-50/30"
              >
                <div className="flex h-9 w-9 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-rose-100/70 text-brand-red transition-transform group-hover:scale-110">
                  <i className={`${item.icon} text-sm sm:text-lg`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1">
                    <span className="font-heading text-xl font-black tracking-tight text-slate-900 sm:text-3xl">
                      {item.value}
                    </span>
                  </div>
                  <p className="text-xs font-bold leading-tight text-slate-800 sm:text-sm">
                    {item.label}
                  </p>
                  <p className="text-[10px] font-medium leading-tight text-slate-500 sm:text-xs">
                    {item.sub}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Ringkasan Acara Section */}
      <section className="overview-anim overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4 p-6 sm:p-8">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                RINGKASAN
              </span>
              <span className="h-0.5 w-8 bg-slate-300 rounded-full" />
            </div>

            <h2 className="font-heading text-2xl font-black tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
              HUT RI ke-81 di TKI.{" "}
              <span className="text-brand-red">
                Lomba, dekor, dan kebersamaan
              </span>
            </h2>

            <p className="max-w-xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">
              Tiga lomba, 13 tim, satu perayaan. Ringkasan ada di sini; aturan
              lengkap di tab <strong className="text-slate-900">Lomba</strong>,
              jadwal di <strong className="text-slate-900">Rundown</strong>,
              daftar peserta di <strong className="text-slate-900">Tim</strong>.
            </p>

            <div className="flex flex-wrap gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => navigate("/lomba")}
                className="rounded-full bg-brand-red px-5 py-3 text-xs font-bold text-white shadow-lg shadow-red-600/25 transition hover:-translate-y-0.5 hover:bg-red-700"
              >
                Panduan lomba
              </button>
              <button
                type="button"
                onClick={() => navigate("/rundown")}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white px-4 py-3 text-xs font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                <i className="fa-solid fa-calendar text-[11px] text-slate-400" />
                <span>Lihat rundown</span>
              </button>
              <button
                type="button"
                onClick={() => navigate("/tim")}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white px-4 py-3 text-xs font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                <i className="fa-solid fa-user text-[11px] text-slate-400" />
                <span>Cari peserta</span>
              </button>
            </div>
          </div>

          {/* Right Banner Cartoon Festive Image with Overlay Floating Dark Badge */}
          <div className="relative min-h-[220px] overflow-hidden border-t border-slate-100 sm:min-h-[260px] lg:border-l lg:border-t-0">
            <LazyImage
              src={assets.ringkasanBanner}
              alt="Suasana Perayaan Kemerdekaan 5R"
              wrapperClassName="absolute inset-0 block"
              className="absolute inset-0 h-full w-full object-cover"
              rootMargin="600px"
              fetchPriority="low"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

            {/* Floating Overlay Badge Card — CSS animation replaces GSAP infinite loop */}
            <div
              className="animate-float-y absolute bottom-4 right-4 flex items-center gap-3.5 rounded-2xl border border-white/15 bg-slate-950/90 p-4 text-white shadow-2xl backdrop-blur-md"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                <i className="fa-solid fa-trophy text-xl" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400/90">
                  PENGUMUMAN JUARA
                </p>
                <p className="font-heading text-lg font-black text-white">
                  28 Agustus 2026
                </p>
                <p className="text-[11px] text-white/75">
                  Setelah kajian Jumat · Mushola TKI
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Cabang Lomba Section — IO-triggered entrance */}
      <section ref={lombaSectionRef} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                LOMBA
              </span>
              <span className="h-0.5 w-8 bg-slate-300 rounded-full" />
            </div>
            <h3 className="mt-1 font-heading text-2xl font-black text-slate-900 sm:text-3xl">
              Tiga lomba tahun ini
            </h3>
          </div>
          <button
            type="button"
            onClick={() => navigate("/lomba")}
            className="group inline-flex items-center gap-1.5 text-xs font-extrabold text-brand-red hover:underline"
          >
            <span>Lihat semua lomba</span>
            <i className="fa-solid fa-arrow-right text-[10px] transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* Guaranteed 3 Competition Cards Display Grid */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {competitions.map((c, index) => {
            const img = (assets.lomba as Record<string, string>)?.[c.imageKey] || (assets.lomba as Record<string, string>)?.[c.id];
            const numBadge = String(index + 1).padStart(2, "0");
            return (
              <div
                key={c.id}
                onClick={() => navigate("/lomba/" + c.id)}
                className="lomba-card group cursor-pointer overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition hover:-translate-y-1 hover:border-red-200 hover:shadow-md flex flex-col justify-between"
              >
                {/* Image Header with Badges */}
                <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-rose-50">
                  {img ? (
                    <LazyImage
                      src={img}
                      alt={c.title}
                      wrapperClassName="w-full h-full block"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      rootMargin="400px"
                      fetchPriority="low"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-brand-red font-bold">
                      {c.title}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

                  {/* Top-Left Number Circle Badge */}
                  <div className="absolute top-3 left-3 flex h-8 w-8 items-center justify-center rounded-full bg-brand-red font-heading text-xs font-black text-white shadow-md shadow-red-600/30 ring-2 ring-white">
                    {numBadge}
                  </div>

                  {/* Bottom-Right Category Badge */}
                  <div className="absolute bottom-3 right-3">
                    <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-extrabold text-slate-800 shadow-sm backdrop-blur-md">
                      {c.short}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-2.5 p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h4 className="font-heading text-base font-bold text-slate-900 group-hover:text-brand-red sm:text-lg transition-colors">
                      {c.title}
                    </h4>
                    <p className="text-xs leading-relaxed text-slate-600 line-clamp-3">
                      {c.summary}
                    </p>
                  </div>
                  <div className="pt-3 flex items-center text-xs font-extrabold text-brand-red">
                    <span>Lihat panduan</span>
                    <i className="fa-solid fa-arrow-right ml-1.5 text-[10px] transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Jadwal Penting Section (Horizontal Timeline) — IO-triggered */}
      <section ref={timelineSectionRef} className="space-y-5 rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
              JADWAL PENTING
            </span>
            <span className="h-0.5 w-8 bg-slate-300 rounded-full" />
          </div>
          <span className="text-[11px] font-bold text-slate-500">
            <i className="fa-solid fa-circle-check text-emerald-500 mr-1" />
            Agenda Berjalan
          </span>
        </div>

        {/* Timeline Horizontal Grid */}
        <div className="relative pt-2">
          {/* Dashed Connecting Line — CSS animation replaces GSAP */}
          <div className="hidden lg:block absolute top-[2.25rem] left-[10%] right-[10%] h-0.5">
            <div
              className={timelineVisible ? "animate-line-grow h-full w-full border-t-2 border-dashed border-rose-300" : "h-full w-full border-t-2 border-dashed border-rose-300"}
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TIMELINE.map((step) => {
              const currentPhaseId = getEventPhase().id;
              const isStepActive =
                (step.id === 'sosialisasi' && currentPhaseId === PHASES.SOSIALISASI) ||
                (step.id === 'dekor' && currentPhaseId === PHASES.DEKORASI) ||
                (step.id === 'puncak' && (currentPhaseId === PHASES.HARI_PUNCAK_PRE || currentPhaseId === PHASES.HARI_PUNCAK_LIVE)) ||
                (step.id === 'pengumuman' && currentPhaseId === PHASES.PENGUMUMAN_DAY);

              return (
                <div
                  key={step.id}
                  className={`tl-node flex flex-col items-center text-center space-y-3 p-3 rounded-2xl transition ${
                    isStepActive ? 'bg-rose-50/70 border border-rose-200 shadow-sm' : ''
                  }`}
                >
                  {/* Node Icon */}
                  <div className="relative z-10">
                    {isStepActive || step.highlight ? (
                      <div className="relative flex h-14 w-14 items-center justify-center">
                        <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-brand-red opacity-30" />
                        <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-brand-red text-white shadow-xl shadow-red-600/40 ring-4 ring-rose-100">
                          <i className={`${step.icon} text-lg`} />
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-rose-100 bg-rose-50/80 text-brand-red shadow-sm">
                        <i className={`${step.icon} text-base`} />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-1">
                    {isStepActive && (
                      <span className="inline-block rounded-full bg-brand-red px-2.5 py-0.5 text-[10px] font-black uppercase text-white shadow-sm mb-1">
                        ● Aktif Sekarang
                      </span>
                    )}
                    <p
                      className={`text-sm font-extrabold ${
                        isStepActive || step.highlight ? "text-brand-red" : "text-slate-900"
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="font-heading text-base font-black text-slate-900">
                      {step.date}{" "}
                      <span className="text-xs font-semibold text-slate-500">
                        ({step.day})
                      </span>
                    </p>
                    <p className="max-w-xs text-xs leading-relaxed text-slate-500">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
