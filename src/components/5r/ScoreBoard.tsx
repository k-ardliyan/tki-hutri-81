/**
 * ScoreBoard — Papan Skor Terpadu Lomba Dekorasi & Budaya 5R HUT RI ke-81.
 * Didesain khusus agar mudah dipahami publik, menarik, dan informatif tanpa data teknis berlebih.
 * Menampilkan: Rekap (70% 5R + 30% Dekorasi), Budaya 5R (70%), dan Dekorasi (30%).
 */

import {
  Award,
  CheckCircle2,
  ChevronRight,
  Crown,
  HelpCircle,
  Info,
  Layers,
  Medal,
  Paintbrush,
  Scale,
  Search,
  Sigma,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import type { FiveRForm, FiveRRoom, FiveRSubmission } from '../../data/5r';
import { aggregateRoom, combineFinal, round1, scoreSubmission } from '../../lib/scoring';
import { Badge } from '../ui/badge';
import { ResponsiveDialog } from '../ui/responsive-dialog';
import { StatusBadge } from '../ui/status-badge';
import { deadlineInfo } from './DeadlineBanner';
import { Petunjuk5RModal } from './Petunjuk5RModal';
import RoomIcon from './RoomIcon';

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
  const [activeTab, setActiveTab] = useState<'rekap' | 'fiveR' | 'dekorasi'>('rekap');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomScore, setSelectedRoomScore] = useState<RoomScore | null>(null);
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

  // Filtered lists based on search
  const filteredRekap = useMemo(() => {
    if (!searchQuery.trim()) return rekapRank;
    const q = searchQuery.toLowerCase().trim();
    return rekapRank.filter(
      (r) => r.name.toLowerCase().includes(q) || r.pic.toLowerCase().includes(q)
    );
  }, [rekapRank, searchQuery]);

  const filteredFiveR = useMemo(() => {
    if (!searchQuery.trim()) return fiveRRank;
    const q = searchQuery.toLowerCase().trim();
    return fiveRRank.filter(
      (r) => r.name.toLowerCase().includes(q) || r.pic.toLowerCase().includes(q)
    );
  }, [fiveRRank, searchQuery]);

  const filteredDekorasi = useMemo(() => {
    if (!searchQuery.trim()) return dekorasiRank;
    const q = searchQuery.toLowerCase().trim();
    return dekorasiRank.filter(
      (r) => r.name.toLowerCase().includes(q) || r.pic.toLowerCase().includes(q)
    );
  }, [dekorasiRank, searchQuery]);

  // Clean, festive rank badges
  const rankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-white font-black text-xs shadow-md shadow-amber-500/25 ring-2 ring-amber-300/60">
          <Crown size={14} className="mr-0.5" />
          <span>1</span>
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600 text-white font-black text-xs shadow-md shadow-slate-500/20 ring-2 ring-slate-300/60">
          <Medal size={14} className="mr-0.5" />
          <span>2</span>
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-700 via-amber-800 to-amber-900 text-white font-black text-xs shadow-md shadow-amber-900/20 ring-2 ring-amber-600/60">
          <Award size={14} className="mr-0.5" />
          <span>3</span>
        </div>
      );
    }
    return (
      <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground font-black text-xs border border-border">
        #{rank}
      </div>
    );
  };

  // Top 3 Podium View (Clean & Exciting)
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
      <div className={`grid gap-3 sm:gap-4 ${gridClass}`}>
        {top3.map((r, i) => {
          const rank = i + 1;
          const isFirst = rank === 1;
          const val = r[scoreKey];

          return (
            <motion.button
              type="button"
              key={r.id}
              onClick={() => setSelectedRoomScore(r)}
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              whileTap={{ scale: 0.98 }}
              className={`group relative overflow-hidden rounded-3xl p-4 sm:p-5 text-left transition-all cursor-pointer ${
                isFirst
                  ? 'border-2 border-amber-400/90 bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-card shadow-md shadow-amber-500/10 dark:from-amber-500/20 dark:via-amber-950/20 dark:to-card'
                  : rank === 2
                    ? 'border border-slate-300 dark:border-slate-700 bg-gradient-to-b from-slate-400/15 via-slate-400/5 to-card shadow-xs'
                    : 'border border-amber-700/40 dark:border-amber-800/40 bg-gradient-to-b from-amber-700/15 via-amber-700/5 to-card shadow-xs'
              }`}
            >
              <div className="flex flex-col justify-between h-full space-y-3.5 relative z-10">
                {/* Rank & Title */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {rankBadge(rank)}
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground block">
                        {rank === 1 ? 'Juara 1' : rank === 2 ? 'Juara 2' : 'Juara 3'}
                      </span>
                    </div>
                  </div>
                  {isFirst && (
                    <div className="flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                      <Sparkles size={11} />
                      <span>Terdepan</span>
                    </div>
                  )}
                </div>

                {/* Room Info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                      <RoomIcon name={r.icon} size={13} />
                    </div>
                    <h4 className="font-heading font-black text-foreground text-sm sm:text-base leading-snug break-words group-hover:text-primary transition-colors">
                      {r.name}
                    </h4>
                  </div>
                  <p className="text-[11px] text-muted-foreground pl-8">
                    PIC: <span className="text-foreground font-bold">{r.pic}</span>
                  </p>
                </div>

                {/* Quick Score Split for Rekap */}
                {scoreKey === 'total' && (
                  <div className="flex items-center justify-between text-[11px] rounded-xl bg-muted/60 px-2.5 py-1.5 border border-border/50">
                    <span className="text-muted-foreground">
                      5R: <strong className="text-foreground">{round1(r.fiveR)}</strong>{' '}
                      <span className="text-[10px] opacity-75">({r.fiveRCount}x)</span>
                    </span>
                    <span className="text-muted-foreground">
                      Dekor: <strong className="text-foreground">{round1(r.dekorasi)}</strong>{' '}
                      <span className="text-[10px] opacity-75">({r.dekorasiCount} juri)</span>
                    </span>
                  </div>
                )}

                {/* Score Footer */}
                <div className="flex items-end justify-between pt-2 border-t border-border/60">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                    {scoreKey === 'fiveR'
                      ? `${r.fiveRCount}x dinilai`
                      : scoreKey === 'dekorasi'
                        ? `${r.dekorasiCount} juri`
                        : label}
                  </span>
                  <div className="text-right flex items-baseline gap-1">
                    <span className="font-heading text-2xl font-black text-foreground leading-none">
                      {round1(val)}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-bold">/ 100</span>
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ─── Compact Header Strip ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-2xl border border-border bg-card p-3 sm:p-4 text-xs shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red border border-brand-red/20">
            <Scale size={15} />
          </div>
          <div>
            <p className="font-heading font-black text-foreground text-xs sm:text-sm">
              Formula: 70% Budaya 5R + 30% Dekorasi Ruangan
            </p>
            <p className="text-[11px] text-muted-foreground">
              Skor akhir diperbarui otomatis berdasarkan penilaian sidak harian &amp; juri dekorasi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          <Badge
            variant="outline"
            className={`text-[10px] font-extrabold px-2 py-0.5 ${
              closed
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
            }`}
          >
            {closed ? 'Skor Final' : 'Skor Sementara'}
          </Badge>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-extrabold text-foreground border border-border">
            {rekapRank.length} Ruangan Dinilai
          </span>
          {showGuideButton && (
            <button
              type="button"
              onClick={handleOpenGuide}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer ml-1"
            >
              <HelpCircle size={12} />
              <span>Panduan</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Sub-Tab Navigation & Search ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-muted/60 p-1 shadow-inner flex-1 max-w-lg">
          <button
            type="button"
            onClick={() => setActiveTab('rekap')}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2.5 text-xs font-bold transition cursor-pointer active:scale-95 ${
              activeTab === 'rekap'
                ? 'bg-card text-foreground shadow-xs font-extrabold ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sigma size={14} className="text-brand-red shrink-0" />
            <span>Rekap Akhir</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fiveR')}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2.5 text-xs font-bold transition cursor-pointer active:scale-95 ${
              activeTab === 'fiveR'
                ? 'bg-card text-foreground shadow-xs font-extrabold ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Trophy size={14} className="text-amber-500 shrink-0" />
            <span>Budaya 5R (70%)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dekorasi')}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2.5 text-xs font-bold transition cursor-pointer active:scale-95 ${
              activeTab === 'dekorasi'
                ? 'bg-card text-foreground shadow-xs font-extrabold ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Paintbrush size={14} className="text-sky-600 dark:text-sky-400 shrink-0" />
            <span>Dekorasi (30%)</span>
          </button>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-56">
          <Search
            size={13}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari ruangan / PIC..."
            className="h-9 w-full rounded-2xl border border-border bg-card pl-8 pr-7 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ─── TAB 1: REKAP GABUNGAN (70% 5R + 30% DEKORASI) ─── */}
      {activeTab === 'rekap' && (
        <div className="space-y-4">
          {/* Top 3 Podium */}
          {!searchQuery && <PodiumView list={rekapRank} scoreKey="total" label="Skor Total" />}

          {/* Leaderboard Cards */}
          {filteredRekap.length > 0 ? (
            <div className="space-y-2">
              {filteredRekap.map((r, i) => {
                const rank = i + 1;
                const fiveRPercent = Math.min(100, Math.max(0, r.fiveR));
                const dekorPercent = Math.min(100, Math.max(0, r.dekorasi));

                return (
                  <motion.div
                    key={r.id}
                    onClick={() => setSelectedRoomScore(r)}
                    whileHover={{ scale: 1.003 }}
                    whileTap={{ scale: 0.995 }}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-xs hover:border-primary/40 hover:shadow-xs transition-all cursor-pointer"
                  >
                    {/* Left: Rank & Room Info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {rankBadge(rank)}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground border border-border">
                        <RoomIcon name={r.icon} size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate font-heading font-black text-foreground text-sm group-hover:text-primary transition-colors">
                            {r.name}
                          </p>
                          <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          PIC: <span className="text-foreground/90 font-bold">{r.pic}</span>
                        </p>
                      </div>
                    </div>

                    {/* Middle: Clean Score Preview */}
                    <div className="flex items-center gap-4 text-xs sm:justify-center">
                      <div className="space-y-1 min-w-[95px]">
                        <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                          <span>5R ({r.fiveRCount}x)</span>
                          <span className="text-foreground font-extrabold">{round1(r.fiveR)}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${fiveRPercent}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1 min-w-[95px]">
                        <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                          <span>Dekor ({r.dekorasiCount} juri)</span>
                          <span className="text-foreground font-extrabold">
                            {round1(r.dekorasi)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-sky-500 rounded-full"
                            style={{ width: `${dekorPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right: Total Score */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                      <div className="text-left sm:text-right">
                        <div className="flex items-baseline sm:justify-end gap-1">
                          <span className="font-heading font-black text-xl text-foreground">
                            {round1(r.total)}
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground">/ 100</span>
                        </div>
                        <div className="mt-0.5">
                          <StatusBadge score={round1(r.total)} />
                        </div>
                      </div>
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors">
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card">
              <p className="text-sm font-bold text-foreground">
                {searchQuery
                  ? 'Tidak ada ruangan yang cocok dengan pencarian.'
                  : 'Belum ada ruangan yang dinilai lengkap (5R dan Dekorasi).'}
              </p>
            </div>
          )}

          {/* Incomplete Note */}
          {incomplete.length > 0 && !searchQuery && (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-3.5 text-xs text-muted-foreground flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Info size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  {incomplete.length} ruangan masih dalam proses penilaian dan akan muncul setelah
                  skor lengkap.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: BUDAYA 5R (BOBOT 70%) ─── */}
      {activeTab === 'fiveR' && (
        <div className="space-y-4">
          {!searchQuery && <PodiumView list={fiveRRank} scoreKey="fiveR" label="Rata-rata 5R" />}

          {filteredFiveR.length > 0 ? (
            <div className="space-y-2">
              {filteredFiveR.map((r, i) => (
                <motion.div
                  key={r.id}
                  onClick={() => setSelectedRoomScore(r)}
                  whileHover={{ scale: 1.003 }}
                  whileTap={{ scale: 0.995 }}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-xs hover:border-primary/40 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {rankBadge(i + 1)}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground border border-border">
                      <RoomIcon name={r.icon} size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-heading font-black text-foreground text-sm group-hover:text-primary transition-colors">
                        {r.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        PIC: {r.pic} ·{' '}
                        <span className="font-semibold text-foreground/80">
                          {r.fiveRCount} kali audit dinilai
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <span className="font-heading font-black text-xl text-foreground">
                        {round1(r.fiveR)}
                      </span>
                      <div className="mt-0.5">
                        <StatusBadge score={round1(r.fiveR)} />
                      </div>
                    </div>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors">
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card">
              <p className="text-sm font-bold text-foreground">Belum ada data penilaian 5R.</p>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: DEKORASI (BOBOT 30%) ─── */}
      {activeTab === 'dekorasi' && (
        <div className="space-y-4">
          {!searchQuery && (
            <PodiumView list={dekorasiRank} scoreKey="dekorasi" label="Rata-rata Dekorasi" />
          )}

          {filteredDekorasi.length > 0 ? (
            <div className="space-y-2">
              {filteredDekorasi.map((r, i) => (
                <motion.div
                  key={r.id}
                  onClick={() => setSelectedRoomScore(r)}
                  whileHover={{ scale: 1.003 }}
                  whileTap={{ scale: 0.995 }}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-xs hover:border-primary/40 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {rankBadge(i + 1)}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground border border-border">
                      <RoomIcon name={r.icon} size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-heading font-black text-foreground text-sm group-hover:text-primary transition-colors">
                        {r.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        PIC: {r.pic} ·{' '}
                        <span className="font-semibold text-foreground/80">
                          {r.dekorasiCount} juri menilai
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <span className="font-heading font-black text-xl text-foreground">
                        {round1(r.dekorasi)}
                      </span>
                      <div className="mt-0.5">
                        <StatusBadge score={round1(r.dekorasi)} />
                      </div>
                    </div>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors">
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card">
              <p className="text-sm font-bold text-foreground">
                Belum ada data penilaian Dekorasi.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── Clean Public Room Detail Dialog ─── */}
      <ResponsiveDialog
        open={!!selectedRoomScore}
        onOpenChange={(open) => {
          if (!open) setSelectedRoomScore(null);
        }}
        title={
          selectedRoomScore ? (
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <RoomIcon name={selectedRoomScore.icon} size={16} />
              </div>
              <span>{selectedRoomScore.name}</span>
            </div>
          ) : (
            'Rincian Nilai Ruangan'
          )
        }
        description={
          selectedRoomScore ? `PIC: ${selectedRoomScore.pic} · Penilaian Lomba HUT RI ke-81` : ''
        }
      >
        {selectedRoomScore && (
          <div className="space-y-4 text-xs text-foreground pb-2">
            {/* Total Final Score Card */}
            <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 text-center shadow-xs">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Skor Akumulasi Akhir
              </p>
              <div className="mt-1 flex items-baseline justify-center gap-1.5">
                <span className="font-heading text-4xl sm:text-5xl font-black text-foreground">
                  {round1(selectedRoomScore.total)}
                </span>
                <span className="text-sm font-bold text-muted-foreground">/ 100</span>
              </div>
              <div className="mt-2 flex justify-center">
                <StatusBadge score={round1(selectedRoomScore.total)} showScoreMax />
              </div>
            </div>

            {/* Score Components */}
            <div className="space-y-2.5">
              {/* Budaya 5R */}
              <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-3.5 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Layers size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">Budaya Kerja 5R (70%)</p>
                    <p className="text-[10px] text-muted-foreground">
                      Dinilai {selectedRoomScore.fiveRCount} kali audit sidak
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-heading text-base font-black text-foreground">
                    {round1(selectedRoomScore.fiveR)}
                  </span>
                  <span className="text-[10px] text-muted-foreground"> / 100</span>
                </div>
              </div>

              {/* Lomba Dekorasi */}
              <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-3.5 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                    <Paintbrush size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">Lomba Dekorasi (30%)</p>
                    <p className="text-[10px] text-muted-foreground">
                      Dinilai oleh {selectedRoomScore.dekorasiCount} juri
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-heading text-base font-black text-foreground">
                    {round1(selectedRoomScore.dekorasi)}
                  </span>
                  <span className="text-[10px] text-muted-foreground"> / 100</span>
                </div>
              </div>
            </div>

            {/* Clean Explanation */}
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/40 p-3 text-[11px] text-muted-foreground leading-relaxed">
              <Info size={14} className="text-primary shrink-0" />
              <span>
                Nilai akhir dihitung dari gabungan{' '}
                <strong className="text-foreground">70% nilai Budaya 5R</strong> dan{' '}
                <strong className="text-foreground">30% nilai Lomba Dekorasi</strong>.
              </span>
            </div>
          </div>
        )}
      </ResponsiveDialog>

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

export default ScoreBoard;
