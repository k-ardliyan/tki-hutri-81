/**
 * HeatPublicView — UI publik (read-only) utk format HEAT_ELIMINATION.
 * Menampilkan Stage Stepper ➔ Session Cards ➔ Rank per peserta & Grand Podium.
 * Sepenuhnya responsif dan mendukung light/dark mode.
 */
import {
  Award,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Crown,
  Flame,
  Layers,
  Medal,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import type { HeatDetailView } from '../../lib/tournament/heat-elimination';

interface Props {
  detail: HeatDetailView;
}

const STAGE_LABEL: Record<string, string> = {
  PENDING: 'Menunggu',
  ACTIVE: 'Berlangsung',
  COMPLETED: 'Selesai',
};

function nama(teams: Array<{ id: number; nama: string }>, id: number | null): string {
  if (id === null) return '—';
  return teams.find((t) => t.id === id)?.nama ?? `Tim ${id}`;
}

export function HeatPublicView({ detail }: Props) {
  const hasPodium = detail.podium.rank1 !== null;
  const activeStage = detail.stages.find((s) => s.status === 'ACTIVE') ?? detail.stages[0];

  return (
    <div className="space-y-6">
      {/* ─── Header Stats & Format Badge ─── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-border/80 bg-muted/30 p-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
            <Layers size={14} />
          </span>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-foreground">
              Sistem Sesi (Heat)
            </span>
            <span className="ml-2 text-[11px] text-muted-foreground">
              · {detail.bracket.participantCount} Tim Terdaftar
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-card px-2.5 py-1 text-[10px] font-extrabold text-muted-foreground border border-border shadow-2xs">
            {detail.stages.length} Babak Pertandingan
          </span>
        </div>
      </div>

      {/* ─── Stage Progression Stepper / Timeline ─── */}
      <div className="rounded-2xl border border-border bg-card p-3.5 shadow-2xs">
        <p className="mb-2.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          Alur Babak Pertandingan
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-1.5">
          {detail.stages.map((stage, idx) => {
            const isCompleted = stage.status === 'COMPLETED';
            const isActive = stage.status === 'ACTIVE';
            const isLast = idx === detail.stages.length - 1;

            return (
              <div key={stage.id} className="flex flex-1 items-center gap-1.5">
                <div
                  className={`flex flex-1 items-center gap-2.5 rounded-xl border p-2.5 transition-all ${
                    isCompleted
                      ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300'
                      : isActive
                        ? 'border-brand-red/40 bg-brand-red/5 text-brand-red shadow-xs ring-1 ring-brand-red/20'
                        : 'border-border/60 bg-muted/20 text-muted-foreground'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                      isCompleted
                        ? 'bg-emerald-500 text-white'
                        : isActive
                          ? 'bg-brand-red text-white'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? <Check size={13} /> : idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-black leading-tight text-foreground">
                      {stage.name}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold opacity-80">
                        {isCompleted ? 'Selesai' : isActive ? 'Sedang Berlangsung' : 'Menunggu'}
                      </span>
                      {isActive && (
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-red opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-red" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!isLast && (
                  <ChevronRight
                    size={16}
                    className="hidden shrink-0 text-muted-foreground/50 sm:block"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Stage Details & Sessions ─── */}
      <div className="space-y-6">
        {detail.stages.map((stage, si) => {
          const isCompleted = stage.status === 'COMPLETED';
          const isActive = stage.status === 'ACTIVE';

          return (
            <div
              key={stage.id}
              className={`rounded-3xl border p-4 sm:p-5 transition-all ${
                isActive
                  ? 'border-brand-red/30 bg-card shadow-xs ring-1 ring-brand-red/10'
                  : 'border-border bg-card shadow-2xs'
              }`}
            >
              {/* Stage Header */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5 border-b border-border/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-xl font-black text-xs ${
                      isCompleted
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                        : isActive
                          ? 'bg-brand-red text-white shadow-xs'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? <Check size={16} /> : si + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-heading text-sm sm:text-base font-black uppercase tracking-wider text-foreground">
                        {stage.name}
                      </h4>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                          isCompleted
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                            : isActive
                              ? 'bg-brand-red/10 text-brand-red border border-brand-red/30'
                              : 'bg-muted text-muted-foreground border border-border'
                        }`}
                      >
                        {STAGE_LABEL[stage.status]}
                      </span>
                    </div>
                    {!stage.isFinal && stage.qualifiersPerSession > 0 && (
                      <p className="mt-0.5 text-[11px] font-bold text-muted-foreground">
                        Top {stage.qualifiersPerSession} tim lolos per sesi ke babak berikutnya
                      </p>
                    )}
                    {stage.isFinal && (
                      <p className="mt-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                        Babak Penentuan Juara (Podium 1, 2, 3)
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-xl bg-muted/40 px-2.5 py-1 text-[10px] font-bold text-muted-foreground border border-border">
                    {stage.sessions.length} Sesi Pertandingan
                  </span>
                </div>
              </div>

              {/* Stage Sessions List */}
              {si > 0 && stage.status === 'PENDING' && stage.sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-border bg-muted/10 py-8 px-4 text-center">
                  <Clock size={22} className="text-muted-foreground/60 animate-pulse" />
                  <div>
                    <p className="text-xs font-black text-foreground">
                      Menunggu Hasil {detail.stages[si - 1].name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Peserta babak ini akan otomatis diundi setelah babak sebelumnya selesai
                      difinalisasi.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  {stage.sessions.map((s) => {
                    const isSessionCompleted = s.status === 'COMPLETED';
                    const sortedParticipants = [...s.participants].sort((a, b) => {
                      const ra = s.results.find((r) => r.participantId === a.participantId)?.rank;
                      const rb = s.results.find((r) => r.participantId === b.participantId)?.rank;
                      return (ra ?? 99) - (rb ?? 99);
                    });

                    return (
                      <div
                        key={s.id}
                        className={`rounded-2xl border p-3.5 transition-all ${
                          isSessionCompleted
                            ? 'border-border bg-card shadow-2xs'
                            : 'border-brand-red/30 bg-brand-red/5 shadow-xs'
                        }`}
                      >
                        {/* Session Card Header */}
                        <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                          <div className="flex items-center gap-1.5">
                            <Flame
                              size={13}
                              className={
                                isSessionCompleted ? 'text-muted-foreground' : 'text-brand-red'
                              }
                            />
                            <p className="text-xs font-black uppercase tracking-wider text-foreground">
                              {s.name}
                            </p>
                          </div>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                              isSessionCompleted
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {isSessionCompleted ? 'Selesai' : 'Belum Dimainkan'}
                          </span>
                        </div>

                        {/* Participants List */}
                        <div className="space-y-1.5">
                          {sortedParticipants.map((p) => {
                            const res = s.results.find((r) => r.participantId === p.participantId);
                            const hasRank = res?.rank != null;
                            const rank = res?.rank;
                            const isQualified = res?.resultStatus === 'QUALIFIED';
                            const isEliminated = res?.resultStatus === 'ELIMINATED';

                            // Rank badge styling
                            const isRank1 = rank === 1;
                            const isRank2 = rank === 2;
                            const isRank3 = rank === 3;

                            return (
                              <div
                                key={p.participantId}
                                className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs transition-colors ${
                                  isQualified
                                    ? 'bg-emerald-500/10 border border-emerald-500/20'
                                    : hasRank
                                      ? 'bg-muted/40 border border-border/50'
                                      : 'bg-muted/20 border border-transparent'
                                }`}
                              >
                                {/* Rank Pill */}
                                <span
                                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-black ${
                                    isRank1
                                      ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-2xs'
                                      : isRank2
                                        ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-2xs'
                                        : isRank3
                                          ? 'bg-gradient-to-br from-amber-700 to-amber-900 text-white shadow-2xs'
                                          : hasRank
                                            ? 'bg-muted text-foreground'
                                            : 'bg-muted/60 text-muted-foreground/60'
                                  }`}
                                >
                                  {hasRank ? rank : '—'}
                                </span>

                                {/* Team Name */}
                                <div className="min-w-0 flex-1">
                                  <p
                                    className={`truncate text-xs font-bold leading-snug ${
                                      isQualified
                                        ? 'text-emerald-950 dark:text-emerald-200'
                                        : isEliminated
                                          ? 'text-muted-foreground line-through opacity-75'
                                          : 'text-foreground'
                                    }`}
                                  >
                                    {p.nama}
                                  </p>
                                  {p.sourceRank != null && p.sourceType !== 'INITIAL' && (
                                    <p className="text-[9px] text-muted-foreground">
                                      (Rank {p.sourceRank} babak lalu)
                                    </p>
                                  )}
                                </div>

                                {/* Status Badges */}
                                {isQualified && (
                                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                    <Check size={10} /> Lolos
                                  </span>
                                )}
                                {isEliminated && (
                                  <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold text-muted-foreground border border-border">
                                    Gugur
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Celebratory Grand Podium ─── */}
      {hasPodium && (
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-card to-card p-5 sm:p-7 shadow-md">
          {/* Decorative Sparkle */}
          <div className="absolute top-3 right-3 text-amber-500/30 animate-pulse">
            <Sparkles size={36} />
          </div>

          <div className="mb-6 flex items-center justify-center gap-2 text-center">
            <Trophy size={20} className="text-amber-500" />
            <h3 className="font-heading text-lg sm:text-xl font-black uppercase tracking-wider text-foreground">
              Podium Juara Utama
            </h3>
            <Trophy size={20} className="text-amber-500" />
          </div>

          {/* 3-Tier Olympic Podium Layout */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3 sm:items-end">
            {/* JUARA 2 (Silver - Left) */}
            <div className="order-2 sm:order-1 flex flex-col items-center rounded-2xl border border-slate-300/40 bg-card p-4 text-center shadow-xs">
              <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-md">
                <Medal size={20} />
              </span>
              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                <Medal size={12} /> Juara 2 · Perak
              </span>
              <p className="mt-1 text-sm font-black text-foreground truncate w-full">
                {nama(detail.teams, detail.podium.rank2)}
              </p>
            </div>

            {/* JUARA 1 (Gold - Center & Prominent) */}
            <div className="order-1 sm:order-2 flex flex-col items-center rounded-2xl border-2 border-amber-400 bg-gradient-to-b from-amber-500/15 via-card to-card p-5 text-center shadow-lg sm:-translate-y-2">
              <div className="relative mb-2.5">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30">
                  <Crown size={28} />
                </span>
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-amber-950">
                  #1
                </span>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                <Crown size={13} /> Juara 1 · Emas
              </span>
              <p className="mt-1 text-base font-black text-foreground truncate w-full">
                {nama(detail.teams, detail.podium.rank1)}
              </p>
            </div>

            {/* JUARA 3 (Bronze - Right) */}
            <div className="order-3 flex flex-col items-center rounded-2xl border border-amber-700/40 bg-card p-4 text-center shadow-xs">
              <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-700 to-amber-900 text-white shadow-md">
                <Award size={18} />
              </span>
              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-500">
                <Award size={12} /> Juara 3 · Perunggu
              </span>
              <p className="mt-1 text-sm font-black text-foreground truncate w-full">
                {nama(detail.teams, detail.podium.rank3)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
