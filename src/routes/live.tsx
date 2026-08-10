/**
 * Unified Live Score & Bagan Pertandingan — Halaman Publik Terpadu.
 * Menggabungkan skor penilaian dekorasi/5R dan skema bagan pertandingan lapangan.
 */

import { createFileRoute } from '@tanstack/react-router';
import { Sparkles, Trophy, Users, Workflow } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import { ScoreBoard } from '../components/5r/ScoreBoard';
import { BracketTree } from '../components/bagan/BracketTree';
import { LiveScoreSkeleton } from '../components/ui/skeletons';
import { getDeadline, getForms, getRooms, getSubmissions } from '../server/functions/5r';
import { getBaganCompetitions, getBracket } from '../server/functions/bracket';

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
        }))
      )
    );
    const details: Record<string, Awaited<ReturnType<typeof getBracket>>> = {};
    for (const e of entries) details[e.key] = e.detail;

    return { rooms, forms, submissions, deadline: dl.deadline, comps, details };
  },
  component: UnifiedLivePage,
  pendingComponent: LiveScoreSkeleton,
});

function UnifiedLivePage() {
  const { rooms, forms, submissions, deadline, comps, details } = Route.useLoaderData();
  const { tab = '5r', comp: compSearch } = Route.useSearch();
  const navigate = Route.useNavigate();

  const [activeCompId, setActiveCompId] = useState<number | null>(
    compSearch ?? comps[0]?.id ?? null
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

  const selectedComp = comps.find((c) => c.id === activeCompId) ?? comps[0];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Festive Hero Banner Header */}
      <section className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-rose-50/80 via-white to-rose-50/40 p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100/90 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-brand-red">
            <Trophy size={12} />
            HASIL PERLOMBAAN
          </span>
          <span className="h-0.5 w-6 bg-slate-300 rounded-full hidden sm:inline-block" />
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900">
          Live Score &amp; Bagan Pertandingan
        </h1>
        <p className="mt-2 max-w-2xl text-xs sm:text-sm leading-relaxed text-slate-600">
          Pantau akumulasi nilai Budaya 5R &amp; Dekorasi Ruangan secara transparan, serta skema
          alur gugur pertandingan lapangan.
        </p>
      </section>

      {/* Main Tab Switcher (Matching Landing Page Style) */}
      <div className="flex gap-1.5 rounded-2xl border border-slate-200/90 bg-slate-100/90 p-1.5 shadow-inner">
        <button
          type="button"
          onClick={() => handleTabChange('5r')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 px-3 text-xs sm:text-sm font-extrabold transition-all cursor-pointer active:scale-95 ${
            tab === '5r'
              ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <Sparkles size={14} className="text-amber-500" />
          <span>Dekorasi &amp; Budaya 5R</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('bagan')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 px-3 text-xs sm:text-sm font-extrabold transition-all cursor-pointer active:scale-95 ${
            tab === 'bagan'
              ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <Workflow size={14} className="text-brand-red" />
          <span>Bagan Pertandingan</span>
        </button>
      </div>

      {/* Tab 1: Dekorasi & 5R */}
      {tab === '5r' && (
        <div className="space-y-6">
          <ScoreBoard
            submissions={submissions}
            rooms={rooms}
            forms={forms}
            deadline={deadline}
            mode="live"
          />
        </div>
      )}

      {/* Tab 2: Bagan Pertandingan */}
      {tab === 'bagan' && (
        <div className="space-y-6">
          {!comps.length ? (
            <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center bg-white shadow-xs">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Trophy size={26} />
              </div>
              <h3 className="mt-4 font-heading text-lg font-black text-slate-900">
                Bagan belum tersedia
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                Panitia sedang menyusun bagan pertandingan. Silakan cek kembali saat perlombaan
                dimulai.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Competition Selector Pills */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar rounded-2xl border border-slate-200/90 bg-white p-2 shadow-2xs">
                {comps.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveCompId(c.id)}
                    className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-extrabold transition cursor-pointer active:scale-95 ${
                      selectedComp?.id === c.id
                        ? 'bg-brand-red text-white shadow-md shadow-red-600/25'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {c.title}
                  </button>
                ))}
              </div>

              {/* Putra & Putri Bracket Cards */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {(['putra', 'putri'] as const).map((k) => {
                  const detail = selectedComp ? details[`${selectedComp.id}:${k}`] : null;
                  const isPutra = k === 'putra';

                  return (
                    <section
                      key={k}
                      className="rounded-3xl border border-slate-200/90 bg-white shadow-sm overflow-hidden"
                    >
                      <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-4 bg-slate-50/80">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-xl font-black text-xs ${
                              isPutra ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                            }`}
                          >
                            {isPutra ? 'P' : 'W'}
                          </span>
                          <h3 className="font-heading text-sm font-black uppercase tracking-wider text-slate-900">
                            Kategori {isPutra ? 'Putra' : 'Putri'}
                          </h3>
                        </div>
                        <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-extrabold text-slate-600 border border-slate-200/80 shadow-2xs">
                          {detail
                            ? `${detail.bracket.participantCount} peserta`
                            : 'Belum ada bagan'}
                        </span>
                      </header>

                      <div className="p-4 sm:p-5">
                        {!detail ? (
                          <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-dashed border-slate-200 py-10 text-center">
                            <Users size={22} className="text-slate-300" />
                            <p className="text-xs font-semibold text-slate-500">
                              Bagan belum disusun untuk kategori ini.
                            </p>
                          </div>
                        ) : (
                          <BracketTree detail={detail} prizes={[]} />
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
