/**
 * AdminScanPage — scan QR kelompok / manual input pengambilan snack.
 * Sama flow dengan petugas scan, tapi di area admin (AdminShell).
 */

import { createFileRoute } from '@tanstack/react-router';
import { Check, TriangleAlert } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import ConfirmForm from '../../../components/snack/ConfirmForm';
import DuplicateWarning from '../../../components/snack/DuplicateWarning';
import type { ScannerHandle } from '../../../components/snack/Scanner';
import Scanner from '../../../components/snack/Scanner';
import SessionPicker from '../../../components/snack/SessionPicker';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { PageHeader } from '../../../components/ui/page-header';
import { Skeleton } from '../../../components/ui/skeleton';
import { PetugasDashboardSkeleton } from '../../../components/ui/skeletons';
import { getSession } from '../../../server/functions/auth';
import type { RedemptionInfo, SnackTeam } from '../../../server/functions/snack';
import { getSessions, getTeamByKode, redeemSnack } from '../../../server/functions/snack';

export const Route = createFileRoute('/admin/snack/scan')({
  component: AdminScanPage,
  pendingComponent: PetugasDashboardSkeleton,
});

type Stage = 'scan' | 'confirm' | 'dup' | 'success';

function AdminScanPage() {
  const [stage, setStage] = useState<Stage>('scan');
  const [team, setTeam] = useState<SnackTeam | null>(null);
  const [sessionName, setSessionName] = useState('');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<
    Array<{ id: number; name: string; quota: number; isActive: boolean }>
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<RedemptionInfo[]>([]);
  const [inserted, setInserted] = useState(0);
  const [claimedBy, setClaimedBy] = useState('');
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // Modal "kode tidak dikenal"
  const [showUnknown, setShowUnknown] = useState(false);
  const [unknownCode, setUnknownCode] = useState('');
  const scannerRef = useRef<ScannerHandle>(null);

  // Load semua sesi + username admin
  useEffect(() => {
    const init = async () => {
      try {
        const [allSessions, sess] = await Promise.all([getSessions(), getSession()]);
        setSessions(allSessions);
        const active = allSessions.find((s) => s.isActive) ?? null;
        setSessionId(active?.id ?? null);
        setSessionName(active?.name ?? '—');
        setClaimedBy(sess.username ?? 'admin');
      } finally {
        setSessionsLoading(false);
      }
    };
    void init();
  }, []);

  const handleScan = useCallback(async (kode: string): Promise<boolean> => {
    setError(null);
    const found = await getTeamByKode({ data: { kode } });
    if (!found) {
      setUnknownCode(kode);
      setShowUnknown(true);
      return false;
    }
    setTeam(found);
    setStage('confirm');
    return true;
  }, []);

  const closeUnknown = () => {
    setShowUnknown(false);
    void scannerRef.current?.resume();
  };

  const pickSession = (id: number) => {
    const s = sessions.find((x) => x.id === id);
    if (!s) return;
    setSessionId(id);
    setSessionName(s.name);
    setError(null);
  };

  const handleSubmit = async (employeeIds: number[]) => {
    if (!sessionId) {
      setError('Tidak ada sesi snack aktif');
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await redeemSnack({ data: { sessionId, employeeIds, claimedBy } });
    setSubmitting(false);

    if (!res.ok) {
      setError(res.error ?? 'Gagal menyimpan');
      return;
    }
    if (res.skipped.length > 0) {
      setSkipped(res.skipped);
      setStage('dup');
      return;
    }
    setInserted(res.inserted);
    toast.success(`${res.inserted} porsi snack dicatat!`);
    setStage('success');
  };

  const reset = () => {
    setStage('scan');
    setTeam(null);
    setError(null);
    setSkipped([]);
  };

  if (sessionsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-44 rounded" />
            <Skeleton className="h-4 w-64 rounded" />
          </div>
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Scan QR Kelompok"
        subtitle="Pilih sesi, lalu pindai QR gelang tim."
        action={
          stage === 'scan' ? (
            <SessionPicker
              sessions={sessions.filter((s) => s.isActive)}
              value={sessionId}
              onChange={pickSession}
              placeholder={
                sessions.some((s) => s.isActive) ? 'Pilih sesi...' : 'Tidak ada sesi aktif'
              }
            />
          ) : undefined
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {stage === 'scan' && <Scanner ref={scannerRef} onScan={handleScan} />}

      {stage === 'confirm' && team && (
        <ConfirmForm
          team={team}
          sessionName={sessionName}
          submitting={submitting}
          onSubmit={handleSubmit}
          onBack={reset}
        />
      )}

      {stage === 'dup' && team && (
        <DuplicateWarning team={team} sessionName={sessionName} skipped={skipped} onReset={reset} />
      )}

      {stage === 'success' && (
        <Card className="border-success/40 bg-success/[0.03]">
          <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
              <Check size={24} />
            </div>
            <h2 className="mt-1 text-lg font-extrabold text-success">Berhasil!</h2>
            <p className="text-sm text-muted-foreground">{inserted} porsi snack dicatat.</p>
            <Button onClick={reset} className="mt-2 px-5">
              Scan Kelompok Lain
            </Button>
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <TriangleAlert size={18} />
              </div>
              <div className="min-w-0">
                <AlertDialogTitle className="text-base font-extrabold tracking-tight">
                  QR Tidak Dikenal
                </AlertDialogTitle>
                <AlertDialogDescription className="mt-1 text-sm">
                  Kode ini bukan QR kelompok snack. Pindai QR gelang tim (PUTRA-1, PUTRI-2, PANITIA,
                  dst).
                </AlertDialogDescription>
                {unknownCode && (
                  <p
                    className="mt-2 truncate rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground"
                    title={unknownCode}
                  >
                    {unknownCode.slice(0, 40)}
                    {unknownCode.length > 40 ? '…' : ''}
                  </p>
                )}
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogAction onClick={closeUnknown} className="w-full">
            Oke, Lanjut Scan
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
