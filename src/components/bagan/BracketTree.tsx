/**
 * BracketTree — single elimination view.
 * Props normalized dari getBracket (server). Match = unit utama.
 * Admin: tombol Input Hasil / Koreksi per match. Publik: read-only.
 */
import { ChevronRight, Trophy, Users } from 'lucide-react'
import { Button } from '../ui/button'
import type { BracketDetailView, MatchView, RoundView } from '../../lib/tournament/types'

export type { BracketDetailView, MatchView, RoundView } from '../../lib/tournament/types'

interface BracketTreeProps {
  detail: BracketDetailView
  prizes: Array<{ place: number; hadiah: string }>
  /** Admin actions (opsional = publik read-only). */
  admin?: {
    onSubmit: (match: MatchView) => void
    onCorrect: (match: MatchView) => void
  }
}

const STATUS_LABEL: Record<MatchView['status'], string> = {
  WAITING: 'Menunggu',
  READY: 'Siap',
  IN_PROGRESS: 'Berlangsung',
  COMPLETED: 'Selesai',
  AUTO_ADVANCED: 'BYE',
  CANCELLED: 'Dibatalkan',
}

function namaOf(detail: BracketDetailView, teamId: number | null): string {
  if (teamId === null) return ''
  return detail.participants.find((p) => p.teamId === teamId)?.nama ?? `Tim ${teamId}`
}

function winnerOf(match: MatchView): number | null {
  return match.winnerId
}

/** Nama round tujuan (untuk hint "lolos ke Semifinal"). */
function nextRoundName(detail: BracketDetailView, match: MatchView): string {
  if (match.nextMatchId === null) return ''
  for (const r of detail.rounds) {
    if (r.matches.some((m) => m.id === match.nextMatchId)) return r.name
  }
  return 'babak berikutnya'
}

function MatchCard({ detail, match, admin, showSeed }: { detail: BracketDetailView; match: MatchView; admin?: BracketTreeProps['admin']; showSeed?: boolean }) {
  const isCompleted = match.status === 'COMPLETED' || match.status === 'AUTO_ADVANCED'
  const winner = winnerOf(match)
  const nextName = nextRoundName(detail, match)

  return (
    <div
      className={`rounded-xl border px-3 py-2.5 text-xs transition ${
        isCompleted
          ? 'border-emerald-500/40 bg-emerald-500/5'
          : match.status === 'READY'
            ? 'border-brand-red/40 bg-card shadow-xs'
            : 'border-border/60 bg-background'
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
          Match {match.matchNumber}
        </span>
        <span
          className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
            isCompleted
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
              : match.status === 'READY'
                ? 'bg-brand-red/10 text-brand-red'
                : 'bg-muted text-muted-foreground'
          }`}
        >
          {STATUS_LABEL[match.status]}
        </span>
      </div>

      <div className="space-y-1">
        <div
          className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 ${
            match.participant1Id === null
              ? 'bg-muted/50 italic text-muted-foreground/70'
              : winner === match.participant1Id
                ? 'bg-emerald-500/10 font-extrabold text-emerald-700 dark:text-emerald-300'
                : isCompleted
                  ? 'text-muted-foreground line-through'
                  : 'font-bold text-foreground'
          }`}
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
          {showSeed && match.seed1 !== null && (
            <span className="shrink-0 rounded bg-brand-red/10 px-1 text-[9px] font-black leading-4 text-brand-red">S{match.seed1}</span>
          )}
          {match.participant1Id === null ? (match.status === 'WAITING' ? 'Winner Match' : 'BYE') : match.participant1Nama}
          {match.participant1Id !== null && winner === match.participant1Id && ' ✓'}
        </div>
        <div
          className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 ${
            match.participant2Id === null
              ? 'bg-muted/50 italic text-muted-foreground/70'
              : winner === match.participant2Id
                ? 'bg-emerald-500/10 font-extrabold text-emerald-700 dark:text-emerald-300'
                : isCompleted
                  ? 'text-muted-foreground line-through'
                  : 'font-bold text-foreground'
          }`}
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
          {showSeed && match.seed2 !== null && (
            <span className="shrink-0 rounded bg-brand-red/10 px-1 text-[9px] font-black leading-4 text-brand-red">S{match.seed2}</span>
          )}
          {match.participant2Id === null ? (match.status === 'WAITING' ? 'Winner Match' : 'BYE') : match.participant2Nama}
          {match.participant2Id !== null && winner === match.participant2Id && ' ✓'}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        {isCompleted && nextName ? (
          <span className="truncate text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            Lolos ke {nextName}
          </span>
        ) : match.status === 'READY' ? (
          <span className="text-[10px] text-muted-foreground">Menunggu hasil</span>
        ) : (
          <span className="text-[10px] text-muted-foreground">Menunggu pertandingan sebelumnya</span>
        )}
        {admin && !isCompleted && match.status === 'READY' && detail.bracket.status !== 'DRAFT' && (
          <Button size="sm" variant="outline" className="h-7 rounded-lg px-2 text-[10px] font-bold" onClick={() => admin.onSubmit(match)}>
            Input Hasil
          </Button>
        )}
        {admin && isCompleted && match.status !== 'AUTO_ADVANCED' && (
          <Button size="sm" variant="ghost" className="h-7 rounded-lg px-2 text-[10px] font-bold text-muted-foreground" onClick={() => admin.onCorrect(match)}>
            Koreksi
          </Button>
        )}
      </div>
    </div>
  )
}

