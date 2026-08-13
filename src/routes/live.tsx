/**
 * Unified Live Score & Bagan Pertandingan — Halaman Publik Terpadu.
 * Menggabungkan skor penilaian dekorasi/5R dan skema bagan pertandingan lapangan.
 * Live update: loader utk SSR first-paint + React Query refetchInterval 10s
 * (useSubmissions/useBracket/useHeatBracket) — skor berubah tanpa refresh manual.
 * Sepenuhnya responsif & mendukung tema gelap/terang.
 */

import { createFileRoute } from '@tanstack/react-router';
import {
  CircleDot,
  Clock,
  Droplets,
  Flame,
  Layers,
  Radio,
  Sparkles,
  Trophy,
  Users,
  Utensils,
  Wind,
  Workflow,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { UnifiedLiveSkeleton } from '~/components/loading/skeletons';
import { fadeVariants, motionTransition } from '~/lib/motion';
import { ScoreBoard } from '../components/5r/ScoreBoard';
import { BracketTree } from '../components/bagan/BracketTree';
import { HeatPipelineTree } from '../components/bagan/HeatPipelineTree';
import { useBracket, useHeatBracket, useSubmissions } from '../lib/queries';
import { getDeadline, getForms, getRooms, getSubmissions } from '../server/functions/5r';
import { getBaganCompetitions, getBracket, getPrizes } from '../server/functions/bracket';
import { getHeatBracket } from '../server/functions/bracket-heat';

function getCompIcon(title: string, slug?: string) {
  const t = `${title} ${slug || ''}`.toLowerCase();
  if (t.includes('air') || t.includes('gelas') || t.includes('bocor') || t.includes('water')) {
    return Droplets;
  }
  if (t.includes('balon') || t.includes('balloon')) {
    return CircleDot;
  }
  if (t.includes('makan') || t.includes('kerupuk')) {
    return Utensils;
  }
  if (t.includes('tarik') || t.includes('tambang')) {
    return Flame;
  }
  return Trophy;
}

const searchSchema = z.object({
  tab: z.enum(['5r', 'bagan']).optional(),
  comp: z.number().optional(),
});

export const Route = createFileRoute('/live')({
  validateSearch: searchSchema,
  loader: async () => {
    const [rooms, forms, submissions, dl, comps] = await Promise.all([
      getRooms(),
      getForms(),
      getSubmissions(),
      getDeadline(),
      getBaganCompetitions(),
    ]);

    const entries = await Promise.all(
      comps.flatMap((c) =>
        (['putra', 'putri'] as const).map(async (k) => ({
          key: `${c.id}:${k}`,
          detail: await getBracket({ data: { competitionId: c.id, kategori: k } }),
          heatDetail: await getHeatBracket({ data: { competitionId: c.id, kategori: k } }),
          prizes: await getPrizes({ data: { competitionId: c.id, kategori: k } }),
        }))
      )
    );
    const details: Record<string, Awaited<ReturnType<typeof getBracket>>> = {};
    const heatDetails: Record<string, Awaited<ReturnType<typeof getHeatBracket>>> = {};
    const prizes: Record<string, Awaited<ReturnType<typeof getPrizes>>> = {};
    for (const e of entries) {
      details[e.key] = e.detail;
      heatDetails[e.key] = e.heatDetail;
      prizes[e.key] = e.prizes;
    }

    return { rooms, forms, submissions, deadline: dl.deadline, comps, details, heatDetails, prizes };
  },
  component: UnifiedLivePage,
  pendingComponent: UnifiedLiveSkeleton,
});

function UnifiedLivePage() {
  const loader = Route.useLoaderData();
  const search = Route.useSearch();
  const tab = search.tab ?? '5r';
  const navigate = Route.useNavigate();

  // Hari puncak perlombaan (13 Agustus) → default buka tab Bagan Pertandingan
  // agar publik langsung bisa memantau bagan. Berlaku hanya saat URL tidak
  // menyetel tab eksplisit; hari lain kembali default tab 5R.
  // Dihitung client-side (useEffect) supaya tidak mismatch hydration SSR.
  const [isPuncakDay, setIsPuncakDay] = useState(false);
  useEffect(() => {
    const now = new Date();
    setIsPuncakDay(now.getDate() === 13 && now.getMonth() === 7);
  }, []);
  const effectiveTab: '5r' | 'bagan' = isPuncakDay && search.tab === undefined ? 'bagan' : tab;

  // initialData dari loader ➔ first-paint SSR instan, refetchInterval 10s
  // mengambil alih setelah hydrate (polling aktif selama halaman terbuka).
  const { data: submissions = [] } = useSubmissions(loader.submissions);

  const [activeCompId, setActiveCompId] = useState<number | null>(
    search.comp ?? loader.comps[0]?.id ?? null
  );

  const handleTabChange = (newTab: '5r' | 'bagan') => {
    navigate({
      search: (prev) => ({
        ...prev,
        tab: newTab,
      }),
      replace: true,
    });
  };

  const selectedComp = loader.comps.find((c) => c.id === activeCompId) ?? loader.comps[0];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ─── Festive Hero Banner Header ─── */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-rose-500/10 via-card to-card p-6 sm:p-8 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-red/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-brand-red border border-brand-red/20">
            <Trophy size={12} />
            HASIL PERLOMBAAN &amp; BAGAN
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            LIVE AUTO-REFRESH
          </span>
        </div>

        <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
          Live Score &amp; Bagan Pertandingan
        </h1>
        <p className="mt-2 max-w-2xl text-xs sm:text-sm leading-relaxed text-muted-foreground">
          Pantau akumulasi nilai Budaya 5R &amp; Dekorasi Ruangan secara transparan, serta skema
          alur pertandingan perlombaan lapangan HUT RI ke-81. Data diperbarui otomatis secara
          real-time.
        </p>
      </section>

      {/* ─── Main Tab Switcher ─── */}
      <div className="relative flex gap-1.5 rounded-2xl border border-border bg-muted/40 p-1.5 shadow-inner">
        <button
          type="button"
          onClick={() => handleTabChange('5r')}
          className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl py-3 px-3 text-xs sm:text-sm font-extrabold transition-colors cursor-pointer z-10 ${
            effectiveTab === '5r'
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {effectiveTab === '5r' && (
            <motion.div
              layoutId="live-tab-active-indicator"
              transition={motionTransition.springSmooth}
              className="absolute inset-0 rounded-xl bg-card shadow-sm ring-1 ring-border"
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            <Sparkles size={15} className="text-amber-500" />
            <span>Dekorasi &amp; Budaya 5R</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('bagan')}
          className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl py-3 px-3 text-xs sm:text-sm font-extrabold transition-colors cursor-pointer z-10 ${
            effectiveTab === 'bagan'
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {effectiveTab === 'bagan' && (
            <motion.div
              layoutId="live-tab-active-indicator"
              transition={motionTransition.springSmooth}
              className="absolute inset-0 rounded-xl bg-card shadow-sm ring-1 ring-border"
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            <Workflow size={15} className="text-brand-red" />
            <span>Bagan Pertandingan</span>
          </span>
        </button>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {/* ─── Tab 1: Dekorasi & 5R ─── */}
        {effectiveTab === '5r' && (
          <motion.div
            key="tab-5r"
            variants={fadeVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-6"
          >
            <ScoreBoard
              submissions={submissions}
              rooms={loader.rooms}
              forms={loader.forms}
              deadline={loader.deadline}
              mode="live"
            />
          </motion.div>
        )}

        {/* ─── Tab 2: Bagan Pertandingan ─── */}
        {effectiveTab === 'bagan' && (
          <motion.div
            key="tab-bagan"
            variants={fadeVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-6"
          >
            {!loader.comps.length ? (
              <BracketDraftOrEmptyState />
            ) : (
              <div className="space-y-5">
                {/* Competition Selector Pills (Fullwidth & Distinct Icons) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-2 shadow-2xs w-full">
                  {loader.comps.map((c) => {
                    const isSelected = selectedComp?.id === c.id;
                    const CompIcon = getCompIcon(c.title, c.slug);

                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setActiveCompId(c.id)}
                        className={`relative flex flex-1 items-center justify-center gap-2.5 rounded-xl px-4 py-3 text-xs sm:text-sm font-black transition-colors cursor-pointer w-full text-center ${
                          isSelected
                            ? 'text-white'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {isSelected && (
                          <motion.div
                            layoutId="live-comp-active-pill"
                            transition={motionTransition.springSmooth}
                            className="absolute inset-0 rounded-xl bg-brand-red shadow-md shadow-red-600/25"
                          />
                        )}
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          <CompIcon
                            size={16}
                            className={isSelected ? 'text-white' : 'text-brand-red'}
                          />
                          <span className="truncate">{c.title}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Putra & Putri Bracket Cards (Putra Atas, Putri Bawah - Fullwidth) */}
                <div className="flex flex-col gap-8 w-full">
                  {selectedComp &&
                    (['putra', 'putri'] as const).map((k) => (
                      <BracketCard
                        key={`${selectedComp.id}:${k}`}
                        comp={selectedComp}
                        kategori={k}
                        initialDetail={loader.details[`${selectedComp.id}:${k}`]}
                        initialHeatDetail={loader.heatDetails[`${selectedComp.id}:${k}`]}
                        initialPrizes={loader.prizes[`${selectedComp.id}:${k}`]}
                      />
                    ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BracketDraftOrEmptyState({
  categoryTitle,
  isDraft = false,
}: {
  categoryTitle?: string;
  isDraft?: boolean;
}) {
  if (isDraft) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-dashed border-amber-500/30 bg-amber-500/[0.03] dark:bg-amber-500/[0.05] p-8 sm:p-12 text-center my-2">
        {/* Animated Status Icon */}
        <div className="relative mx-auto mb-3.5 flex size-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30 shadow-xs">
          <Clock size={28} className="animate-pulse" />
          <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-amber-500 text-white text-[10px] ring-2 ring-card shadow-xs">
            <Sparkles size={11} />
          </span>
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px] font-black uppercase tracking-wider mb-2 border border-amber-500/30">
          <span className="size-2 rounded-full bg-amber-500 animate-ping" />
          <span>Sedang Disusun Panitia</span>
        </div>

        {/* Title & Description */}
        <h4 className="text-base sm:text-lg font-black text-foreground mb-1.5 font-heading">
          {categoryTitle
            ? `Bagan Kategori ${categoryTitle} Sedang Disusun`
            : 'Bagan Pertandingan Sedang Disusun'}
        </h4>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          Panitia sedang melakukan pengundian sesi dan verifikasi peserta. Bagan resmi akan segera diumumkan.
        </p>
      </div>
    );
  }

  // State: Belum Dibuat / Belum Ada Bagan
  return (
    <div className="relative overflow-hidden rounded-3xl border border-dashed border-border bg-muted/20 p-8 sm:p-12 text-center my-2">
      {/* Status Icon */}
      <div className="relative mx-auto mb-3.5 flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground/80 ring-1 ring-border shadow-xs">
        <Layers size={26} />
      </div>

      {/* Status Badge */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground text-[11px] font-black uppercase tracking-wider mb-2 border border-border">
        <span>Belum Tersedia</span>
      </div>

      {/* Title & Description */}
      <h4 className="text-base sm:text-lg font-black text-foreground mb-1.5 font-heading">
        {categoryTitle
          ? `Bagan Kategori ${categoryTitle} Belum Dibuat`
          : 'Bagan Pertandingan Belum Tersedia'}
      </h4>
      <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
        Bagan pertandingan untuk kategori ini belum dijadwalkan oleh panitia.
      </p>
    </div>
  );
}

function BracketCard({
  comp,
  kategori,
  initialDetail,
  initialHeatDetail,
  initialPrizes,
}: {
  comp: { id: number; title: string };
  kategori: 'putra' | 'putri';
  initialDetail?: Awaited<ReturnType<typeof getBracket>>;
  initialHeatDetail?: Awaited<ReturnType<typeof getHeatBracket>>;
  initialPrizes?: Awaited<ReturnType<typeof getPrizes>>;
}) {
  const { data: detail } = useBracket(comp.id, kategori, initialDetail);
  const { data: heatDetail } = useHeatBracket(comp.id, kategori, initialHeatDetail);
  const prizes = initialPrizes ?? [];
  const isPutra = kategori === 'putra';
  const isHeat = !!heatDetail;
  // Publik tidak boleh melihat undian/struktur DRAFT — sembunyikan sampai panitia publish.
  const isDraftHeat = isHeat && heatDetail?.bracket.status === 'DRAFT';
  const isDraftSe = !isHeat && !!detail && detail.bracket.status === 'DRAFT';

  return (
    <section className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden flex flex-col w-full">
      {/* Header Kategori */}
      <header
        className={`flex items-center justify-between gap-2 border-b border-border px-5 py-4 ${
          isPutra ? 'bg-blue-500/5 dark:bg-blue-500/10' : 'bg-rose-500/5 dark:bg-rose-500/10'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-xl font-black text-xs ${
              isPutra
                ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30'
                : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
            }`}
          >
            {isPutra ? 'PA' : 'PI'}
          </span>
          <div>
            <h3 className="font-heading text-sm font-black uppercase tracking-wider text-foreground">
              Kategori {isPutra ? 'Putra' : 'Putri'}
            </h3>
            <p className="text-[10px] text-muted-foreground font-bold">
              {isHeat ? 'Format Sistem Sesi (Heat)' : 'Format Single Elimination'}
            </p>
          </div>
        </div>

        <span className="rounded-full bg-card px-3 py-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground border border-border shadow-2xs">
          {isHeat
            ? `${heatDetail?.bracket.participantCount ?? 0} Tim`
            : detail
              ? `${detail.bracket.participantCount} Tim`
              : 'Belum Ada Bagan'}
        </span>
      </header>

      {/* Konten Bagan — Pure Bagan Horizontal Fullwidth */}
      <div className="p-4 sm:p-5 min-w-0 max-w-full flex-1 overflow-x-auto">
        {isDraftHeat || isDraftSe ? (
          <BracketDraftOrEmptyState
            categoryTitle={isPutra ? 'Putra' : 'Putri'}
            isDraft={true}
          />
        ) : isHeat ? (
          heatDetail ? (
            <HeatPipelineTree detail={heatDetail} teams={heatDetail.teams} prizes={prizes} />
          ) : (
            <BracketDraftOrEmptyState
              categoryTitle={isPutra ? 'Putra' : 'Putri'}
              isDraft={false}
            />
          )
        ) : !detail ? (
          <BracketDraftOrEmptyState
            categoryTitle={isPutra ? 'Putra' : 'Putri'}
            isDraft={false}
          />
        ) : (
          <BracketTree detail={detail} prizes={prizes} />
        )}
      </div>
    </section>
  );
}
