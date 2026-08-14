/**
 * SnackDistribution — halaman operasional tunggal (admin & petugas, PRD §12-16).
 * Menggabungkan: indikator sesi otomatis, scan QR, cari nama/NIP (session-aware),
 * aktivitas terakhir. Mobile-First UI/UX dengan segmented mode.
 */

import { createFileRoute } from '@tanstack/react-router';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  History,
  Loader2,
  Package,
  QrCode,
  ScanLine,
  Search,
  TriangleAlert,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { SearchInput } from '~/components/common/SearchInput';
import { SnackDistributionSkeleton } from '~/components/loading/skeletons';
import ConfirmForm from '../../components/snack/ConfirmForm';
import DuplicateWarning from '../../components/snack/DuplicateWarning';
import type { ScannerHandle } from '../../components/snack/Scanner';
import Scanner from '../../components/snack/Scanner';
import SessionPicker from '../../components/snack/SessionPicker';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { useDebounce } from '../../hooks/use-debounce';
import { cn } from '../../lib/utils';
import {
  getCurrentSnackSession,
  getRedemptionHistory,
  getRedemptionsBySession,
  getTeamByKode,
  type RedemptionHistoryRow,
  redeemSnack,
  type SearchEmployeeResult,
  type SessionEffectiveStatus,
  type SnackSessionWithMeta,
  type SnackTeam,
  searchEmployees,
} from '../../server/functions/snack';

export const Route = createFileRoute('/snack/distribution')({
  component: SnackDistributionPage,
  pendingComponent: SnackDistributionSkeleton,
});

type Stage = 'scan' | 'confirm' | 'dup' | 'success';
type InputMode = 'qr' | 'search';

const STATUS_CONFIG: Record<
  SessionEffectiveStatus | 'NO_ACTIVE_SESSION',
  { label: string; dotClass: string; badgeClass: string }
