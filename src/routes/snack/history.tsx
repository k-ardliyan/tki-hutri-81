/**
 * SnackHistory — riwayat aktivitas distribusi (PRD §29).
 * Filter sesi + pencarian karyawan + daftar klaim (source QR/Cari, voided ditandai).
 * Mobile-First UI/UX: responsive feed cards & mobile drawer void dialog.
 */

import { createFileRoute } from '@tanstack/react-router';
import { History, RotateCcw, Search, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SnackHistorySkeleton } from '~/components/loading/skeletons';
import SessionPicker from '../../components/snack/SessionPicker';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ResponsiveDialog } from '../../components/ui/responsive-dialog';
import { Textarea } from '../../components/ui/textarea';
import { cn } from '../../lib/utils';
import {
  getRedemptionHistory,
  getSessions,
  type RedemptionHistoryRow,
  type SnackSessionWithMeta,
  voidRedemption,
} from '../../server/functions/snack';

export const Route = createFileRoute('/snack/history')({
  component: SnackHistoryPage,
  pendingComponent: SnackHistorySkeleton,
});

const SOURCE_LABEL: Record<string, { label: string; className: string }> = {
  QR_TEAM: { label: 'QR Kelompok', className: 'border-primary/30 bg-primary/10 text-primary' },
  SEARCH: {
    label: 'Cari Manual',
    className: 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  ADMIN_CORRECTION: {
    label: 'Koreksi Admin',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  MIGRATION: {
    label: 'Migrasi',
    className: 'border-slate-500/30 bg-slate-500/10 text-muted-foreground',
  },
};

function SnackHistoryPage() {
  const context = Route.useRouteContext() as { snackRole?: string } | undefined;
  const snackRole = context?.snackRole;
  const [rows, setRows] = useState<RedemptionHistoryRow[]>([]);
  const [sessions, setSessions] = useState<SnackSessionWithMeta[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Void / koreksi (PRD §31-33, AC-A03): admin-only, alasan wajib.
  const isAdmin = snackRole === 'superadmin' || snackRole === 'admin';
  const [voidTarget, setVoidTarget] = useState<RedemptionHistoryRow | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidError, setVoidError] = useState<string | null>(null);
  const [voiding, setVoiding] = useState(false);

  const load = useCallback(async (sessionId?: number) => {
    try {
      const r = await getRedemptionHistory({ data: sessionId ? { sessionId } : { limit: 150 } });
      setRows(r);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void getSessions().then(setSessions);
    void load(selectedSessionId ?? undefined);
  }, [load, selectedSessionId]);

  const confirmVoid = async () => {
    if (!voidTarget) return;
    setVoiding(true);
    setVoidError(null);
    try {
      const res = await voidRedemption({
        data: { redemptionId: voidTarget.id, reason: voidReason.trim() },
      });
      if (!res.ok) {
        setVoidError(res.error ?? 'Gagal membatalkan');
        return;
      }
      setVoidTarget(null);
      setVoidReason('');
      void load(selectedSessionId ?? undefined);
    } catch (e) {
      setVoidError(e instanceof Error ? e.message : 'Gagal membatalkan');
    } finally {
      setVoiding(false);
    }
  };

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase().trim();
    return rows.filter(
      (r) =>
        r.employeeName.toLowerCase().includes(q) ||
        r.sessionName.toLowerCase().includes(q) ||
        r.claimedBy?.toLowerCase().includes(q)
    );
  }, [rows, searchQuery]);

  if (loading) return <SnackHistorySkeleton />;

  return (
    <div className="space-y-5">
      {/* Top Filter Header Card */}
      <Card className="border border-border/80 bg-gradient-to-br from-card to-muted/20 shadow-xs rounded-2xl overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                  <History size={17} />
                </div>
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-foreground">
                  Riwayat Distribusi Snack
                </h1>
              </div>
              <p className="text-xs text-muted-foreground pl-10">
                Log aktivitas pengambilan snack, metode scan/cari, dan riwayat pembatalan.
              </p>
            </div>

            {sessions.length > 1 && (
              <div className="self-stretch sm:self-auto">
                <SessionPicker
                  sessions={sessions}
                  value={selectedSessionId}
                  onChange={setSelectedSessionId}
                  placeholder="Semua sesi"
                />
              </div>
            )}
          </div>

          {/* Quick Search Input */}
          <div className="relative pt-1">
            <Search
              size={15}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama karyawan atau petugas..."
              className="pl-9 pr-8 h-9 text-xs sm:text-sm rounded-xl bg-background"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 text-xs"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* History List */}
      <Card className="rounded-2xl border border-border/80 shadow-xs overflow-hidden">
        <CardContent className="p-3.5 sm:p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium px-1">
            <span>Menampilkan {filteredRows.length} riwayat</span>
            {searchQuery && (
              <span className="text-primary font-semibold">
                Filter: &ldquo;{searchQuery}&rdquo;
              </span>
            )}
          </div>

          {filteredRows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
                <History size={22} className="opacity-40" />
              </div>
              <p className="text-xs font-semibold">
                {searchQuery
                  ? 'Tidak ada data cocok dengan pencarian.'
                  : 'Belum ada aktivitas distribusi.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filteredRows.map((r) => {
                const src = SOURCE_LABEL[r.source] ?? {
                  label: r.source,
                  className: 'bg-muted text-muted-foreground',
                };
                const isVoided = !!r.voidedAt;

                return (
                  <div
                    key={r.id}
                    className={cn(
                      'py-3 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 transition-colors',
                      isVoided ? 'opacity-70' : ''
                    )}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-extrabold text-primary mt-0.5">
                        {r.employeeName.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p
                            className={cn(
                              'text-sm font-bold truncate',
                              isVoided ? 'text-muted-foreground line-through' : 'text-foreground'
                            )}
                          >
                            {r.employeeName}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn('text-[9px] px-1.5 py-0 font-bold', src.className)}
                          >
                            {src.label}
                          </Badge>
                          {isVoided && (
                            <Badge
                              variant="destructive"
                              className="text-[9px] px-1.5 py-0 font-extrabold"
                            >
                              VOID
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <strong className="text-foreground/80 font-semibold">
                            {r.sessionName}
                          </strong>
                          <span>·</span>
                          <span>{formatDateTime(r.claimedAt)}</span>
                          {r.claimedBy && (
                            <>
                              <span>·</span>
                              <span>
                                oleh <strong className="text-foreground/80">{r.claimedBy}</strong>
                              </span>
                            </>
                          )}
                        </p>

                        {/* Voided Details Banner */}
                        {isVoided && (
                          <div className="mt-1.5 rounded-lg bg-destructive/10 border border-destructive/20 p-2 text-[11px] text-destructive leading-snug">
                            <span className="font-bold">Dibatalkan:</span> {r.voidReason ?? '—'}
                            {r.voidedBy ? ` (oleh ${r.voidedBy})` : ''}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button for Admin */}
                    {isAdmin && !isVoided && (
                      <div className="flex sm:justify-end shrink-0 pl-12 sm:pl-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40 rounded-xl"
                          onClick={() => {
                            setVoidTarget(r);
                            setVoidReason('');
                            setVoidError(null);
                          }}
                        >
                          <RotateCcw size={13} className="mr-1.5" />
                          Batalkan
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Responsive Void Confirmation Drawer/Dialog */}
      <ResponsiveDialog
        open={!!voidTarget}
        onOpenChange={(o) => {
          if (!o) setVoidTarget(null);
        }}
        title="Batalkan Pencatatan Snack"
        description="Pengambilan snack karyawan ini akan dibatalkan, dan karyawan akan kembali berhak mengambil snack pada sesi ini."
        footer={
          <div className="flex w-full gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setVoidTarget(null)}
              disabled={voiding}
              className="flex-1 sm:flex-none rounded-xl"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmVoid()}
              disabled={voiding || !voidReason.trim()}
              loading={voiding}
              className="flex-1 sm:flex-none rounded-xl font-bold"
            >
              {voiding ? 'Membatalkan...' : 'Batalkan Pengambilan'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {voidTarget && (
            <div className="p-3 rounded-xl bg-muted/50 border border-border/80 text-xs space-y-1">
              <p className="font-bold text-foreground">{voidTarget.employeeName}</p>
              <p className="text-muted-foreground">
                {voidTarget.sessionName} · {formatDateTime(voidTarget.claimedAt)}
                {voidTarget.claimedBy ? ` · oleh ${voidTarget.claimedBy}` : ''}
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="void-reason" className="text-xs font-bold text-foreground">
              Alasan Pembatalan (Wajib) *
            </Label>
            <Textarea
              id="void-reason"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Contoh: Salah klik anggota / porsi belum diserahkan"
              rows={3}
              className="rounded-xl text-xs sm:text-sm"
              autoFocus
            />
          </div>

          {voidError && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription className="text-xs">{voidError}</AlertDescription>
            </Alert>
          )}
        </div>
      </ResponsiveDialog>
    </div>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
