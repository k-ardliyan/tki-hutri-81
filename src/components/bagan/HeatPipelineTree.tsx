/**
 * HeatPipelineTree — Visualisasi Bagan Horizontal Multi-Stage (Pipeline Tree) Mode Heat.
 * Menampilkan alur pertandingan dari Babak 1 ➔ Semifinal ➔ Final ➔ Grand Podium secara horizontal.
 * Dilengkapi:
 * - Distribusi akurat tiket kualifikasi antar babak (No hardcoded duplicated labels)
 * - Garis penghubung SVG dinamis (Stepped Bezier Connector Curves) antar kartu babak & podium
 * - Sorotan jalur tim berpendar (Interactive Team Path Highlighting)
 * - Drag-to-scroll & tombol navigasi
 * - Aksi cepat admin terintegrasi
 */

import {
  Award,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  Flame,
  Gift,
  Layers,
  Medal,
  MoveRight,
  Pencil,
  Sparkles,
  Trophy,
  Users,
  UserX,
  X,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { distributeSessions } from '~/lib/tournament/heat-elimination/session-distribution';
import type {
  HeatDetailView,
  HeatParticipantView,
  HeatSessionView,
  HeatStageView,
} from '~/lib/tournament/heat-elimination/types';
import { cn } from '~/lib/utils';

export interface HeatPipelineTreeProps {
  detail: HeatDetailView;
  teams: Array<{ id: number; nama: string }>;
  prizes?: Array<{ place: number; hadiah: string }>;
  admin?: {
    onInputResult: (session: HeatSessionView, stage: HeatStageView) => void;
    onCorrectResult: (session: HeatSessionView, stage: HeatStageView) => void;
  };
}

const SESSION_STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; cardClass: string; dotClass: string }
> = {
  WAITING: {
    label: 'Menunggu',
    badgeClass: 'bg-muted text-muted-foreground border-border',
    cardClass: 'border-border/70 bg-card/60',
    dotClass: 'bg-slate-400',
  },
  READY: {
    label: 'Siap',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
    cardClass: 'border-blue-500/40 bg-card shadow-xs ring-1 ring-blue-500/20',
    dotClass: 'bg-blue-500',
  },
  IN_PROGRESS: {
    label: 'Berlangsung',
    badgeClass: 'bg-brand-red/10 text-brand-red border-brand-red/30',
    cardClass: 'border-brand-red/50 bg-brand-red/[0.02] shadow-sm ring-1 ring-brand-red/20',
    dotClass: 'bg-brand-red animate-ping',
  },
  COMPLETED: {
    label: 'Selesai',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    cardClass: 'border-emerald-500/30 bg-card/95 shadow-2xs',
    dotClass: 'bg-emerald-500',
  },
  CANCELLED: {
    label: 'Dibatalkan',
    badgeClass: 'bg-muted text-muted-foreground line-through border-border',
    cardClass: 'border-border/40 bg-muted/20 opacity-60',
    dotClass: 'bg-slate-400',
  },
};

interface TreeConnector {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isHighlighted: boolean;
  isCompleted: boolean;
  isWaiting: boolean;
  colorType?: 'gold' | 'silver' | 'bronze' | 'red' | 'emerald' | 'default';
}

export interface QualifierSlotOrigin {
  label: string;
  sourceSessionNumber: number;
  sourceRank: number;
}

function getTeamName(teams: Array<{ id: number; nama: string }>, id: number | null): string {
  if (id === null) return '—';
  return teams.find((t) => t.id === id)?.nama ?? `Tim ${id}`;
}

/**
 * Mendistribusikan seluruh qualifier dari babak sebelumnya secara menyeluruh (global)
 * ke setiap sesi pada babak saat ini, sehingga tidak terjadi duplikasi teks "Juara 1 Sesi 1"
 * di semua sesi.
 */