> = {
  active: {
    label: 'Sedang Aktif',
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
  draft: {
    label: 'Draf',
    dotClass: 'bg-slate-400',
    badgeClass: 'border-slate-500/30 bg-slate-500/10 text-muted-foreground',
  },
  closed: {
    label: 'Ditutup',
    dotClass: 'bg-slate-400',
    badgeClass: 'border-slate-500/30 bg-slate-500/10 text-muted-foreground',
  },
  archived: {
    label: 'Diarsipkan',
    dotClass: 'bg-slate-400',
    badgeClass: 'border-slate-500/30 bg-slate-500/10 text-muted-foreground',
  },
  NO_ACTIVE_SESSION: {
    label: 'Tidak Ada Sesi',
    dotClass: 'bg-slate-400',
    badgeClass: 'border-slate-500/30 bg-slate-500/10 text-muted-foreground',
  },
};

function SnackDistributionPage() {
  // Sesi: auto-resolve via getCurrentSnackSession (PRD §37). Picker hanya utk override admin.
  const [session, setSession] = useState<SnackSessionWithMeta | null>(null);
  const [sessions, setSessions] = useState<SnackSessionWithMeta[]>([]);
  const [effectiveStatus, setEffectiveStatus] = useState<
    SessionEffectiveStatus | 'NO_ACTIVE_SESSION'
  >('NO_ACTIVE_SESSION');
  const [nextSession, setNextSession] = useState<{
    id: number;
    name: string;
    startsAt: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Segmented input mode for mobile operation focus
  const [inputMode, setInputMode] = useState<InputMode>('qr');

  // Stage machine
  const [stage, setStage] = useState<Stage>('scan');
  const [team, setTeam] = useState<SnackTeam | null>(null);
  const [teamClaims, setTeamClaims] = useState<
    Map<number, { claimedBy: string | null; claimedAt: string | null; voidedAt?: string | null }>
  >(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<
    Array<{ id: number; employeeId: number; claimedBy: string; claimedAt: string }>
  >([]);
  const [inserted, setInserted] = useState(0);

  // Modal kode tidak dikenal
  const [showUnknown, setShowUnknown] = useState(false);
  const [unknownCode, setUnknownCode] = useState('');
  const scannerRef = useRef<ScannerHandle>(null);

  // Search (PRD §17-18)
  const [q, setQ] = useState('');
  const debouncedQ = useDebounce(q, 250);
  const [results, setResults] = useState<SearchEmployeeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [redeemingId, setRedeemingId] = useState<number | null>(null);

  // Aktivitas terakhir (PRD §13)
  const [activity, setActivity] = useState<RedemptionHistoryRow[]>([]);

  // Idempotency (PRD §35)
  const batchRequestIdRef = useRef<string | null>(null);

  const refreshSession = useCallback(async () => {
    const cur = await getCurrentSnackSession();
    setSession(cur.session);
    setEffectiveStatus(cur.effectiveStatus);
    setNextSession(cur.nextSession);
  }, []);

  const refreshActivity = useCallback(async () => {
    try {
      const rows = await getRedemptionHistory({ data: { limit: 6 } });
      setActivity(rows);
    } catch {
      /* aktivitas opsional */
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([refreshSession(), refreshActivity()]);
        const { getSessions } = await import('../../server/functions/snack');
        setSessions(await getSessions());
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [refreshSession, refreshActivity]);

  // Search debounced — session-aware
  useEffect(() => {
    if (!debouncedQ.trim()) {
      setResults([]);
      return;
    }
    const doSearch = async () => {
      setSearching(true);
      setError(null);
      try {
        const res = await searchEmployees({
          data: { q: debouncedQ.trim(), sessionId: session?.id ?? undefined, limit: 12 },
        });
        setResults(res);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    };
    void doSearch();
  }, [debouncedQ, session?.id]);

  const handleScan = useCallback(
    async (kode: string): Promise<boolean> => {
      setError(null);
      const found = await getTeamByKode({ data: { kode } });
      if (!found) {
        setUnknownCode(kode);
        setShowUnknown(true);
        return false;
      }
      setTeam(found);
      setTeamClaims(new Map());
      if (session) {
        try {
          const details = await getRedemptionsBySession({
            data: { sessionId: session.id, teamId: found.id },
          });
          const map = new Map<
            number,
            { claimedBy: string | null; claimedAt: string | null; voidedAt?: string | null }
          >();
          for (const d of details) {
            if (d.claimedBy)
              map.set(d.employeeId, {
                claimedBy: d.claimedBy,
                claimedAt: d.claimedAt,
                voidedAt: d.voidedAt,
              });
          }
          setTeamClaims(map);
        } catch {
          /* detail opsional */
        }
      }
      setStage('confirm');
      return true;
    },
    [session]
  );

  const closeUnknown = () => {
    setShowUnknown(false);
    void scannerRef.current?.resume();
  };

  const pickSession = async (id: number | null) => {
    if (id === null) {
      // Kembali ke sesi otomatis (current) — reset override manual.
      await refreshSession();
      setError(null);
      setStage('scan');
      setTeam(null);
      batchRequestIdRef.current = null;
      return;
    }
    const s = sessions.find((x) => x.id === id) ?? null;
    setSession(s);
    if (s) setEffectiveStatus(s.effectiveStatus);
    setError(null);
    setStage('scan');
    setTeam(null);
    batchRequestIdRef.current = null;
  };

  const handleSubmit = async (employeeIds: number[]) => {
    if (!session) {
      setError('Tidak ada sesi snack aktif');
      return;
    }
    setSubmitting(true);
    setError(null);
    const requestId = batchRequestIdRef.current ?? crypto.randomUUID();
    batchRequestIdRef.current = requestId;
    let res: Awaited<ReturnType<typeof redeemSnack>> | null = null;
    try {
      res = await redeemSnack({
        data: { sessionId: session.id, employeeIds, source: 'QR_TEAM', requestId },
      });
    } catch {
      setError('Terjadi kesalahan saat mencatat snack. Coba lagi.');
      return;
    } finally {
      setSubmitting(false);
    }
    batchRequestIdRef.current = null;

    if (!res.ok) {
      setError(res.error ?? 'Gagal menyimpan');
      return;
    }
    if (res.idempotent) {
      toast.success('Pengambilan sudah tercatat sebelumnya');
      setStage('success');
      setInserted(0);
      void refreshActivity();
      return;
    }
    if (res.skipped.length > 0) {
      setSkipped(res.skipped);
      setStage('dup');
      return;
    }
    setInserted(res.inserted);
    toast.success(`${res.inserted} snack berhasil dicatat!`);
    setStage('success');
    void refreshSession();
    void refreshActivity();
  };

  const reset = () => {
    setStage('scan');
    setTeam(null);
    setTeamClaims(new Map());
    setError(null);
    setSkipped([]);
    batchRequestIdRef.current = null;
  };

  // Search → redeem satu orang
  const redeemOne = async (r: SearchEmployeeResult) => {
    if (!session) {
      setError('Tidak ada sesi snack aktif');
      return;
    }
    setError(null);
    setRedeemingId(r.id);
    try {
      const res = await redeemSnack({
        data: {
          sessionId: session.id,
          employeeIds: [r.id],
          source: 'SEARCH',
          requestId: crypto.randomUUID(),
        },
      });
      if (!res.ok) {
        setError(res.error ?? 'Gagal');
        return;
      }
      if (res.skipped.length > 0) {
        const sk = res.skipped[0];
        setError(
          `${sk.claimedBy} sudah ambil pada ${new Date(sk.claimedAt).toLocaleTimeString('id-ID')}`
        );
        return;
      }
      toast.success(`1 porsi untuk ${r.nama} berhasil dicatat!`);
      // Update locally in search results so the button updates immediately
      setResults((prev) =>
        prev.map((item) =>
          item.id === r.id
            ? {
                ...item,
                status: 'ENTITLED_CLAIMED',
                claimedAt: new Date().toISOString(),
                // claimedBy tidak diketahui dari response (server tidak return utk row baru);
                // jangan di-fake 'Petugas' — tampil tanpa "oleh" sampai refresh berikutnya.
                claimedBy: null,
              }
            : item
        )
      );
      void refreshSession();
      void refreshActivity();
    } catch {
      setError('Terjadi kesalahan saat mencatat snack');
    } finally {
      setRedeemingId(null);
    }
  };

  const disabledReason =
    effectiveStatus === 'NO_ACTIVE_SESSION'
      ? 'Tidak ada sesi snack aktif'
      : effectiveStatus === 'paused'
        ? 'Distribusi sementara dijeda oleh Admin'
        : effectiveStatus === 'closed'
          ? 'Sesi sudah ditutup'
          : effectiveStatus === 'scheduled'
            ? 'Sesi belum dimulai'
            : effectiveStatus === 'draft'
              ? 'Sesi masih draf'
              : null;
  const operational = !disabledReason;
  const statusCfg = STATUS_CONFIG[effectiveStatus] ?? STATUS_CONFIG.NO_ACTIVE_SESSION;

  if (loading) return <SnackDistributionSkeleton />;

  return (
    <div className="space-y-5">
      {/* Session Indicator Card — Mobile-First Compact & Informative */}
      <Card className="border border-border/80 bg-gradient-to-br from-card to-muted/20 shadow-xs rounded-2xl overflow-hidden">
        <CardContent className="p-3.5 sm:p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
                <ScanLine size={22} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn('size-2.5 rounded-full shrink-0', statusCfg.dotClass)} />
                  <p className="truncate text-base sm:text-lg font-extrabold tracking-tight text-foreground">
                    {session ? session.name : 'Belum Ada Pembagian Snack'}
                  </p>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  {session?.startsAt && session?.endsAt ? (
                    <span className="flex items-center gap-1">
                      <Clock size={11} className="shrink-0 text-muted-foreground/70" />
                      <span>{formatTimeRange(session.startsAt, session.endsAt)}</span>
                    </span>
                  ) : (
                    <span>Sesi tanpa jadwal</span>
                  )}
                  <span>·</span>
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] px-1.5 py-0 font-bold', statusCfg.badgeClass)}
                  >
                    {statusCfg.label}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Quick Session Switcher (Admin/Petugas) */}
            {sessions.length > 1 && (
              <div className="shrink-0">
                <SessionPicker
                  sessions={sessions}
                  value={session?.id ?? null}
                  onChange={(id) => void pickSession(id)}
                  placeholder="Ganti sesi..."
                  allLabel="Sesi Otomatis (Aktif)"
                />
              </div>
            )}
          </div>

          {/* Quick Metrics Bar if Session Active */}
          {session && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users size={13} className="text-primary shrink-0" />
                <span>
                  Berhak:{' '}
                  <strong className="font-semibold text-foreground">{session.entitled}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                <span>
                  Terambil:{' '}
                  <strong className="font-semibold text-foreground">{session.redeemed}</strong>
                </span>
              </div>
              {session.remaining !== null && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Package size={13} className="text-amber-500 shrink-0" />
                  <span>
                    Sisa:{' '}
                    <strong className="font-semibold text-foreground">{session.remaining}</strong>
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="size-4" />
          <AlertDescription className="text-xs sm:text-sm font-medium">{error}</AlertDescription>
        </Alert>
      )}

      {/* No-session State */}
      {!session && (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground/60">
              <Calendar size={26} />
            </div>
            <div className="space-y-1 max-w-sm">
              <h2 className="text-base font-extrabold text-foreground">
                Belum Ada Sesi Snack Aktif
              </h2>
              {nextSession ? (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sesi berikutnya: <strong className="text-foreground">{nextSession.name}</strong>
                  {nextSession.startsAt ? ` · mulai ${formatDateTime(nextSession.startsAt)}` : ''}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Admin belum membuat sesi snack aktif. Scanner dan pencarian sementara
                  dinonaktifkan.
                </p>
              )}
            </div>
            {nextSession && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void pickSession(nextSession.id)}
                className="mt-2 rounded-xl text-xs font-bold"
              >
                Buka Sesi: {nextSession.name}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Operational Area: Scan vs Manual with Segmented Switch */}
      {session && (
        <>
          {stage === 'scan' && (
            <div className="space-y-3">
              {/* Segmented Mode Switch Tabs */}
              <div className="grid grid-cols-2 p-1 bg-muted/60 rounded-xl border border-border/80">
                <button
                  type="button"
                  onClick={() => setInputMode('qr')}
                  className={cn(
                    'flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all select-none',
                    inputMode === 'qr'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <QrCode size={16} />
                  <span>Scan QR Kelompok</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('search')}
                  className={cn(
                    'flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all select-none',
                    inputMode === 'search'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Search size={16} />
                  <span>Cari Nama / NIP</span>
                  {results.length > 0 && <span className="size-2 rounded-full bg-primary" />}
                </button>
              </div>

              {/* QR Camera Mode */}
              {inputMode === 'qr' &&
                (operational ? (
                  <Scanner ref={scannerRef} onScan={handleScan} />
                ) : (
                  <Card className="rounded-2xl">
                    <CardContent className="flex flex-col items-center gap-2.5 py-10 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
                        <TriangleAlert size={24} />
                      </div>
                      <p className="text-sm font-bold text-foreground">{disabledReason}</p>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        Pengambilan baru tidak dapat dicatat saat sesi sedang ditutup atau dijeda.
                      </p>
                    </CardContent>
                  </Card>
                ))}

              {/* Manual Search Mode */}
              {inputMode === 'search' && (
                <Card className="rounded-2xl border border-border/80 shadow-xs overflow-hidden">
                  <CardContent className="p-3.5 sm:p-4 space-y-3">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-foreground">
                        Pencarian Karyawan Penerima Snack
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Ketik nama lengkap, panggilan, atau nomor induk karyawan (NIP).
                      </p>
                    </div>

                    <SearchInput
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      onClear={() => setQ('')}
                      loading={searching}
                      placeholder="Ketik nama atau NIP..."
                      disabled={!operational}
                      className="h-11 text-sm rounded-xl bg-background"
                      autoFocus
                    />

                    {searching && (
                      <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                        <Loader2 size={16} className="animate-spin text-primary" /> Mencari
                        karyawan...
                      </div>
                    )}

                    {!searching && results.length === 0 && !q.trim() && (
                      <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                        <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                          <Search size={18} className="opacity-50" />
                        </div>
                        <p className="text-xs">
                          Mulai mengetik untuk mencari karyawan yang berhak mengambil snack.
                        </p>
                      </div>
                    )}

                    {!searching && results.length === 0 && q.trim() && (
                      <div className="py-8 text-center text-xs text-muted-foreground">
                        Tidak ada karyawan ditemukan dengan kata kunci &ldquo;{q}&rdquo;.
                      </div>
                    )}

                    {results.length > 0 && (
                      <div className="divide-y divide-border rounded-xl border border-border/80 overflow-hidden max-h-80 overflow-y-auto">
                        {results.map((r) => {
                          const canRedeem = r.status === 'ENTITLED_UNCLAIMED';
                          const isClaimed = r.status === 'ENTITLED_CLAIMED';
                          const notEntitled = r.status === 'NOT_ENTITLED';

                          return (
                            <div
                              key={r.id}
                              className={cn(
                                'flex items-center gap-3 p-3 transition-colors',
                                isClaimed
                                  ? 'bg-muted/20'
                                  : canRedeem
                                    ? 'hover:bg-muted/40'
                                    : 'bg-muted/10 opacity-75'
                              )}
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-extrabold text-primary">
                                {r.nama.charAt(0)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p
                                  className={cn(
                                    'truncate text-sm font-semibold',
                                    isClaimed
                                      ? 'text-muted-foreground line-through'
                                      : 'text-foreground'
                                  )}
                                >
                                  {r.nama}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {r.divisi ?? 'Umum'}
                                  {r.nip ? ` · ${r.nip}` : ''}
                                </p>
                                {isClaimed && r.claimedAt && (
                                  <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                                    <Check size={11} className="shrink-0" />
                                    <span>
                                      Sudah diambil {formatTime(r.claimedAt)}
                                      {r.claimedBy ? ` · oleh ${r.claimedBy}` : ''}
                                    </span>
                                  </p>
                                )}
                                {notEntitled && (
                                  <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                                    Tidak termasuk penerima sesi ini
                                  </p>
                                )}
                              </div>
                              <Button
                                size="sm"
                                disabled={!canRedeem || !operational}
                                loading={redeemingId === r.id}
                                onClick={() => void redeemOne(r)}
                                className={cn(
                                  'shrink-0 h-9 px-4 rounded-xl text-xs font-bold shadow-xs',
                                  isClaimed
                                    ? 'border border-border bg-muted text-muted-foreground hover:bg-muted'
                                    : ''
                                )}
                              >
                                {isClaimed ? 'Sudah' : 'Ambil'}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {stage === 'confirm' && team && (
            <ConfirmForm
              team={team}
              sessionName={session.name}
              submitting={submitting}
              claimed={teamClaims}
              onSubmit={handleSubmit}
              onBack={reset}
            />
          )}

          {stage === 'dup' && team && (
            <DuplicateWarning
              team={team}
              sessionName={session.name}
              skipped={skipped}
              onReset={reset}
            />
          )}

          {stage === 'success' && (
            <Card className="border-emerald-500/40 bg-emerald-500/[0.04] rounded-2xl shadow-sm">
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-sm animate-in zoom-in-50 duration-300">
                  <Check size={32} />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                    Snack Berhasil Dicatat!
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {inserted > 0
                      ? `${inserted} snack telah berhasil dibagikan.`
                      : 'Status telah diverifikasi.'}
                  </p>
                </div>
                <Button
                  onClick={() => {
                    reset();
                    void scannerRef.current?.resume();
                  }}
                  size="lg"
                  className="mt-3 px-6 h-11 text-sm font-bold rounded-xl shadow-md"
                >
                  <ScanLine size={16} className="mr-2" /> Scan Kelompok Lain
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Aktivitas Terakhir (PRD §13) — Compact Feed Card */}
      {activity.length > 0 && (
        <Card className="rounded-2xl border border-border/80 shadow-xs">
          <CardContent className="p-3.5 sm:p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History size={15} className="text-primary" />
                <p className="text-xs font-bold text-foreground">Aktivitas Terakhir</p>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">Real-time feed</span>
            </div>
            <div className="divide-y divide-border/60">
              {activity.map((a) => (
                <div key={a.id} className="flex items-center gap-3 py-2">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Check size={12} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {a.employeeName}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {a.sessionName} · {formatTime(a.claimedAt)}
                      {a.claimedBy ? ` · oleh ${a.claimedBy}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium">
                      {a.source === 'QR_TEAM' ? 'QR' : a.source === 'SEARCH' ? 'Cari' : a.source}
                    </Badge>
                    {a.voidedAt && (
                      <Badge variant="destructive" className="text-[9px] px-1 py-0">
                        VOID
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AlertDialog — kode QR tidak dikenal */}
      <AlertDialog
        open={showUnknown}
        onOpenChange={(o) => {
          if (!o) closeUnknown();
        }}
      >
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                <TriangleAlert size={20} />
              </div>
              <div className="min-w-0">
                <AlertDialogTitle className="text-base font-extrabold tracking-tight">
                  QR Tidak Dikenali
                </AlertDialogTitle>
                <AlertDialogDescription className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Pastikan kode QR merupakan QR kelompok snack (PUTRA-1, PUTRI-2, PANITIA, dst).
                </AlertDialogDescription>
                {unknownCode && (
                  <p
                    className="mt-2.5 truncate rounded-lg bg-muted px-2.5 py-1.5 font-mono text-[11px] font-semibold text-muted-foreground border border-border"
                    title={unknownCode}
                  >
                    {unknownCode}
                  </p>
                )}
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogAction
            onClick={closeUnknown}
            className="w-full h-10 rounded-xl text-xs font-bold"
          >
            Oke, Lanjut Scan
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function formatTimeRange(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const d = s.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  const st = s.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const et = e.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return `${d}, ${st}–${et}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}