function RoundColumn({ detail, round, admin }: { detail: BracketDetailView; round: RoundView; admin?: BracketTreeProps['admin'] }) {
  const showSeed = round.roundType === 'MAIN' && round.roundNumber === 1
  return (
    <div className="flex w-60 shrink-0 flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h4 className="text-xs font-black uppercase tracking-wider text-foreground">{round.name}</h4>
        <span className="text-[10px] font-bold text-muted-foreground">{round.matches.length} match</span>
      </div>
      {round.matches.map((m) => (
        <MatchCard key={m.id} detail={detail} match={m} admin={admin} showSeed={showSeed} />
      ))}
    </div>
  )
}

const PODIUM_LEVELS = [
  { rank: 1, label: 'Juara 1', emoji: '🥇', size: 'h-14 w-14 text-2xl', ring: 'ring-amber-300/50 bg-gradient-to-b from-amber-300 to-amber-500', labelCls: 'text-amber-600 dark:text-amber-400', nameCls: 'text-amber-900 dark:text-amber-300' },
  { rank: 2, label: 'Juara 2', emoji: '🥈', size: 'h-12 w-12 text-xl', ring: 'ring-slate-300/60 bg-gradient-to-b from-slate-200 to-slate-400', labelCls: 'text-slate-500 dark:text-slate-400', nameCls: 'text-slate-800 dark:text-slate-200' },
  { rank: 3, label: 'Juara 3', emoji: '🥉', size: 'h-10 w-10 text-lg', ring: 'ring-amber-700/30 bg-gradient-to-b from-amber-600 to-amber-800', labelCls: 'text-amber-700 dark:text-amber-500', nameCls: 'text-amber-950 dark:text-amber-300' },
]

export function PodiumPanel({ detail, prizes }: { detail: BracketDetailView; prizes: BracketTreeProps['prizes'] }) {
  const filled = detail.podium.rank1 !== null || detail.podium.rank2 !== null || detail.podium.rank3 !== null
  return (
    <div className="flex w-56 shrink-0 flex-col items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-50/50 px-4 py-5 dark:bg-amber-950/10">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
        <Trophy size={11} />
        Juara Utama
      </span>
      {!filled ? (
        <p className="py-5 text-center text-xs italic text-muted-foreground">Menunggu hasil final</p>
      ) : (
        <div className="flex flex-col items-center gap-2.5">
          {PODIUM_LEVELS.map((l) => {
            const teamId = l.rank === 1 ? detail.podium.rank1 : l.rank === 2 ? detail.podium.rank2 : detail.podium.rank3
            const prize = prizes.find((p) => p.place === l.rank)
            return (
              <div key={l.rank} className="flex flex-col items-center gap-1 text-center">
                <span className={`flex items-center justify-center rounded-full ${l.size} ${l.ring} ring-2 shadow-md select-none`}>
                  {l.emoji}
                </span>
                <span className={`text-[10px] font-black uppercase tracking-wider ${l.labelCls}`}>{l.label}</span>
                <span className={`max-w-40 truncate text-xs font-extrabold ${l.nameCls}`}>{teamId !== null ? namaOf(detail, teamId) : '-'}</span>
                {prize && prize.hadiah.trim() && (
                  <span className="rounded-md bg-background/60 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                    🎁 {prize.hadiah.trim()}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function BracketTree({ detail, prizes, admin }: BracketTreeProps) {
  const mainRounds = detail.rounds.filter((r) => r.roundType === 'MAIN')

  return (
    <div className="overflow-x-auto no-scrollbar">
      <div className="flex min-w-max items-start gap-4 p-1">
        {mainRounds.map((r, i) => (
          <div key={r.id} className="flex items-start gap-4">
            <RoundColumn detail={detail} round={r} admin={admin} />
            {i < mainRounds.length - 1 && (
              <div className="mt-10 flex flex-col items-center self-stretch justify-center gap-4">
                <ChevronRight size={18} className="text-muted-foreground/40" />
              </div>
            )}
          </div>
        ))}

        {detail.thirdPlaceMatch && (
          <div className="flex items-start gap-4">
            <div className="flex w-60 shrink-0 flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Perebutan Juara 3
                </h4>
                <span className="text-[10px] font-bold text-muted-foreground">1 match</span>
              </div>
              <MatchCard detail={detail} match={detail.thirdPlaceMatch} admin={admin} />
            </div>
          </div>
        )}

        <PodiumPanel detail={detail} prizes={prizes} />
      </div>

      {detail.bracket.participantCount < detail.bracket.bracketSize && (
        <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
          <Users size={12} />
          {detail.bracket.participantCount} peserta di bracket {detail.bracket.bracketSize} - tim yang dapat BYE otomatis maju.
        </p>
      )}
    </div>
  )
}

/** Skeleton berbentuk bracket untuk loading state. */
export function BracketTreeSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3].map((c) => (
          <div key={c} className="w-60 shrink-0 space-y-2">
            <div className="h-4 w-24 rounded-md bg-muted/60 animate-pulse" />
            {[1, 2, 3, 4].map((r) => (
              <div key={r} className="h-16 rounded-xl border border-border/60 bg-background animate-pulse" />
            ))}
          </div>
        ))}
        <div className="w-56 shrink-0 space-y-2">
          <div className="h-4 w-20 rounded-md bg-muted/60 animate-pulse" />
          <div className="h-40 rounded-2xl border border-amber-400/20 bg-amber-50/50 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