export function getStagePlaceholderDistribution(
  currentStage: HeatStageView,
  prevStage: HeatStageView | null,
  sessionCount: number
): QualifierSlotOrigin[][] {
  const buckets: QualifierSlotOrigin[][] = Array.from(
    { length: Math.max(1, sessionCount) },
    () => []
  );
  if (!prevStage) return buckets;

  const prevSessionsCount = prevStage.sessions.length > 0 ? prevStage.sessions.length : 2;
  const qualifiersPerSession = Math.max(1, prevStage.qualifiersPerSession || 1);

  // 1. Buat daftar lengkap seluruh tiket kualifikasi dari babak sebelumnya
  // Urutan: Juara 1 Sesi 1..N, lalu Juara 2 Sesi 1..N, dst.
  const allQualifiers: QualifierSlotOrigin[] = [];
  for (let r = 1; r <= qualifiersPerSession; r++) {
    for (let s = 1; s <= prevSessionsCount; s++) {
      const label =
        qualifiersPerSession === 1
          ? `Pemenang Sesi ${s} (${prevStage.name})`
          : `Juara ${r} Sesi ${s} (${prevStage.name})`;

      allQualifiers.push({
        label,
        sourceSessionNumber: s,
        sourceRank: r,
      });
    }
  }

  // 2. Distribusikan tiket kualifikasi ke bucket sesi babak saat ini (serpentine distribution)
  allQualifiers.forEach((q, idx) => {
    if (sessionCount <= 1) {
      buckets[0].push(q);
      return;
    }
    const col = idx % sessionCount;
    const row = Math.floor(idx / sessionCount);
    const targetSessionIdx = row % 2 === 0 ? col : sessionCount - 1 - col;
    if (buckets[targetSessionIdx]) {
      buckets[targetSessionIdx].push(q);
    } else {
      buckets[0].push(q);
    }
  });

  return buckets;
}

/**
 * Menghitung kapasitas slot yang diharapkan untuk satu sesi:
 * - Jika babak sudah aktif/selesai dan sudah ada peserta diundi, kapasitas = actual count (tidak menambah slot dummy).
 * - Jika sesi masih kosong/menunggu, kapasitas = jumlah peserta kualifikasi yang dialokasikan dari babak sebelumnya.
 */
function getExpectedSessionCapacity(
  stage: HeatStageView,
  prevStage: HeatStageView | null,
  sessionIndex: number,
  actualCount: number
): number {
  if (actualCount > 0) {
    return actualCount;
  }

  if (!prevStage) {
    return stage.teamsPerSession || 4;
  }

  const prevSessionsCount = prevStage.sessions.length > 0 ? prevStage.sessions.length : 2;
  const qualifiersFromPrev = prevSessionsCount * (prevStage.qualifiersPerSession || 1);

  if (stage.isFinal) {
    return Math.max(2, Math.min(stage.teamsPerSession || 4, qualifiersFromPrev));
  }

  try {
    const sessionSizes = distributeSessions(qualifiersFromPrev, stage.teamsPerSession || 4);
    return sessionSizes[sessionIndex] ?? sessionSizes[0] ?? 2;
  } catch {
    return Math.max(2, Math.ceil(qualifiersFromPrev / (stage.sessions.length || 1)));
  }
}

/**
 * Sesi untuk stage: asli bila sudah terbentuk, placeholder bila belum (dipakai visualisasi).
 * Placeholder hanya dibuat bila ada prevStage ber-sesi (qualifier dari babak sebelumnya);
 * tanpa prevStage (babak pertama) → kosong.
 */
export function getSessionsForStage(
  stage: HeatStageView,
  prevStage: HeatStageView | null
): Array<{ session: HeatSessionView; isPlaceholder: boolean }> {
  if (stage.sessions && stage.sessions.length > 0) {
    return stage.sessions.map((s) => ({ session: s, isPlaceholder: false }));
  }

  // Jika babak belum memiliki sesi yang terbentuk (mis. Semifinal / Final di awal)
  // Tanpa prevStage (babak pertama) tidak ada qualifier → tak ada placeholder.
  if (!prevStage || !prevStage.sessions.length) {
    return [];
  }

  const prevSessionsCount = prevStage.sessions.length;
  const qualifiersPerSession = prevStage.qualifiersPerSession ?? 1;
  const qualifiersFromPrev = prevSessionsCount * qualifiersPerSession;

  const expectedCount = stage.isFinal
    ? 1
    : Math.max(1, Math.ceil(qualifiersFromPrev / (stage.teamsPerSession || 4)));

  const placeholders: Array<{ session: HeatSessionView; isPlaceholder: boolean }> = [];
  for (let i = 0; i < expectedCount; i++) {
    placeholders.push({
      session: {
        id: -100 - i - stage.id * 10,
        sessionNumber: i + 1,
        name: stage.isFinal ? 'Sesi Final' : `Sesi ${i + 1}`,
        status: 'WAITING',
        version: 1,
        participants: [],
        results: [],
      },
      isPlaceholder: true,
    });
  }

  return placeholders;
}

