import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAudience, useAudienceNavigate } from "../../context/AudienceContext";
import { createPortal } from "react-dom";
import { competitions } from "../../data/content";
import { assets } from "../../assets";
import { gsap, shouldReduceMotion } from "../../lib/gsap";

const tone = {
  red: {
    border: "border-rose-200",
    head: "from-brand-deep to-brand-red",
    soft: "bg-rose-50 text-brand-red",
    step: "bg-brand-red text-white",
    rail: "bg-rose-200",
    ring: "ring-brand-red/25",
  },
  amber: {
    border: "border-amber-200",
    head: "from-amber-500 to-orange-500",
    soft: "bg-amber-50 text-amber-800",
    step: "bg-amber-500 text-white",
    rail: "bg-amber-200",
    ring: "ring-amber-500/25",
  },
  blue: {
    border: "border-sky-200",
    head: "from-sky-600 to-blue-700",
    soft: "bg-sky-50 text-sky-800",
    step: "bg-sky-600 text-white",
    rail: "bg-sky-200",
    ring: "ring-sky-500/25",
  },
};

function BranchChips({ activeId, onSelect, compact = false }) {
  return (
    <div
      className={`flex gap-2 ${compact ? "" : "overflow-x-auto pb-0.5 no-scrollbar"}`}
    >
      {competitions.map((c) => {
        const selected = activeId === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className={`flex items-center gap-2 rounded-2xl border text-left transition ${
              compact
                ? "min-w-0 flex-1 px-2 py-1.5 sm:px-2.5"
                : "min-w-[148px] shrink-0 px-2.5 py-2 sm:min-w-0 sm:flex-1"
            } ${
              selected
                ? "border-brand-red bg-brand-soft shadow-sm ring-1 ring-brand-red/25"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <img
              src={assets.lomba[c.imageKey]}
              alt=""
              className={`shrink-0 rounded-xl object-cover ${compact ? "h-8 w-8" : "h-10 w-10"}`}
            />
            <div className="min-w-0">
              {!compact && (
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {c.number}
                </p>
              )}
              <p
                className={`truncate font-bold text-slate-900 ${
                  compact ? "text-xs sm:text-sm" : "text-sm"
                }`}
              >
                {c.short}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function WorkflowDesktop({ steps, t }) {
  const n = steps.length;
  // Warna path & panah selaras tone
  const lineClass = t.rail;
  const arrowWrap = t.step.includes("brand-red")
    ? "bg-white text-brand-red ring-rose-100"
    : t.step.includes("amber")
      ? "bg-white text-amber-600 ring-amber-100"
      : "bg-white text-sky-600 ring-sky-100";

  // Pusat node ke-i (equal columns, no gap): (i + 0.5) / n
  // Titik tengah segmen i→i+1: (i + 1) / n
  const nodeCenterPct = (i) => ((i + 0.5) / n) * 100;
  const segmentMidPct = (i) => ((i + 1) / n) * 100;

  return (
    <div className="hidden sm:block">
      <div className="relative">
        {/* —— PATH LAYER (nodes + continuous line + centered arrows) —— */}
        <div className="relative mb-4 h-12">
          {/* Garis path: dari pusat node pertama ke pusat node terakhir */}
          <div
            className={`pointer-events-none absolute top-1/2 h-0.5 -translate-y-1/2 ${lineClass}`}
            style={{
              left: `${nodeCenterPct(0)}%`,
              width: `${nodeCenterPct(n - 1) - nodeCenterPct(0)}%`,
            }}
            aria-hidden
          />

          {/* Panah di tengah setiap segmen antar node */}
          {steps.slice(0, -1).map((_, i) => (
            <div
              key={`arrow-${i}`}
              className="pointer-events-none absolute top-1/2 z-[5] -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${segmentMidPct(i)}%` }}
              aria-hidden
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full shadow-sm ring-1 ${arrowWrap}`}
              >
                <i className="fa-solid fa-chevron-right text-[9px]" />
              </span>
            </div>
          ))}

          {/* Node di atas garis, di pusat tiap kolom */}
          {steps.map((w, i) => (
            <div
              key={`node-${w.step}`}
              className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${nodeCenterPct(i)}%` }}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-black shadow-md ring-4 ring-white ${t.step}`}
              >
                <i className={`fa-solid ${w.icon}`} />
              </div>
            </div>
          ))}
        </div>

        {/* —— CARD LAYER (equal columns, aligned under nodes) —— */}
        <ol
          className="grid gap-x-4"
          style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
        >
          {steps.map((w) => (
            <li key={w.step} className="flex min-w-0 flex-col">
              <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-3.5 text-center shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Langkah {w.step}
                </p>
                <p className="mt-1 text-sm font-bold leading-snug text-slate-900">
                  {w.title}
                </p>
                <p
                  className={`mt-2 inline-flex self-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${t.soft}`}
                >
                  {w.time}
                </p>
                <p className="mt-2.5 flex-1 text-[11px] leading-relaxed text-slate-500">
                  {w.desc}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function WorkflowMobile({ steps, t }) {
  return (
    <div className="relative space-y-0 sm:hidden">
      <div className={`absolute bottom-4 left-[15px] top-4 w-0.5 ${t.rail}`} />
      {steps.map((w) => (
        <div key={w.step} className="relative flex gap-3 pb-4 last:pb-0">
          <div
            className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black shadow-sm ${t.step}`}
          >
            {w.step}
          </div>
          <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold text-slate-900">{w.title}</p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${t.soft}`}
              >
                {w.time}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {w.desc}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function StickyBranchBar({
  open,
  menuOpen,
  setMenuOpen,
  active,
  activeId,
  onSelect,
}) {
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const menuRef = useRef(null);
  const closingRef = useRef(false);

  // Mount when open becomes true
  useEffect(() => {
    if (open) {
      closingRef.current = false;
      setMounted(true);
    }
  }, [open]);

  // Animate in
  useEffect(() => {
    if (!mounted || !open || !panelRef.current) return undefined;
    if (shouldReduceMotion()) {
      gsap.set(panelRef.current, { clearProps: "all", y: 0, opacity: 1 });
      return undefined;
    }
    gsap.killTweensOf(panelRef.current);
    gsap.fromTo(
      panelRef.current,
      { y: -28, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.38, ease: "power3.out" },
    );
    return undefined;
  }, [mounted, open]);

  // Animate out when open=false
  useEffect(() => {
    if (!mounted) return undefined;
    if (open || closingRef.current) return undefined;

    if (!panelRef.current || shouldReduceMotion()) {
      setMounted(false);
      return undefined;
    }

    closingRef.current = true;
    gsap.killTweensOf(panelRef.current);
    const tw = gsap.to(panelRef.current, {
      y: -22,
      opacity: 0,
      duration: 0.28,
      ease: "power2.in",
      onComplete: () => {
        closingRef.current = false;
        setMounted(false);
      },
    });
    return () => tw.kill();
  }, [open, mounted]);

  // Dropdown menu animation
  useEffect(() => {
    if (!menuRef.current) return undefined;
    if (shouldReduceMotion()) return undefined;
    if (menuOpen) {
      gsap.fromTo(
        menuRef.current,
        { y: -8, opacity: 0, scale: 0.97 },
        { y: 0, opacity: 1, scale: 1, duration: 0.28, ease: "power3.out" },
      );
      const chips = menuRef.current.querySelectorAll("[data-branch-chip]");
      if (chips.length) {
        gsap.fromTo(
          chips,
          { y: 6, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.22,
            stagger: 0.04,
            ease: "power2.out",
            delay: 0.05,
          },
        );
      }
    }
    return undefined;
  }, [menuOpen]);

  if (!mounted) return null;

  const ui = (
    <div
      ref={rootRef}
      className="pointer-events-none fixed inset-x-0 top-6 z-[60] px-4 sm:top-6 sm:px-6"
    >
      <div
        ref={panelRef}
        className="pointer-events-auto mx-auto w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-2xl shadow-slate-900/15 backdrop-blur-xl sm:max-w-2xl"
        style={{ opacity: 0 }}
      >
        <div className="h-0.5 w-full bg-gradient-to-r from-brand-deep via-brand-red to-brand-gold" />
        <div className="px-2.5 py-2 sm:px-3">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex w-full min-w-0 items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/90 px-2.5 py-2 text-left transition hover:bg-slate-50"
            aria-expanded={menuOpen}
          >
            <img
              src={assets.lomba[active.imageKey]}
              alt=""
              className="h-9 w-9 shrink-0 rounded-xl object-cover ring-1 ring-slate-200"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Ganti cabang · {active.number}
              </p>
              <p className="truncate text-sm font-bold text-slate-900">
                {active.short}
              </p>
            </div>
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200 transition ${
                menuOpen ? "rotate-180 text-brand-red" : ""
              }`}
            >
              <i className="fa-solid fa-chevron-down text-xs" />
            </span>
          </button>

          {menuOpen && (
            <div
              ref={menuRef}
              className="mt-2 rounded-xl border border-slate-200 bg-white p-2 shadow-inner"
            >
              <div className="flex gap-2">
                {competitions.map((c) => {
                  const selected = activeId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      data-branch-chip
                      onClick={() => onSelect(c.id)}
                      className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition sm:px-2.5 ${
                        selected
                          ? "border-brand-red bg-brand-soft shadow-sm ring-1 ring-brand-red/25"
                          : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                      }`}
                    >
                      <img
                        src={assets.lomba[c.imageKey]}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded-lg object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-900 sm:text-sm">
                          {c.short}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(ui, document.body);
}

export default function LombaPage() {
  const { id: paramId } = useParams();
  const navigate = useAudienceNavigate();
  const { isPanitia } = useAudience();
  // Kalau bukan panitia, audience selalu dikunci ke "peserta"
  const [audience, setAudience] = useState(isPanitia ? "peserta" : "peserta");
  const effectiveAudience = isPanitia ? audience : "peserta";
  const [activeId, setActiveId] = useState(() => {
    return paramId && competitions.some((c) => c.id === paramId)
      ? paramId
      : competitions[0].id;
  });
  const [stickyOn, setStickyOn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pickerRef = useRef(null);
  const detailTopRef = useRef(null);

  // Sync activeId when URL param changes (e.g. browser back/forward)
  useEffect(() => {
    if (paramId && competitions.some((c) => c.id === paramId)) {
      setActiveId(paramId);
    }
  }, [paramId]);

  const active = useMemo(
    () => competitions.find((c) => c.id === activeId) || competitions[0],
    [activeId],
  );
  const t = tone[active.tone] || tone.red;
  const role = effectiveAudience === "peserta" ? active.forPeserta : active.forPanitia;

  // Sticky only when branch chips are fully out of the viewport
  useEffect(() => {
    const el = pickerRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        // intersectionRatio === 0 → tidak kelihatan sama sekali
        const fullyHidden =
          !entry.isIntersecting && entry.intersectionRatio === 0;
        setStickyOn(fullyHidden);
        if (!fullyHidden) setMenuOpen(false);
      },
      { root: null, threshold: [0, 0.01, 0.1], rootMargin: "0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const selectBranch = (id) => {
    setActiveId(id);
    setMenuOpen(false);
    // Update URL to /lomba/:id for shareability
    navigate('/lomba/' + id, { replace: true });
    requestAnimationFrame(() => {
      detailTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <StickyBranchBar
        open={stickyOn}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        active={active}
        activeId={activeId}
        onSelect={selectBranch}
      />

      <section className="surface-card px-4 py-5 sm:px-7 sm:py-7">
        <p className="section-kicker">Panduan lomba</p>
        <h2 className="mt-2 font-heading text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Tiga lomba tahun ini
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          {isPanitia ? (
            <>
              Pilih cabang di bawah. Beralih antara mode <span className="font-semibold text-slate-800">Peserta</span>{' '}
              untuk aturan bermain, atau{' '}
              <span className="font-semibold text-slate-800">Panitia</span> untuk peralatan, sesi, dan format putra/putri.
            </>
          ) : (
            <>Pilih cabang lomba di bawah untuk melihat aturan dan alur bermain.</>
          )}
        </p>
      </section>

      {/* Original branch picker — observed for sticky */}
      <section ref={pickerRef} className="space-y-2">
        <p className="px-1 text-xs font-bold uppercase tracking-wide text-slate-400">
          Pilih cabang
        </p>
        <BranchChips activeId={activeId} onSelect={selectBranch} />
      </section>

      <div ref={detailTopRef} className="scroll-mt-36 sm:scroll-mt-40" />

      <article className={`surface-card overflow-hidden border ${t.border}`}>
        <div className="relative min-h-[150px] overflow-hidden sm:min-h-[200px]">
          <img
            src={assets.lomba[active.imageKey]}
            alt={active.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            className={`absolute inset-0 bg-gradient-to-t ${t.head} opacity-85`}
          />
          <div className="relative flex h-full min-h-[150px] flex-col justify-end gap-2 px-4 py-5 text-white sm:min-h-[200px] sm:px-7 sm:py-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur">
                Lomba {active.number}
              </span>
              <span className="rounded-full bg-black/20 px-2.5 py-0.5 text-[10px] font-semibold backdrop-blur">
                {active.category}
              </span>
            </div>
            <h3 className="font-heading text-xl font-extrabold leading-tight sm:text-3xl">
              {active.title}
            </h3>
            <p className="max-w-3xl text-sm leading-relaxed text-white/90">
              {active.summary}
            </p>
          </div>
        </div>

        <div className="space-y-6 px-4 py-5 sm:px-7 sm:py-7">
          {active.rooms?.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                Ruangan yang dinilai
              </p>
              <p className="mb-3 text-xs text-slate-500">
                Dekor dan penilaian 5R untuk {active.rooms.length} ruangan.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {active.rooms.map((room) => (
                  <div
                    key={room.id}
                    className="flex h-full min-h-[3.25rem] items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5"
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${t.soft}`}
                    >
                      <i className={`fa-solid ${room.icon} text-sm`} />
                    </span>
                    <span className="text-xs font-bold leading-snug text-slate-800">
                      {room.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="section-kicker">Alur main</p>
            <h4 className="mt-1 font-heading text-lg font-extrabold text-slate-900">
              Dari start sampai akhir
            </h4>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500 sm:text-sm">
              Tahapan alur pelaksanaan lomba dari awal hingga penentuan pemenang.
            </p>

            <div className="mt-4">
              <WorkflowMobile steps={active.workflow} t={t} />
              <WorkflowDesktop steps={active.workflow} t={t} />
            </div>
          </div>

          {/* Audience toggle — hanya tampil di mode panitia */}
          {isPanitia && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                Tampilkan untuk
              </p>
              <div className="rounded-2xl border border-slate-200 bg-slate-100 p-1.5">
                <div className="grid grid-cols-2 gap-1.5">
                {[
                  {
                    id: "peserta",
                    label: "Peserta",
                    sub: "Aturan bermain",
                    icon: "fa-user",
                    activeClass:
                      "bg-emerald-600 text-white shadow-md shadow-emerald-600/25",
                  },
                  {
                    id: "panitia",
                    label: "Panitia",
                    sub: "Peralatan & sesi",
                    icon: "fa-clipboard-list",
                    activeClass:
                      "bg-sky-600 text-white shadow-md shadow-sky-600/25",
                  },
                ].map((opt) => {
                  const on = audience === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAudience(opt.id)}
                      className={`rounded-xl px-3 py-3 text-left transition ${
                        on
                          ? opt.activeClass
                          : "bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <i className={`fa-solid ${opt.icon} text-sm`} />
                        <span className="text-sm font-bold">{opt.label}</span>
                      </div>
                      <p
                        className={`mt-1 text-[10px] font-medium ${on ? "text-white/80" : "text-slate-400"}`}
                      >
                        {opt.sub}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          )}

          <div
            className={`rounded-3xl border p-4 sm:p-5 ${
              effectiveAudience === "peserta"
                ? "border-emerald-200 bg-gradient-to-br from-emerald-50/90 to-white"
                : "border-sky-200 bg-gradient-to-br from-sky-50/90 to-white"
            }`}
          >
            <div className="mb-4 flex items-center gap-2">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-white ${
                  effectiveAudience === "peserta" ? "bg-emerald-600" : "bg-sky-600"
                }`}
              >
                <i
                  className={`fa-solid ${
                    effectiveAudience === "peserta" ? "fa-user-check" : "fa-user-gear"
                  }`}
                />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Panduan {effectiveAudience}
                </p>
                <h4 className="text-base font-extrabold text-slate-900">
                  {role.headline}
                </h4>
              </div>
            </div>

            <div className="grid auto-rows-fr gap-2.5 sm:grid-cols-2">
              {role.points.map((p) => (
                <div
                  key={p.title}
                  className="flex h-full flex-col rounded-2xl border border-white/80 bg-white/90 px-3.5 py-3 shadow-sm"
                >
                  <p className="text-sm font-bold text-slate-900">{p.title}</p>
                  <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-600">
                    {p.text}
                  </p>
                </div>
              ))}
            </div>

            {role.tips?.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Tips
                </p>
                <div className="flex flex-wrap gap-2">
                  {role.tips.map((tip) => (
                    <span
                      key={tip}
                      className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 ring-1 ring-amber-100"
                    >
                      {tip}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {role.tools?.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Perlengkapan
                </p>
                <div className="flex flex-wrap gap-2">
                  {role.tools.map((tool) => (
                    <span
                      key={tool}
                      className="rounded-xl bg-sky-100 px-3 py-1.5 text-xs font-semibold text-sky-900"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {role.checklist?.length > 0 && (
              <div className="mt-4 rounded-2xl border border-sky-100 bg-white/80 p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Checklist panitia
                </p>
                <ul className="space-y-1.5">
                  {role.checklist.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2 text-xs text-slate-600"
                    >
                      <i className="fa-solid fa-square-check mt-0.5 text-sky-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(role.putra || role.putri) && (
              <div className="mt-4 grid auto-rows-fr gap-2.5 sm:grid-cols-2">
                {role.putra && (
                  <div className="flex h-full flex-col rounded-2xl border border-sky-100 bg-white/90 p-3">
                    <p className="mb-1.5 text-xs font-bold text-sky-700">
                      <i className="fa-solid fa-mars mr-1" /> Format Putra
                    </p>
                    <ul className="space-y-1 text-xs text-slate-600">
                      {role.putra.map((x) => (
                        <li key={x}>• {x}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {role.putri && (
                  <div className="flex h-full flex-col rounded-2xl border border-pink-100 bg-white/90 p-3">
                    <p className="mb-1.5 text-xs font-bold text-pink-600">
                      <i className="fa-solid fa-venus mr-1" /> Format Putri
                    </p>
                    <ul className="space-y-1 text-xs text-slate-600">
                      {role.putri.map((x) => (
                        <li key={x}>• {x}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </article>

    </div>
  );
}
