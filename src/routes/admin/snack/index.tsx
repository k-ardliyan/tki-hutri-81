/**
 * AdminSnackDashboard — rekapitulasi real-time: summary + accordion detail.
 * Admin/superadmin. Bisa pilih sesi, lihat porsi vs kuota, detail siapa ambil.
 */
import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { getRedemptionSummary } from '../../../server/functions/snack'
import SnackTeamAccordion from '../../../components/snack/SnackTeamAccordion'
import SessionPicker from '../../../components/snack/SessionPicker'

export const Route = createFileRoute('/admin/snack/')({
  component: AdminSnackDashboard,
})

type Summary = {
  active: { id: number; name: string; quota: number; isActive: boolean; createdAt: Date } | null
  teams: Array<{
    id: number
    nama: string
    kode: string
    kategori: string
    total: number
    redeemed: number
    done: boolean
    full: boolean
  }>
  totalRedeemed: number
  totalQuota: number
  sessions: Array<{ id: number; name: string; quota: number; isActive: boolean; createdAt: Date }>
}

function AdminSnackDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [selectedSession, setSelectedSession] = useState<number | null>(null)

  const load = async (sessionId?: number) => {
    const s = await getRedemptionSummary({ data: { sessionId } })
    setSummary(s)
  }

  useEffect(() => {
    void load()
  }, [])

  const pickSession = async (id: number) => {
    setSelectedSession(id)
    await load(id)
  }

  const active = summary?.active
  const teams = summary?.teams ?? []
  const sessions = summary?.sessions ?? []

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">Dashboard Snack</h1>
          <p className="mt-0.5 text-sm text-slate-500">Rekapitulasi pengambilan snack real-time</p>
        </div>
        {/* Session picker — autocomplete (master data bisa banyak) */}
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <label className="shrink-0 text-xs font-bold text-slate-500">Sesi:</label>
          <SessionPicker
            sessions={sessions}
            value={selectedSession ?? active?.id ?? null}
            onChange={pickSession}
          />
        </div>
      </section>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="surface-card px-4 py-4">
          <p className="text-2xl font-extrabold text-slate-900">{active ? teams.filter((t) => t.done).length : 0}<span className="text-sm text-slate-400">/{teams.length}</span></p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Kelompok Ambil</p>
        </div>
        <div className="surface-card px-4 py-4">
          <p className="text-2xl font-extrabold text-slate-900">{active ? teams.filter((t) => t.full).length : 0}<span className="text-sm text-slate-400">/{teams.length}</span></p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Kelompok Lengkap</p>
        </div>
        <div className="surface-card px-4 py-4">
          <p className="text-2xl font-extrabold text-slate-900">{active ? summary.totalRedeemed : 0}<span className="text-sm text-slate-400">/{active?.quota ?? 0}</span></p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Porsi Terambil</p>
        </div>
        <div className="surface-card px-4 py-4">
          <p className={`text-2xl font-extrabold ${active && summary.totalQuota > 0 && summary.totalRedeemed >= summary.totalQuota ? 'text-status-done' : 'text-slate-900'}`}>
            {active && summary.totalQuota > 0 ? Math.round((summary.totalRedeemed / summary.totalQuota) * 100) : 0}%
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Kuota Terpakai</p>
        </div>
      </div>

      {/* Accordion detail per tim */}
      <section className="surface-card overflow-hidden">
        <div className="px-4 py-3">
          <p className="text-xs font-bold text-slate-600">Status Kelompok</p>
        </div>
        {teams.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-slate-400">Belum ada kelompok.</p>
        ) : (
          <SnackTeamAccordion teams={teams} sessionId={active?.id ?? null} />
        )}
      </section>
    </div>
  )
}