export function HeatPipelineTree({ detail, teams, prizes = [], admin }: HeatPipelineTreeProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const treeBoardRef = useRef<HTMLDivElement>(null);
  const [highlightedTeamId, setHighlightedTeamId] = useState<number | null>(null);
  const [connectors, setConnectors] = useState<TreeConnector[]>([]);

  // Drag-to-scroll mouse interaction
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeaveOrUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const scrollByAmount = (amt: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: amt, behavior: 'smooth' });
    }
  };

  // ─── Kalkulasi Posisi Garis SVG Penghubung Antar Card ───
  const updateConnectors = useCallback(() => {
    if (!treeBoardRef.current) return;

    const board = treeBoardRef.current;
    const boardRect = board.getBoundingClientRect();
    const newConnectors: TreeConnector[] = [];

    // 1. Garis antar Babak (Stage S ➔ Stage S+1)
    for (let sIdx = 0; sIdx < detail.stages.length - 1; sIdx++) {
      const stageA = detail.stages[sIdx];
      const stageB = detail.stages[sIdx + 1];
      const prevOfA = sIdx > 0 ? detail.stages[sIdx - 1] : null;

      const sessionsA = getSessionsForStage(stageA, prevOfA);
      const sessionsB = getSessionsForStage(stageB, stageA);
      const distributionB = getStagePlaceholderDistribution(stageB, stageA, sessionsB.length);

      // Hitung koneksi dari setiap sesi babak A ke sesi babak B
      sessionsA.forEach((sA, idxA) => {
        const sourceSessionNum = idxA + 1;
        const elemA = board.querySelector<HTMLElement>(
          `[data-session-node="stage-${sIdx}-sess-${idxA}"]`
        );
        if (!elemA) return;

        const rectA = elemA.getBoundingClientRect();
        const x1 = rectA.right - boardRect.left;
        const y1 = rectA.top - boardRect.top + rectA.height / 2;

        // Cari sesi tujuan di babak B yang menerima qualifier dari sourceSessionNum
        const targetSessionIndices: number[] = [];
        if (stageB.isFinal || sessionsB.length === 1) {
          targetSessionIndices.push(0);
        } else {
          distributionB.forEach((bucket, bIdx) => {
            if (bucket.some((q) => q.sourceSessionNumber === sourceSessionNum)) {
              targetSessionIndices.push(bIdx);
            }
          });
          // Fallback jika belum terpetakan
          if (targetSessionIndices.length === 0) {
            targetSessionIndices.push(
              Math.min(
                sessionsB.length - 1,
                Math.floor((idxA * sessionsB.length) / sessionsA.length)
              )
            );
          }
        }

        targetSessionIndices.forEach((targetIdx) => {
          const elemB = board.querySelector<HTMLElement>(
            `[data-session-node="stage-${sIdx + 1}-sess-${targetIdx}"]`
          );
          if (!elemB) return;

          const rectB = elemB.getBoundingClientRect();
          const x2 = rectB.left - boardRect.left;
          const y2 = rectB.top - boardRect.top + rectB.height / 2;

          const isHighlighted =
            highlightedTeamId !== null &&
            sA.session.participants.some((p) => p.participantId === highlightedTeamId);

          const isCompleted = sA.session.status === 'COMPLETED';
          const isWaiting = sA.session.status === 'WAITING' || stageB.status === 'PENDING';

          newConnectors.push({
            id: `conn-s${sIdx}-${idxA}-to-s${sIdx + 1}-${targetIdx}`,
            x1,
            y1,
            x2,
            y2,
            isHighlighted,
            isCompleted,
            isWaiting,
            colorType: isHighlighted ? 'red' : isCompleted ? 'emerald' : 'default',
          });
        });
      });
    }

    // 2. Garis dari Babak Final ➔ Grand Podium Juara (1, 2, 3)
    const finalStageIdx = detail.stages.length - 1;
    const finalElem = board.querySelector<HTMLElement>(
      `[data-session-node="stage-${finalStageIdx}-sess-0"]`
    );

    if (finalElem) {
      const finalRect = finalElem.getBoundingClientRect();
      const x1 = finalRect.right - boardRect.left;
      const y1 = finalRect.top - boardRect.top + finalRect.height / 2;

      const podiumRanks = [
        { rank: 1, colorType: 'gold' as const },
        { rank: 2, colorType: 'silver' as const },
        { rank: 3, colorType: 'bronze' as const },
      ];

      podiumRanks.forEach(({ rank, colorType }) => {
        const elemPodium = board.querySelector<HTMLElement>(`[data-podium-node="rank-${rank}"]`);
        if (!elemPodium) return;

        const podiumRect = elemPodium.getBoundingClientRect();
        const x2 = podiumRect.left - boardRect.left;
        const y2 = podiumRect.top - boardRect.top + podiumRect.height / 2;

        const podiumTeamId =
          rank === 1 ? detail.podium.rank1 : rank === 2 ? detail.podium.rank2 : detail.podium.rank3;

        const isHighlighted = highlightedTeamId !== null && podiumTeamId === highlightedTeamId;

        newConnectors.push({
          id: `conn-final-to-podium-${rank}`,
          x1,
          y1,
          x2,
          y2,
          isHighlighted,
          isCompleted: podiumTeamId !== null,
          isWaiting: podiumTeamId === null,
          colorType: isHighlighted ? 'red' : colorType,
        });
      });
    }

    setConnectors(newConnectors);
  }, [detail, highlightedTeamId]);

  useLayoutEffect(() => {
    updateConnectors();

    const handleResize = () => updateConnectors();
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => updateConnectors());
    if (treeBoardRef.current) {
      resizeObserver.observe(treeBoardRef.current);
    }

    const t1 = setTimeout(updateConnectors, 50);
    const t2 = setTimeout(updateConnectors, 250);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [updateConnectors]);

  return (
    <div className="space-y-4">
      {/* ─── Top Control Toolbar: Team Filter Indicator & Scroll Arrows ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          {highlightedTeamId ? (
            <div className="flex items-center gap-2 rounded-full bg-brand-red/10 border border-brand-red/30 px-3 py-1 text-xs font-bold text-brand-red">
              <span>
                Menyorot jalur: <strong>{getTeamName(teams, highlightedTeamId)}</strong>
              </span>
              <button
                type="button"
                onClick={() => setHighlightedTeamId(null)}
                className="rounded-full p-0.5 hover:bg-brand-red/20 transition-colors"
                title="Hapus sorotan tim"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-500 shrink-0" />
              <span>
                Klik / hover nama tim untuk menyorot garis jalur kualifikasinya ke babak berikutnya.
              </span>
            </p>
          )}
        </div>

        {/* Scroll Nav Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="icon-xs"
            onClick={() => scrollByAmount(-320)}
            className="rounded-lg shadow-2xs"
            title="Geser Kiri"
          >
            <ChevronLeft size={14} />
          </Button>
          <Button
            variant="outline"
            size="icon-xs"
            onClick={() => scrollByAmount(320)}
            className="rounded-lg shadow-2xs"
            title="Geser Kanan"
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>

      {/* ─── Main Horizontal Scroll Container ─── */}
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeaveOrUp}
        onMouseUp={handleMouseLeaveOrUp}
        onMouseMove={handleMouseMove}
        className={cn(
          'relative w-full overflow-x-auto pb-8 pt-4 scroll-smooth select-none cursor-grab active:cursor-grabbing rounded-3xl border border-border/80 bg-muted/20 p-4 sm:p-6 shadow-inner',
          isDragging && 'cursor-grabbing'
        )}
      >
        <div
          ref={treeBoardRef}
          className="relative inline-flex items-start gap-8 sm:gap-14 min-w-full p-1"
        >
          {/* ── SVG Connecting Lines Layer (Di Belakang Card) ── */}
          <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible">
            <defs>
              {/* Glowing Red Filter for Highlighted Path */}
              <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="3"
                  floodColor="#ef4444"
                  floodOpacity="0.8"
                />
              </filter>
              {/* Glowing Gold Filter for Champion Path */}
              <filter id="glow-gold" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="3"
                  floodColor="#f59e0b"
                  floodOpacity="0.8"
                />
              </filter>
            </defs>

            {connectors.map((c) => {
              const dx = (c.x2 - c.x1) * 0.55;
              const pathD = `M ${c.x1} ${c.y1} C ${c.x1 + dx} ${c.y1}, ${c.x2 - dx} ${c.y2}, ${c.x2} ${c.y2}`;

              let strokeColor = 'rgba(156, 163, 175, 0.45)'; // Default subtle border
              let strokeWidth = 2;
              let strokeDash: string | undefined;
              let filter: string | undefined;

              if (c.isHighlighted) {
                strokeColor = '#ef4444'; // Red highlight
                strokeWidth = 3.5;
                filter = 'url(#glow-red)';
              } else if (c.colorType === 'gold') {
                strokeColor = '#f59e0b';
                strokeWidth = 2.5;
                filter = 'url(#glow-gold)';
              } else if (c.colorType === 'silver') {
                strokeColor = '#94a3b8';
                strokeWidth = 2;
              } else if (c.colorType === 'bronze') {
                strokeColor = '#d97706';
                strokeWidth = 2;
              } else if (c.isCompleted) {
                strokeColor = '#10b981'; // Green completed
                strokeWidth = 2.2;
              } else if (c.isWaiting) {
                strokeDash = '5 5';
                strokeWidth = 1.5;
              }

              return (
                <g key={c.id}>
                  {/* Background shadow path for contrast */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth + 2.5}
                    className="text-background/80"
                  />

                  {/* Main Connector Path */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDash}
                    filter={filter}
                    className="transition-all duration-300"
                  />

                  {/* Source Node Anchor */}
                  <circle
                    cx={c.x1}
                    cy={c.y1}
                    r={c.isHighlighted ? 4.5 : 3}
                    fill={c.isHighlighted ? '#ef4444' : strokeColor}
                    className="transition-all duration-300"
                  />

                  {/* Target Node Anchor */}
                  <circle
                    cx={c.x2}
                    cy={c.y2}
                    r={c.isHighlighted ? 5 : 3.5}
                    fill={c.isHighlighted ? '#ef4444' : strokeColor}
                    className="transition-all duration-300"
                  />
                </g>
              );
            })}
          </svg>

          {/* ── Stage Columns (Foreground Cards) ── */}
          {detail.stages.map((stage, sIdx) => {
            const isLastStage = sIdx === detail.stages.length - 1;
            const prevStage = sIdx > 0 ? detail.stages[sIdx - 1] : null;
            const isStageCompleted = stage.status === 'COMPLETED';
            const isStageActive = stage.status === 'ACTIVE';

            const stageSessions = getSessionsForStage(stage, prevStage);
            const stageDistribution = getStagePlaceholderDistribution(
              stage,
              prevStage,
              stageSessions.length
            );

            return (
              <div
                key={stage.id}
                className="relative z-10 flex flex-col gap-3.5 w-[280px] sm:w-[320px] shrink-0"
              >
                {/* Stage Column Header Card */}
                <div
                  className={cn(
                    'sticky top-0 z-20 rounded-2xl border p-3.5 transition-all backdrop-blur-md',
                    isStageActive
                      ? 'border-brand-red/40 bg-card/95 shadow-md ring-1 ring-brand-red/20'
                      : isStageCompleted
                        ? 'border-emerald-500/30 bg-card/90 shadow-2xs'
                        : 'border-border/80 bg-card/80 shadow-2xs'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          'flex size-6 shrink-0 items-center justify-center rounded-lg text-xs font-black',
                          isStageCompleted
                            ? 'bg-emerald-500 text-white'
                            : isStageActive
                              ? 'bg-brand-red text-white'
                              : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {isStageCompleted ? <Check size={13} /> : stage.stageNumber}
                      </span>
                      <h4 className="truncate text-xs sm:text-sm font-black text-foreground">
                        {stage.name}
                      </h4>
                    </div>

                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border shrink-0',
                        isStageCompleted
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : isStageActive
                            ? 'bg-brand-red/10 text-brand-red border-brand-red/30'
                            : 'bg-muted text-muted-foreground border-border'
                      )}
                    >
                      {isStageCompleted ? 'Selesai' : isStageActive ? 'Aktif' : 'Menunggu'}
                    </span>
                  </div>

                  <p className="mt-1 text-[10px] text-muted-foreground flex items-center justify-between font-medium">
                    <span>{stageSessions.length} Sesi Pertandingan</span>
                    <span>
                      {stage.isFinal
                        ? (
                            <span className="inline-flex items-center gap-1">
                              <Trophy size={11} className="text-amber-500" /> Penentuan Juara
                            </span>
                          )
                        : `Top ${stage.qualifiersPerSession}/sesi lolos`}
                    </span>
                  </p>
                </div>

                {/* Sessions Stack within Stage */}
                <div className="space-y-3.5">
                  {stageSessions.map(({ session, isPlaceholder }, sessIdx) => {
                    const statusCfg =
                      SESSION_STATUS_CONFIG[session.status] ?? SESSION_STATUS_CONFIG.WAITING;
                    const hasSessionParticipants = session.participants.length > 0;
                    const containsHighlighted =
                      highlightedTeamId !== null &&
                      session.participants.some((p) => p.participantId === highlightedTeamId);

                    // Hitung kapasitas slot per sesi yang diharapkan secara matematis dari babak sebelumnya
                    const targetCapacity = getExpectedSessionCapacity(
                      stage,
                      prevStage,
                      sessIdx,
                      session.participants.length
                    );
                    const emptySlotsCount = Math.max(
                      0,
                      targetCapacity - session.participants.length
                    );
                    const sessionPlaceholderList = stageDistribution[sessIdx] ?? [];

                    return (
                      <div
                        key={session.id}
                        data-session-node={`stage-${sIdx}-sess-${sessIdx}`}
                        className={cn(
                          'rounded-2xl border p-3 transition-all duration-200 backdrop-blur-xs',
                          isPlaceholder
                            ? 'border-dashed border-border/80 bg-card/60'
                            : statusCfg.cardClass,
                          containsHighlighted &&
                            'ring-2 ring-brand-red border-brand-red bg-brand-red/[0.04] shadow-md scale-[1.01]'
                        )}
                      >
                        {/* Session Header */}
                        <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2 mb-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] font-mono font-black text-primary uppercase">
                              Sesi {session.sessionNumber}
                            </span>
                            <span className="text-muted-foreground text-xs">·</span>
                            <span className="truncate text-xs font-bold text-foreground">
                              {session.name}
                            </span>
                          </div>

                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[9px] font-extrabold border',
                              isPlaceholder
                                ? 'bg-muted/60 text-muted-foreground/70 border-border/60'
                                : statusCfg.badgeClass
                            )}
                          >
                            {isPlaceholder ? 'Menunggu Babak' : statusCfg.label}
                          </span>
                        </div>

                        {/* Participants & Placeholder Slots List */}
                        <div className="space-y-1.5">
                          {/* 1. Render Real Participants */}
                          {session.participants.map((p, pIdx) => {
                            const res = session.results.find(
                              (r) => r.participantId === p.participantId
                            );
                            const rank = res?.rank ?? null;
                            const isQualified =
                              rank !== null &&
                              rank <= stage.qualifiersPerSession &&
                              !stage.isFinal &&
                              session.status === 'COMPLETED';
                            const isPodiumRank =
                              stage.isFinal &&
                              session.status === 'COMPLETED' &&
                              rank !== null &&
                              rank <= 3;
                            const isEliminated =
                              session.status === 'COMPLETED' &&
                              ((rank !== null &&
                                rank > stage.qualifiersPerSession &&
                                !stage.isFinal) ||
                                res?.resultStatus === 'DNS' ||
                                res?.resultStatus === 'DISQUALIFIED' ||
                                res?.resultStatus === 'DNF');
                            const isCurrentHighlighted = highlightedTeamId === p.participantId;

                            return (
                              <div
                                key={p.participantId}
                                onMouseEnter={() => setHighlightedTeamId(p.participantId)}
                                onClick={() => setHighlightedTeamId(p.participantId)}
                                className={cn(
                                  'flex items-center justify-between gap-2 rounded-xl p-2 text-xs transition-all cursor-pointer select-none',
                                  isCurrentHighlighted
                                    ? 'bg-brand-red/15 text-foreground font-black ring-1 ring-brand-red'
                                    : isQualified
                                      ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-bold'
                                      : isPodiumRank
                                        ? rank === 1
                                          ? 'bg-amber-500/15 text-amber-900 dark:text-amber-200 font-black border border-amber-500/30'
                                          : rank === 2
                                            ? 'bg-slate-200/80 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold'
                                            : 'bg-amber-800/15 text-amber-900 dark:text-amber-300 font-bold'
                                        : isEliminated
                                          ? 'bg-muted/30 text-muted-foreground line-through opacity-70'
                                          : 'bg-muted/40 text-foreground hover:bg-muted/70 font-medium'
                                )}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {/* Rank or Slot Seed Badge */}
                                  <span
                                    className={cn(
                                      'flex size-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black',
                                      rank === 1
                                        ? 'bg-amber-500 text-white'
                                        : rank === 2
                                          ? 'bg-slate-400 text-white'
                                          : rank === 3
                                            ? 'bg-amber-700 text-white'
                                            : isQualified
                                              ? 'bg-emerald-500 text-white'
                                              : 'bg-card border border-border text-muted-foreground'
                                    )}
                                  >
                                    {rank !== null ? `#${rank}` : p.seed ? `S${p.seed}` : pIdx + 1}
                                  </span>

                                  <span className="truncate text-xs">
                                    {p.nama || getTeamName(teams, p.participantId)}
                                  </span>
                                </div>

                                {/* Status Badge per Participant */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isQualified && !isLastStage && (
                                    <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-700 dark:text-emerald-300">
                                      <Check size={10} /> Lolos
                                    </span>
                                  )}
                                  {isPodiumRank && (
                                    <span className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase">
                                      {rank === 1 ? (
                                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                          <Medal size={10} className="text-amber-500" /> Juara 1
                                        </span>
                                      ) : rank === 2 ? (
                                        <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-300">
                                          <Medal size={10} className="text-slate-400" /> Juara 2
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400">
                                          <Medal size={10} className="text-orange-500" /> Juara 3
                                        </span>
                                      )}
                                    </span>
                                  )}
                                  {res?.resultStatus && res.resultStatus !== 'NORMAL' && (
                                    <span className="rounded bg-destructive/10 px-1 py-0.2 text-[9px] font-bold text-destructive">
                                      {res.resultStatus}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {/* 2. Render Placeholder Slots for Pending Participants (Sesuai kuota kualifikasi tanpa duplikasi) */}
                          {Array.from({ length: emptySlotsCount }).map((_, placeholderIdx) => {
                            const slotNumber = session.participants.length + placeholderIdx + 1;
                            const slotOrigin = sessionPlaceholderList[placeholderIdx];
                            const label =
                              slotOrigin?.label ??
                              (prevStage
                                ? `Menunggu Pemenang ${prevStage.name}`
                                : `Slot Peserta #${slotNumber}`);

                            return (
                              <div
                                key={`slot-ph-${session.id}-${placeholderIdx}`}
                                className="flex items-center justify-between gap-2 rounded-xl p-2 text-xs border border-dashed border-border/80 bg-muted/20 text-muted-foreground/70 select-none transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="flex size-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold border border-dashed border-border/80 bg-background text-muted-foreground/60">
                                    #{slotNumber}
                                  </span>
                                  <span className="truncate text-[11px] font-medium italic text-muted-foreground/80">
                                    {label}
                                  </span>
                                </div>
                                <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-muted-foreground/60 shrink-0">
                                  Menunggu
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Admin Action Buttons on Session Node */}
                        {admin && !isPlaceholder && (
                          <div className="mt-2.5 pt-2 border-t border-border/50 flex justify-end gap-1.5">
                            {session.status === 'COMPLETED' ? (
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => admin.onCorrectResult(session, stage)}
                                className="text-[11px] font-bold text-muted-foreground hover:text-foreground h-7 px-2.5 rounded-lg"
                              >
                                <Pencil size={11} className="mr-1" /> Koreksi
                              </Button>
                            ) : (
                              <Button
                                size="xs"
                                disabled={!hasSessionParticipants}
                                onClick={() => admin.onInputResult(session, stage)}
                                className="text-[11px] font-bold h-7 px-2.5 rounded-lg"
                              >
                                Input Hasil
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* ── Final Podium Celebration Column ── */}
          <div className="relative z-10 flex flex-col gap-3.5 w-[260px] sm:w-[300px] shrink-0">
            {/* Grand Podium Header */}
            <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-card to-card p-3.5 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-lg bg-amber-500 text-white font-black text-xs shadow-xs">
                  <Trophy size={13} />
                </span>
                <h4 className="text-xs sm:text-sm font-black text-foreground">
                  Grand Podium Juara
                </h4>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground font-medium">
                Pemenang peringkat tertinggi perlombaan.
              </p>
            </div>

            {/* Podium Cards Stack (with Placeholder Fallbacks) */}
            <div className="space-y-2.5">
              {/* Juara 1 */}
              <div
                data-podium-node="rank-1"
                className={cn(
                  'rounded-2xl p-3.5 space-y-1.5 transition-all',
                  detail.podium.rank1 !== null
                    ? 'border border-amber-500/50 bg-gradient-to-br from-amber-500/15 via-card to-card shadow-sm'
                    : 'border border-dashed border-amber-500/40 bg-amber-500/[0.03]'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 text-white px-2 py-0.5 text-[10px] font-black uppercase shadow-xs">
                    <Medal size={10} /> Juara 1 (Emas)
                  </span>
                  <Crown size={14} className="text-amber-500" />
                </div>
                <p
                  className={cn(
                    'truncate text-sm font-black',
                    detail.podium.rank1 !== null
                      ? 'text-foreground'
                      : 'text-muted-foreground/70 italic font-medium'
                  )}
                >
                  {detail.podium.rank1 !== null
                    ? getTeamName(teams, detail.podium.rank1)
                    : 'Menunggu Pemenang Final'}
                </p>
                {prizes.find((p) => p.place === 1)?.hadiah && (
                  <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                    <Gift size={11} className="inline mr-1 -mt-0.5" />
                    {prizes.find((p) => p.place === 1)?.hadiah}
                  </p>
                )}
              </div>

              {/* Juara 2 */}
              <div
                data-podium-node="rank-2"
                className={cn(
                  'rounded-2xl p-3 space-y-1 transition-all',
                  detail.podium.rank2 !== null
                    ? 'border border-slate-300 dark:border-slate-700 bg-gradient-to-br from-slate-200/40 dark:from-slate-800/40 via-card to-card shadow-2xs'
                    : 'border border-dashed border-border/80 bg-muted/20'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-400 text-white px-2 py-0.5 text-[10px] font-black uppercase">
                    <Medal size={10} /> Juara 2 (Perak)
                  </span>
                  <Medal size={13} className="text-slate-400" />
                </div>
                <p
                  className={cn(
                    'truncate text-xs font-bold',
                    detail.podium.rank2 !== null
                      ? 'text-foreground'
                      : 'text-muted-foreground/70 italic font-normal'
                  )}
                >
                  {detail.podium.rank2 !== null
                    ? getTeamName(teams, detail.podium.rank2)
                    : 'Menunggu Runner-Up Final'}
                </p>
                {prizes.find((p) => p.place === 2)?.hadiah && (
                  <p className="text-[10px] font-semibold text-muted-foreground">
                    <Gift size={10} className="inline mr-1 -mt-0.5" />
                    {prizes.find((p) => p.place === 2)?.hadiah}
                  </p>
                )}
              </div>

              {/* Juara 3 */}
              <div
                data-podium-node="rank-3"
                className={cn(
                  'rounded-2xl p-3 space-y-1 transition-all',
                  detail.podium.rank3 !== null
                    ? 'border border-amber-800/30 bg-gradient-to-br from-amber-800/10 via-card to-card shadow-2xs'
                    : 'border border-dashed border-border/80 bg-muted/20'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-700 text-white px-2 py-0.5 text-[10px] font-black uppercase">
                    <Medal size={10} /> Juara 3 (Perunggu)
                  </span>
                  <Award size={13} className="text-amber-700" />
                </div>
                <p
                  className={cn(
                    'truncate text-xs font-bold',
                    detail.podium.rank3 !== null
                      ? 'text-foreground'
                      : 'text-muted-foreground/70 italic font-normal'
                  )}
                >
                  {detail.podium.rank3 !== null
                    ? getTeamName(teams, detail.podium.rank3)
                    : 'Menunggu Juara 3 Final'}
                </p>
                {prizes.find((p) => p.place === 3)?.hadiah && (
                  <p className="text-[10px] font-semibold text-muted-foreground">
                    <Gift size={10} className="inline mr-1 -mt-0.5" />
                    {prizes.find((p) => p.place === 3)?.hadiah}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
