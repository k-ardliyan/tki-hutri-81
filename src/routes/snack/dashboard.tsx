/**
 * SnackDashboard — dashboard employee-centric (PRD §26-28).
 * Admin & Petugas sama. Headline: entitled / claimed / remaining / progress.
 * Secondary: progress kelompok (NOT_STARTED/PARTIAL/COMPLETE).
 * Mobile-First UI/UX dengan live telemetri & progress bar terpadu.
 */

import { createFileRoute } from '@tanstack/react-router';
import {
  Boxes,
  CheckCircle2,
  Clock,
  PackageCheck,
  Percent,
  RefreshCw,
  Sparkles,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { SnackDashboardSkeleton } from '~/components/loading/skeletons';
import SessionPicker from '../../components/snack/SessionPicker';
import SnackTeamAccordion from '../../components/snack/SnackTeamAccordion';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { cn } from '../../lib/utils';
import { getRedemptionSummary, type TeamProgressRow } from '../../server/functions/snack';

export const Route = createFileRoute('/snack/dashboard')({
  component: SnackDashboardPage,
  pendingComponent: SnackDashboardSkeleton,
});

const TEAM_STATUS_LABEL: Record<TeamProgressRow['status'], string> = {
  NOT_STARTED: 'Belum Mulai',
  PARTIAL: 'Sebagian',
  COMPLETE: 'Lengkap',
};

const SESSION_STATUS_LABEL: Record<
  string,
  { label: string; dotClass: string; badgeClass: string }
> = {
  active: {
    label: 'Sedang Berlangsung',
    dotClass: 'bg-emerald-500 animate-pulse',
    badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  paused: {
    label: 'Dijeda',
    dotClass: 'bg-amber-500',
    badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  scheduled: {
    label: 'Dijadwalkan',
    dotClass: 'bg-blue-500',
    badgeClass: 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  closed: {
    label: 'Ditutup',
    dotClass: 'bg-slate-400',
    badgeClass: 'border-slate-500/30 bg-slate-500/10 text-muted-foreground',
  },
  draft: {
    label: 'Draf',
    dotClass: 'bg-slate-400',
    badgeClass: 'border-slate-500/30 bg-slate-500/10 text-muted-foreground',
  },
};

function SnackDashboardPage() {
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getRedemptionSummary>> | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);

  const load = useCallback(async (sessionId?: number) => {
    try {
      const s = await getRedemptionSummary({ data: sessionId ? { sessionId } : {} });
      setSummary(s);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    void load(selectedSessionId ?? undefined);
  };

  useEffect(() => {
    void load(selectedSessionId ?? undefined);
  }, [load, selectedSessionId]);

  // Real-time polling 10s (PRD §61)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  useEffect(() => {
    const t = setInterval(() => {
      void load(selectedSessionId ?? undefined);
    }, 10_000);
    return () => clearInterval(t);
  }, [load, selectedSessionId]);
  useEffect(() => {
    if (summary) setLastUpdated(new Date());
  }, [summary]);

  if (loading) return <SnackDashboardSkeleton />;

  const session = summary?.session ?? null;
  const effectiveStatus = summary?.effectiveStatus ?? 'NO_ACTIVE_SESSION';
  const entitled = summary?.entitled ?? 0;
  const claimed = summary?.claimed ?? 0;
  const remaining = summary?.remaining ?? 0;
  const progressPct = summary?.progressPct ?? 0;
  const stock = summary?.stock ?? null;
  const stockUsed = summary?.stockUsed ?? 0;
  const stockRemaining = summary?.stockRemaining ?? null;
  const teams = summary?.teams ?? [];
  const sessions = summary?.sessions ?? [];

  const completeTeams = teams.filter((t) => t.status === 'COMPLETE').length;
  const statusInfo = SESSION_STATUS_LABEL[effectiveStatus] ?? {
    label: effectiveStatus,
    dotClass: 'bg-slate-400',
    badgeClass: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="space-y-5">
      {/* Top Header Card — Clean & Glanceable on Mobile */}
      <Card className="border border-border/80 bg-gradient-to-br from-card to-muted/20 shadow-xs rounded-2xl overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn('size-2.5 rounded-full shrink-0', statusInfo.dotClass)} />
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-foreground truncate">
                  {session ? session.name : 'Dashboard Distribusi Snack'}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <Badge
                  variant="outline"
                  className={cn('text-[10px] px-1.5 py-0 font-bold', statusInfo.badgeClass)}
                >
                  {statusInfo.label}
                </Badge>
                {lastUpdated && (
                  <span className="flex items-center gap-1">
                    <Clock size={11} className="text-muted-foreground/60" />
                    <span>
                      Diperbarui{' '}
                      {lastUpdated.toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              {sessions.length > 1 && (
                <div className="flex-1 sm:flex-initial">
                  <SessionPicker
                    sessions={sessions}
                    value={selectedSessionId ?? session?.id ?? null}
                    onChange={setSelectedSessionId}
                    allLabel="Sesi Aktif (Otomatis)"
                  />
                </div>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="size-9 rounded-xl shrink-0"
                title="Muat Ulang Data"
              >
                <RefreshCw size={15} className={cn(refreshing && 'animate-spin text-primary')} />
              </Button>
            </div>
          </div>

          {/* Unified Progress Bar Telemetry */}
          {session && (
            <div className="pt-2 border-t border-border/60 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles size={13} className="text-primary" /> Progress Pembagian
                </span>
                <span className="font-mono font-extrabold text-primary">{progressPct}%</span>
              </div>
              <Progress value={progressPct} className="h-2.5 rounded-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4 Stat Cards Grid (Mobile 2-col, Desktop 4-col) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Berhak */}
        <Card className="rounded-2xl border border-border/80 bg-card shadow-xs">
          <CardContent className="p-3.5 sm:p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Berhak
              </span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Users size={14} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black tabular-nums text-foreground">
              {session ? entitled : 0}
            </p>
            <p className="text-[10px] text-muted-foreground">Total karyawan terdaftar</p>
          </CardContent>
        </Card>

        {/* Sudah Ambil */}
        <Card className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.03] shadow-xs">
          <CardContent className="p-3.5 sm:p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Sudah Ambil
              </span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={14} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">
              {session ? claimed : 0}
            </p>
            <p className="text-[10px] text-muted-foreground">Porsi snack diserahkan</p>
          </CardContent>
        </Card>

        {/* Belum Ambil */}
        <Card className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.03] shadow-xs">
          <CardContent className="p-3.5 sm:p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Belum Ambil
              </span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <PackageCheck size={14} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black tabular-nums text-amber-600 dark:text-amber-400">
              {session ? remaining : 0}
            </p>
            <p className="text-[10px] text-muted-foreground">Menunggu pengambilan</p>
          </CardContent>
        </Card>

        {/* Progress Rate */}
        <Card className="rounded-2xl border border-primary/30 bg-primary/[0.03] shadow-xs">
          <CardContent className="p-3.5 sm:p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
                Capaian
              </span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Percent size={14} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black tabular-nums text-primary">
              {session ? progressPct : 0}%
            </p>
            <p className="text-[10px] text-muted-foreground">Tingkat distribusi</p>
          </CardContent>
        </Card>
      </div>

      {/* Stok Card (Opsional / Quota based) */}
      {session && stock !== null && (
        <Card className="rounded-2xl border border-border/80 shadow-xs overflow-hidden">
          <CardContent className="p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-foreground shrink-0">
                  <Boxes size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">Kapasitas Stok Fisik</p>
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">{stockUsed}</strong> dari{' '}
                    <strong className="text-foreground">{stock}</strong> porsi terpakai
                  </p>
                </div>
              </div>

              <Badge
                variant="outline"
                className={cn(
                  'text-xs font-bold px-2 py-0.5 shrink-0',
                  stockRemaining === 0
                    ? 'border-destructive/40 bg-destructive/10 text-destructive'
                    : stockRemaining !== null && stockRemaining <= stock * 0.2
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                )}
              >
                {stockRemaining === 0 ? 'Stok Habis' : `Sisa ${stockRemaining} Porsi`}
              </Badge>
            </div>

            {/* Stock Progress Bar */}
            <Progress
              value={stock > 0 ? Math.min(100, Math.round((stockUsed / stock) * 100)) : 0}
              className="h-2 rounded-full"
            />
          </CardContent>
        </Card>
      )}

      {/* Team Progress Accordion Card */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-sm font-extrabold text-foreground">Progress Per Kelompok</h2>
            <p className="text-xs text-muted-foreground">
              {completeTeams} dari {teams.length} kelompok selesai mengambil
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono font-bold">
            {teams.length} Kelompok
          </Badge>
        </div>

        {teams.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="py-8 text-center text-xs text-muted-foreground">
              Belum ada data kelompok untuk sesi ini.
            </CardContent>
          </Card>
        ) : (
          <SnackTeamAccordion teams={teams} sessionId={session?.id ?? null} />
        )}
      </div>

      {!session && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={() => void load()} className="rounded-xl font-bold">
            Muat Ulang Data
          </Button>
        </div>
      )}
    </div>
  );
}

export { TEAM_STATUS_LABEL };
