/**
 * Unified Live Score & Bagan Pertandingan — Halaman Publik Terpadu.
 * Menggabungkan skor penilaian dekorasi/5R dan skema bagan pertandingan lapangan.
 * Live update: loader utk SSR first-paint + React Query refetchInterval 10s
 * (useSubmissions/useBracket/useHeatBracket) — skor berubah tanpa refresh manual.
 * Sepenuhnya responsif & mendukung tema gelap/terang.
 */

import { createFileRoute } from '@tanstack/react-router';
import { Layers, Radio, Sparkles, Trophy, Users, Workflow } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { UnifiedLiveSkeleton } from '~/components/loading/skeletons';
import { ScoreBoard } from '../components/5r/ScoreBoard';
import { BracketTree } from '../components/bagan/BracketTree';
import { HeatPublicView } from '../components/bagan/HeatPublicView';
import { useBracket, useHeatBracket, useSubmissions } from '../lib/queries';
import { getDeadline, getForms, getRooms, getSubmissions } from '../server/functions/5r';
import { getBaganCompetitions, getBracket } from '../server/functions/bracket';
import { getHeatBracket } from '../server/functions/bracket-heat';

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
        }))
      )
    );
    const details: Record<string, Awaited<ReturnType<typeof getBracket>>> = {};
    const heatDetails: Record<string, Awaited<ReturnType<typeof getHeatBracket>>> = {};
    for (const e of entries) {
      details[e.key] = e.detail;
      heatDetails[e.key] = e.heatDetail;
    }

    return { rooms, forms, submissions, deadline: dl.deadline, comps, details, heatDetails };
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
      <div className="flex gap-1.5 rounded-2xl border border-border bg-muted/40 p-1.5 shadow-inner">
        <button
          type="button"
          onClick={() => handleTabChange('5r')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 px-3 text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
            effectiveTab === '5r'
              ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
              : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          }`}
        >
          <Sparkles size={15} className="text-amber-500" />
          <span>Dekorasi &amp; Budaya 5R</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('bagan')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 px-3 text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
            effectiveTab === 'bagan'
              ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
              : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          }`}
        >
          <Workflow size={15} className="text-brand-red" />
          <span>Bagan Pertandingan</span>
        </button>
      </div>

      {/* ─── Tab 1: Dekorasi & 5R ─── */}
      {effectiveTab === '5r' && (
        <div className="space-y-6">
          <ScoreBoard
            submissions={submissions}
            rooms={loader.rooms}
            forms={loader.forms}
            deadline={loader.deadline}
            mode="live"
          />
        </div>
      )}

      {/* ─── Tab 2: Bagan Pertandingan ─── */}
      {effectiveTab === 'bagan' && (
        <div className="space-y-6">
          {!loader.comps.length ? (
            <div className="rounded-3xl border border-dashed border-border p-12 text-center bg-card shadow-xs">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Trophy size={26} />
              </div>
              <h3 className="mt-4 font-heading text-lg font-black text-foreground">
                Bagan Belum Tersedia
              </h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                Panitia sedang menyusun bagan pertandingan. Silakan cek kembali saat perlombaan
                dimulai.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Competition Selector Pills */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar rounded-2xl border border-border bg-card p-2 shadow-2xs">
                {loader.comps.map((c) => {
                  const isSelected = selectedComp?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActiveCompId(c.id)}
                      className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition cursor-pointer ${
                        isSelected
                          ? 'bg-brand-red text-white shadow-md shadow-red-600/25'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Layers size={13} />
                      <span>{c.title}</span>
                    </button>
                  );
                })}
              </div>

              {/* Putra & Putri Bracket Cards */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {selectedComp &&
                  (['putra', 'putri'] as const).map((k) => (
                    <BracketCard
                      key={`${selectedComp.id}:${k}`}
                      comp={selectedComp}
                      kategori={k}
                      initialDetail={loader.details[`${selectedComp.id}:${k}`]}
                      initialHeatDetail={loader.heatDetails[`${selectedComp.id}:${k}`]}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BracketCard({
  comp,
  kategori,
  initialDetail,
  initialHeatDetail,
}: {
  comp: { id: number; title: string };
  kategori: 'putra' | 'putri';
  initialDetail?: Awaited<ReturnType<typeof getBracket>>;
  initialHeatDetail?: Awaited<ReturnType<typeof getHeatBracket>>;
}) {
  const { data: detail } = useBracket(comp.id, kategori, initialDetail);
  const { data: heatDetail } = useHeatBracket(comp.id, kategori, initialHeatDetail);
  const isPutra = kategori === 'putra';
  const isHeat = !!heatDetail;

  return (
    <section className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
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

      {/* Konten Bagan */}
      <div className="p-4 sm:p-5 min-w-0 max-w-full flex-1 overflow-hidden">
        {isHeat ? (
          heatDetail ? (
            <HeatPublicView detail={heatDetail} />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-border py-12 text-center">
              <Users size={24} className="text-muted-foreground/50" />
              <p className="text-xs font-bold text-muted-foreground">
                Bagan pertandingan belum disusun untuk kategori ini.
              </p>
            </div>
          )
        ) : !detail ? (
          <div className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-border py-12 text-center">
            <Users size={24} className="text-muted-foreground/50" />
            <p className="text-xs font-bold text-muted-foreground">
              Bagan pertandingan belum disusun untuk kategori ini.
            </p>
          </div>
        ) : (
          <BracketTree detail={detail} prizes={[]} />
        )}
      </div>
    </section>
  );
}
