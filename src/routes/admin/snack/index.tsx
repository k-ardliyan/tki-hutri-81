/**
 * AdminSnackDashboard — rekapitulasi real-time: summary + accordion detail.
 */
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from '../../../components/ui/card'
import StatCard from '../../../components/ui/StatCard'
import { UtensilsCrossed, Users, PackageCheck, Percent } from 'lucide-react'
import { useRedemptionSummary } from '../../../lib/queries'
import SnackTeamAccordion from '../../../components/snack/SnackTeamAccordion'
import SessionPicker from '../../../components/snack/SessionPicker'

export const Route = createFileRoute('/admin/snack/')({
  component: AdminSnackDashboard,
})

function AdminSnackDashboard() {
  const [selectedSession, setSelectedSession] = useState<number | null>(null)
  const { data: summary } = useRedemptionSummary(selectedSession ?? undefined)

  const active = summary?.active
  const teams = summary?.teams ?? []
  const sessions = summary?.sessions ?? []

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">Dashboard Snack</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Rekapitulasi pengambilan snack real-time</p>
        </div>
        {/* Session picker — autocomplete (master data bisa banyak) */}
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <label className="shrink-0 text-xs font-bold text-muted-foreground">Sesi:</label>
          <SessionPicker
            sessions={sessions}
            value={selectedSession ?? active?.id ?? null}
            onChange={setSelectedSession}
          />
        </div>
      </section>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Kelompok Ambil"
          value={`${active ? teams.filter((t) => t.done).length : 0}/${teams.length}`}
        />
        <StatCard
          icon={PackageCheck}
          iconCls="bg-success/10 text-success"
          label="Kelompok Lengkap"
          value={`${active ? teams.filter((t) => t.full).length : 0}/${teams.length}`}
        />
        <StatCard
          icon={UtensilsCrossed}
          iconCls="bg-warning/10 text-warning"
          label="Porsi Terambil"
          value={`${active ? summary.totalRedeemed : 0}/${active?.quota ?? 0}`}
        />
        <StatCard
          icon={Percent}
          label="Kuota Terpakai"
          value={active && summary.totalQuota > 0 ? `${Math.round((summary.totalRedeemed / summary.totalQuota) * 100)}%` : '0%'}
        />
      </div>

      {/* Accordion detail per tim */}
      <Card>
        <CardContent className="px-0 py-0">
          <div className="px-4 py-3">
            <p className="text-xs font-bold text-muted-foreground">Status Kelompok</p>
          </div>
          {teams.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">Belum ada kelompok.</p>
          ) : (
            <SnackTeamAccordion teams={teams} sessionId={active?.id ?? null} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}