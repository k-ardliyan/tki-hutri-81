/**
 * AdminScanPage — scan QR kelompok / manual input pengambilan snack.
 * Sama flow dengan petugas scan, tapi di area admin (AdminShell).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import Scanner from '../../../components/snack/Scanner'
import type { ScannerHandle } from '../../../components/snack/Scanner'
import ConfirmForm from '../../../components/snack/ConfirmForm'
import DuplicateWarning from '../../../components/snack/DuplicateWarning'
import { getTeamByKode, getSessions, redeemSnack } from '../../../server/functions/snack'
import type { SnackTeam, RedemptionInfo } from '../../../server/functions/snack'
import { getSession } from '../../../server/functions/auth'
import SessionPicker from '../../../components/snack/SessionPicker'

export const Route = createFileRoute('/admin/snack/scan')({
  component: AdminScanPage,
})

type Stage = 'scan' | 'confirm' | 'dup' | 'success'

function AdminScanPage() {
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

  // Load semua sesi + username admin
  useEffect(() => {
    const init = async () => {
      const [allSessions, sess] = await Promise.all([getSessions(), getSession()])
      setSessions(allSessions)
      const active = allSessions.find((s) => s.isActive) ?? null
      setSessionId(active?.id ?? null)
      setSessionName(active?.name ?? '—')
      setClaimedBy(sess.username ?? 'admin')
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
          <h1 className="text-lg font-extrabold tracking-tight text-slate-900">Scan QR Kelompok</h1>
          <p className="mt-0.5 text-sm text-slate-500">Pilih sesi, lalu pindai QR gelang tim.</p>
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

      {error && (
        <p className="rounded-[var(--radius-md)] bg-status-danger-soft px-3 py-2 text-xs font-semibold text-status-danger">
          {error}
        </p>
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
        <section className="surface-card border-status-done/40 bg-status-done/[0.03] px-4 py-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-status-done/10 text-status-done">
            <i className="fa-solid fa-check text-2xl" />
          </div>
          <h2 className="mt-3 text-lg font-extrabold text-status-done">Berhasil!</h2>
          <p className="mt-1 text-sm text-slate-600">{inserted} porsi snack dicatat.</p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 rounded-[var(--radius-md)] bg-brand-red px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 active:scale-95"
          >
            Scan Kelompok Lain
          </button>
        </section>
      )}

      {/* Modal alert — kode QR tidak dikenal */}
      {showUnknown && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="unknown-qr-title"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          onMouseDown={closeUnknown}
        >
          <div
            className="w-full max-w-sm rounded-[var(--radius-lg)] bg-white p-5 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-status-danger/10 text-status-danger">
                <i className="fa-solid fa-triangle-exclamation" />
              </div>
              <div className="min-w-0">
                <h3 id="unknown-qr-title" className="text-base font-extrabold tracking-tight text-slate-900">
                  QR Tidak Dikenal
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Kode ini bukan QR kelompok snack. Pindai QR gelang tim (PUTRA-1, PUTRI-2, PANITIA, dst).
                </p>
                {unknownCode && (
                  <p className="mt-2 truncate rounded-[var(--radius-md)] bg-slate-50 px-2 py-1 text-[10px] text-slate-400" title={unknownCode}>
                    {unknownCode.slice(0, 40)}{unknownCode.length > 40 ? '…' : ''}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={closeUnknown}
              className="mt-4 w-full rounded-[var(--radius-md)] bg-brand-red px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
            >
              Oke, Lanjut Scan
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
