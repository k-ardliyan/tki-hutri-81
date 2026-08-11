/**
 * ScoreBoard — papan skor lomba dekor-5r: Rekap (70/30), 5R (70%), Dekorasi (30%).
 * Dipakai: /live (publik), audit/hasil, admin/hasil.
 *
 * 5R = rerata semua audit (semua minggu); Dekorasi = rerata semua juri;
 * Rekap = 5R*0.7 + dekorasi*0.3 — hanya ruangan lengkap yang di-rank.
 */

import {
  Award,
  CheckCircle2,
  Crown,
  HelpCircle,
  Layers,
  Medal,
  Paintbrush,
  Scale,
  Sigma,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FiveRForm, FiveRRoom, FiveRSubmission } from '../../data/5r';
import { aggregateRoom, combineFinal, round1, scoreSubmission } from '../../lib/scoring';
import { Badge } from '../ui/badge';
import RoomIcon from '../ui/RoomIcon';
import { StatusBadge } from '../ui/status-badge';
import { deadlineInfo } from './DeadlineBanner';
import { Petunjuk5RModal } from './Petunjuk5RModal';

interface ScoreBoardProps {
  submissions: FiveRSubmission[];
  rooms: FiveRRoom[];
  forms: FiveRForm[];
  deadline: string | null;
  mode: 'live' | 'admin';
  showGuideButton?: boolean;
  onOpenGuide?: () => void;
}

interface RoomScore {
  id: string;
  name: string;
  pic: string;
  icon: string;
  fiveR: number; // 0-100
  fiveRCount: number;
  dekorasi: number; // 0-100
  dekorasiCount: number;
  total: number;
}

const FIVE_R_FORMS_EXCLUDED = new Set(['dekorasi']);

