/**
 * PetugasSnackPage — scan QR tim → centang siapa yang ambil → konfirmasi.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Check, TriangleAlert } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog'
import FeedbackBanner from '../../components/ui/FeedbackBanner'
import Scanner from '../../components/snack/Scanner'
import type { ScannerHandle } from '../../components/snack/Scanner'
import ConfirmForm from '../../components/snack/ConfirmForm'
import DuplicateWarning from '../../components/snack/DuplicateWarning'
import { getTeamByKode, getSessions, redeemSnack } from '../../server/functions/snack'
import type { SnackTeam, RedemptionInfo } from '../../server/functions/snack'
import { getSession } from '../../server/functions/auth'
import SessionPicker from '../../components/snack/SessionPicker'

export const Route = createFileRoute('/petugas/')({
  component: PetugasSnackPage,
})

type Stage = 'scan' | 'confirm' | 'dup' | 'success'

function PetugasSnackPage() {
  const [stage, setStage] = useState<Stage>('scan')
  const [team, setTeam] = useState<SnackTeam | null>(null)
  const [sessionName, setSessionName] = useState('')
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [sessions, setSessions] = useState<Array<{ id: number; name: string; quota: number; isActive: boolean }>>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [skipped, setSkipped] = useState<RedemptionInfo[]>([])
  const [inserted, setInserted] = useState(0)
  const [claimedBy, setClaimedBy] = useState('')

  // Modal "kode tidak dikenal"
  const [showUnknown, setShowUnknown] = useState(false)
  const [unknownCode, setUnknownCode] = useState('')
  const scannerRef = useRef<ScannerHandle>(null)

  // Load semua sesi + username petugas
  useEffect(() => {
    const init = async () => {
      const [allSessions, sess] = await Promise.all([getSessions(), getSession()])
      setSessions(allSessions)
      const active = allSessions.find((s) => s.isActive) ?? null
      setSessionId(active?.id ?? null)
      setSessionName(active?.name ?? '—')
      setClaimedBy(sess.username ?? 'petugas')
    }
    void init()
  }, [])

  const handleScan = useCallback(async (kode: string): Promise<boolean> => {
    setError(null)
    const found = await getTeamByKode({ data: { kode } })
    if (!found) {
      setUnknownCode(kode)
      setShowUnknown(true)
      return false
    }
    setTeam(found)
    setStage('confirm')
    return true
  }, [])

  const closeUnknown = () => {
    setShowUnknown(false)
    // Resume scanner setelah modal ditutup
    void scannerRef.current?.resume()
  }

  const pickSession = (id: number) => {
    const s = sessions.find((x) => x.id === id)
    if (!s) return
    setSessionId(id)
    setSessionName(s.name)
    setError(null)
  }

  const handleSubmit = async (employeeIds: number[]) => {
    if (!sessionId) {
      setError('Tidak ada sesi snack aktif')
      return
    }
    setSubmitting(true)
    setError(null)
    const res = await redeemSnack({ data: { sessionId, employeeIds, claimedBy } })
    setSubmitting(false)

    if (!res.ok) {
      setError(res.error ?? 'Gagal menyimpan')
      return
    }
    if (res.skipped.length > 0) {
      setSkipped(res.skipped)
      setStage('dup')
      return
    }
    setInserted(res.inserted)
    setStage('success')
  }

  const reset = () => {
    setStage('scan')
    setTeam(null)
    setError(null)
    setSkipped([])
  }

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-foreground">Scan QR Kelompok</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Pilih sesi, lalu pindai QR gelang tim.</p>
        </div>
        {stage === 'scan' && (
          <SessionPicker
            sessions={sessions.filter((s) => s.isActive)}
            value={sessionId}
            onChange={pickSession}
            placeholder={sessions.some((s) => s.isActive) ? 'Pilih sesi...' : 'Tidak ada sesi aktif'}
          />
        )}
      </section>

      {error && <FeedbackBanner tone="error">{error}</FeedbackBanner>}

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
      <AlertDialog open={showUnknown} onOpenChange={(o) => { if (!o) closeUnknown() }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <TriangleAlert size={18} />
              </div>
              <div className="min-w-0">
                <AlertDialogTitle className="text-base font-extrabold tracking-tight">QR Tidak Dikenal</AlertDialogTitle>
                <AlertDialogDescription className="mt-1 text-sm">
                  Kode ini bukan QR kelompok snack. Pindai QR gelang tim (PUTRA-1, PUTRI-2, PANITIA, dst).
                </AlertDialogDescription>
                {unknownCode && (
                  <p className="mt-2 truncate rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground" title={unknownCode}>
                    {unknownCode.slice(0, 40)}{unknownCode.length > 40 ? '…' : ''}
                  </p>
                )}
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogAction onClick={closeUnknown} className="w-full">Oke, Lanjut Scan</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}