export function ScoreBoard({
  submissions,
  rooms,
  forms,
  deadline,
  mode,
  showGuideButton = true,
  onOpenGuide,
}: ScoreBoardProps) {
  const isLive = mode === 'live';
  // Default to rekap
  const [activeTab, setActiveTab] = useState<'rekap' | 'fiveR' | 'dekorasi'>('rekap');
  const [internalShowGuide, setInternalShowGuide] = useState(false);

  const handleOpenGuide = () => {
    if (onOpenGuide) {
      onOpenGuide();
    } else {
      setInternalShowGuide(true);
    }
  };
  const formMap = useMemo(() => new Map<string, FiveRForm>(forms.map((f) => [f.id, f])), [forms]);
  const { closed } = deadlineInfo(deadline);

  const rows = useMemo<RoomScore[]>(() => {
    return rooms.map((room) => {
      const roomSubs = submissions.filter((s) => s.roomId === room.id);
      const fiveRSubs = roomSubs.filter((s) => !FIVE_R_FORMS_EXCLUDED.has(s.formId));
      const dekorasiSubs = roomSubs.filter((s) => s.formId === 'dekorasi');
      const score = (subs: FiveRSubmission[]) =>
        aggregateRoom(
          subs
            .map((s) => {
              const form = formMap.get(s.formId);
              return form ? scoreSubmission(form, s) : null;
            })
            .filter((x): x is NonNullable<typeof x> => x !== null)
        );
      return {
        id: room.id,
        name: room.name,
        pic: room.pic,
        icon: room.icon,
        fiveR: fiveRSubs.length ? score(fiveRSubs) : 0,
        fiveRCount: fiveRSubs.length,
        dekorasi: dekorasiSubs.length ? score(dekorasiSubs) : 0,
        dekorasiCount: dekorasiSubs.length,
        total:
          fiveRSubs.length && dekorasiSubs.length
            ? combineFinal(score(fiveRSubs), score(dekorasiSubs))
            : 0,
      };
    });
  }, [rooms, submissions, formMap]);

  const fiveRRank = useMemo(
    () => [...rows].filter((r) => r.fiveRCount > 0).sort((a, b) => b.fiveR - a.fiveR),
    [rows]
  );
  const dekorasiRank = useMemo(
    () => [...rows].filter((r) => r.dekorasiCount > 0).sort((a, b) => b.dekorasi - a.dekorasi),
    [rows]
  );
  const rekapRank = useMemo(
    () =>
      [...rows]
        .filter((r) => r.fiveRCount > 0 && r.dekorasiCount > 0)
        .sort((a, b) => b.total - a.total),
    [rows]
  );
  const incomplete = useMemo(
    () => rows.filter((r) => r.fiveRCount === 0 || r.dekorasiCount === 0),
    [rows]
  );

  // Modern Vector Lucide Badges instead of emojis
  const rankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white font-black text-xs shadow-xs ring-2 ring-amber-200">
          <Crown size={14} className="mr-0.5" />
          <span>1</span>
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-400 to-slate-600 text-white font-black text-xs shadow-xs ring-2 ring-slate-200">
          <Medal size={14} className="mr-0.5" />
          <span>2</span>
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 text-white font-black text-xs shadow-xs ring-2 ring-amber-300">
          <Award size={14} className="mr-0.5" />
          <span>3</span>
        </div>
      );
    }
    return (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 font-extrabold text-xs">
        {rank}
      </div>
    );
  };

  // Top 3 Podium Cards with responsive layout
  const PodiumView = ({
    list,
    scoreKey,
    label,
  }: {
    list: RoomScore[];
    scoreKey: 'total' | 'fiveR' | 'dekorasi';
    label: string;
  }) => {
    if (list.length === 0) return null;
    const top3 = list.slice(0, 3);

    const gridClass =
      top3.length === 1
        ? 'grid-cols-1'
        : top3.length === 2
          ? 'grid-cols-1 sm:grid-cols-2'
          : 'grid-cols-1 sm:grid-cols-3';

    return (
      <div className={`grid gap-3.5 ${gridClass}`}>
        {top3.map((r, i) => {
          const rank = i + 1;
          const isFirst = rank === 1;
          const val = r[scoreKey];

          return (
            <div
              key={r.id}
              className={`relative overflow-hidden rounded-3xl p-5 transition-all ${
                isFirst
                  ? 'border-2 border-amber-400/80 bg-gradient-to-b from-amber-50/90 via-amber-50/30 to-white shadow-md shadow-amber-500/10'
                  : rank === 2
                    ? 'border border-slate-300 bg-gradient-to-b from-slate-100/80 via-slate-50/30 to-white shadow-xs'
                    : 'border border-amber-200 bg-gradient-to-b from-amber-50/70 via-amber-50/20 to-white shadow-xs'
              }`}
            >
              <div className="flex flex-col justify-between h-full space-y-4">
                {/* Header: Rank + Medal Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {rankBadge(rank)}
                    <span className="text-xs font-black uppercase tracking-wider text-slate-600">
                      {rank === 1 ? 'Juara 1' : rank === 2 ? 'Juara 2' : 'Juara 3'}
                    </span>
                  </div>
                  {isFirst && (
                    <div className="flex items-center gap-1 rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-extrabold text-amber-900">
                      <Sparkles size={11} />
                      <span>Teratas</span>
                    </div>
                  )}
                </div>

                {/* Room Name */}
                <div className="space-y-1">
                  <h4 className="font-heading font-black text-slate-900 text-base sm:text-lg leading-snug break-words">
                    {r.name}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    PIC: <span className="text-slate-700 font-bold">{r.pic}</span>
                  </p>
                </div>

                {/* Score Footer */}
                <div className="flex items-end justify-between pt-3 border-t border-slate-100/90">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    {label}
                  </span>
                  <div className="text-right">
                    <span className="font-heading text-2xl sm:text-3xl font-black text-slate-900 leading-none">
                      {round1(val)}
                    </span>
                    <span className="text-xs text-slate-500 font-bold ml-1">/ 100</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Sub-Tab Navigation Switcher (Clean, no redundant header) */}
      <div className="grid grid-cols-3 gap-1 rounded-2xl border border-border/80 bg-muted/60 p-1 shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab('rekap')}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-bold transition cursor-pointer active:scale-95 ${
            activeTab === 'rekap'
              ? 'bg-card text-foreground shadow-xs font-extrabold ring-1 ring-border/60'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sigma size={14} className="text-brand-red" />
          <span>Rekap (70/30)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('fiveR')}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-bold transition cursor-pointer active:scale-95 ${
            activeTab === 'fiveR'
              ? 'bg-card text-foreground shadow-xs font-extrabold ring-1 ring-border/60'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Trophy size={14} className="text-amber-500" />
          <span>Budaya 5R</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dekorasi')}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-bold transition cursor-pointer active:scale-95 ${
            activeTab === 'dekorasi'
              ? 'bg-card text-foreground shadow-xs font-extrabold ring-1 ring-border/60'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Paintbrush size={14} className="text-sky-600" />
          <span>Dekorasi</span>
        </button>
      </div>

      {/* Content: Rekap Gabungan 70/30 */}
      {activeTab === 'rekap' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-2xl border border-rose-200/80 bg-rose-50/50 px-4 py-3 text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-red/10 text-brand-red">
                <Scale size={15} />
              </div>
              <span>
                Formula Nilai Akhir: <strong className="text-slate-900">70% Budaya 5R</strong> +{' '}
                <strong className="text-slate-900">30% Lomba Dekorasi</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              <Badge
                variant="outline"
                className={`text-[10px] font-extrabold px-2 py-0.5 ${
                  closed
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-rose-100/80 text-brand-red border-rose-200'
                }`}
              >
                {closed ? 'Skor Final' : 'Skor Sementara'}
              </Badge>
              <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-extrabold text-slate-600 border border-slate-200 shadow-2xs">
                {rekapRank.length} Ruangan Lengkap
              </span>
              {showGuideButton && (
                <button
                  type="button"
                  onClick={handleOpenGuide}
                  className="text-[11px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-1 ml-1"
                >
                  <HelpCircle size={12} />
                  <span>Panduan</span>
                </button>
              )}
            </div>
          </div>

          <PodiumView list={rekapRank} scoreKey="total" label="Skor Total" />

          {rekapRank.length > 0 ? (
            <div className="rounded-3xl border border-slate-200/80 bg-white shadow-sm divide-y divide-slate-100 overflow-hidden">
              {rekapRank.map((r, i) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-rose-50/30 transition-colors"
                >
                  {rankBadge(i + 1)}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <RoomIcon name={r.icon} size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-heading font-black text-slate-900 text-sm">
                        {r.name}
                      </p>
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">PIC: {r.pic}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 font-medium">
                      5R <span className="font-extrabold text-slate-800">{round1(r.fiveR)}</span> ·
                      Dek{' '}
                      <span className="font-extrabold text-slate-800">{round1(r.dekorasi)}</span>
                    </div>
                    <div className="mt-1">
                      <StatusBadge score={round1(r.total)} showScoreMax />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center bg-white shadow-xs">
              <p className="text-sm font-bold text-slate-700">
                Belum ada ruangan yang dinilai lengkap (5R dan Dekorasi).
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Peringkat rekap akan otomatis muncul setelah ruangan memiliki skor 5R dan Dekorasi.
              </p>
            </div>
          )}

          {/* Incomplete Rooms Warning */}
          {incomplete.length > 0 && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50/40 p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                  Belum Lengkap ({incomplete.length} Ruangan)
                </p>
                <span className="text-[11px] text-slate-500 italic">
                  Belum masuk peringkat rekap
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {incomplete.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-2xl border border-amber-200/80 bg-white p-2.5 text-xs shadow-2xs"
                  >
                    <span className="font-bold text-slate-800 truncate mr-2">{r.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {r.fiveRCount === 0 && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          5R Belum
                        </span>
                      )}
                      {r.dekorasiCount === 0 && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          Dekorasi Belum
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content: Budaya 5R */}
      {activeTab === 'fiveR' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Layers size={15} />
              </div>
              <span>Akumulasi nilai seluruh audit berkala mingguan (Bobot 70%).</span>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-extrabold text-foreground border border-border">
                {fiveRRank.length} Ruangan Dinilai
              </span>
              {showGuideButton && (
                <button
                  type="button"
                  onClick={handleOpenGuide}
                  className="text-[11px] font-bold text-primary hover:underline cursor-pointer shrink-0"
                >
                  Panduan 5R
                </button>
              )}
            </div>
          </div>

          <PodiumView list={fiveRRank} scoreKey="fiveR" label="Rata-rata 5R" />

          {fiveRRank.length > 0 ? (
            <div className="rounded-3xl border border-slate-200/80 bg-white shadow-sm divide-y divide-slate-100 overflow-hidden">
              {fiveRRank.map((r, i) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-rose-50/30 transition-colors"
                >
                  {rankBadge(i + 1)}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <RoomIcon name={r.icon} size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-heading font-black text-slate-900 text-sm">
                      {r.name}
                    </p>
                    <p className="text-xs text-slate-500 font-medium">
                      PIC: {r.pic} · {r.fiveRCount}x dinilai
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge score={round1(r.fiveR)} showScoreMax />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center bg-white shadow-xs">
              <p className="text-sm font-bold text-slate-700">
                Belum ada penilaian 5R yang tercatat.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Content: Dekorasi */}
      {activeTab === 'dekorasi' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-sky-200/80 bg-sky-50/60 px-4 py-3 text-xs text-slate-700 leading-relaxed">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                <Paintbrush size={15} />
              </div>
              <span>
                Lomba Dekorasi Ruangan dinilai 1x per juri selama periode perlombaan (Bobot 30%).
              </span>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-extrabold text-slate-600 border border-sky-200">
                {dekorasiRank.length} Ruangan Dinilai
              </span>
              {showGuideButton && (
                <button
                  type="button"
                  onClick={handleOpenGuide}
                  className="text-[11px] font-bold text-primary hover:underline cursor-pointer shrink-0"
                >
                  Kriteria Dekorasi
                </button>
              )}
            </div>
          </div>

          <PodiumView list={dekorasiRank} scoreKey="dekorasi" label="Rata-rata Dekorasi" />

          {dekorasiRank.length > 0 ? (
            <div className="rounded-3xl border border-slate-200/80 bg-white shadow-sm divide-y divide-slate-100 overflow-hidden">
              {dekorasiRank.map((r, i) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-rose-50/30 transition-colors"
                >
                  {rankBadge(i + 1)}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <RoomIcon name={r.icon} size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-heading font-black text-slate-900 text-sm">
                      {r.name}
                    </p>
                    <p className="text-xs text-slate-500 font-medium">
                      PIC: {r.pic} · {r.dekorasiCount} juri
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge score={round1(r.dekorasi)} showScoreMax />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center bg-white shadow-xs">
              <p className="text-sm font-bold text-slate-700">
                Belum ada penilaian Dekorasi Ruangan.
              </p>
            </div>
          )}
        </div>
      )}

      {!onOpenGuide && (
        <Petunjuk5RModal
          open={internalShowGuide}
          onOpenChange={setInternalShowGuide}
          variant={isLive ? 'publik' : 'audit'}
        />
      )}
    </div>
  );
}
