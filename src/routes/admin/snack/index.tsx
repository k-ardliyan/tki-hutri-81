import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { SectionCards } from '../../../components/section-cards'
import { PageHeader } from '../../../components/ui/page-header'
import { StatusBadge } from '../../../components/ui/status-badge'
import { Users, PackageCheck, UtensilsCrossed, Percent } from 'lucide-react'
import { useRedemptionSummary } from '../../../lib/queries'
import SnackTeamAccordion from '../../../components/snack/SnackTeamAccordion'
import SessionPicker from '../../../components/snack/SessionPicker'
import { SnackDashboardSkeleton } from '../../../components/ui/skeletons'

export const Route = createFileRoute('/admin/snack/')({
  component: AdminSnackDashboard,
})

function AdminSnackDashboard() {
  const [selectedSession, setSelectedSession] = useState<number | null>(null)
  const { data: summary, isLoading } = useRedemptionSummary(selectedSession ?? undefined)

  const active = summary?.active
  const teams = summary?.teams ?? []
  const sessions = summary?.sessions ?? []

  if (isLoading) return <SnackDashboardSkeleton />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Snack"
        subtitle="Rekapitulasi pengambilan snack real-time"
        action={
          <div className="flex items-center gap-2">
            <label className="shrink-0 text-xs font-bold text-muted-foreground">Sesi:</label>
            <SessionPicker
              sessions={sessions}
              value={selectedSession ?? active?.id ?? null}
              onChange={setSelectedSession}
            />
          </div>
        }
      />

      {/* Summary cards */}
      <SectionCards
        stats={[
          {
            label: 'Kelompok Ambil',
            value: `${active ? teams.filter((t) => t.done).length : 0}/${teams.length}`,
            action: (
              <Badge variant="outline">
                <Users className="mr-1 size-3.5" />
                {teams.length}
              </Badge>
            ),
          },
          {
            label: 'Kelompok Lengkap',
            value: `${active ? teams.filter((t) => t.full).length : 0}/${teams.length}`,
            action: (
              <StatusBadge status="success">
                <PackageCheck className="size-3.5" />
              </StatusBadge>
            ),
          },
          {
            label: 'Porsi Terambil',
            value: `${active ? summary.totalRedeemed : 0}/${active?.quota ?? 0}`,
            action: (
              <StatusBadge status="warning">
                <UtensilsCrossed className="size-3.5" />
              </StatusBadge>
            ),
          },
          {
            label: 'Kuota Terpakai',
            value: active && summary.totalQuota > 0 ? `${Math.round((summary.totalRedeemed / summary.totalQuota) * 100)}%` : '0%',
            action: (
              <Badge variant="outline">
                <Percent className="size-3.5" />
              </Badge>
            ),
          },
        ]}
      />

      {/* Accordion detail per tim */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-bold text-muted-foreground mb-2">Status Kelompok</p>
          {teams.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">Belum ada kelompok.</p>
          ) : (
            <SnackTeamAccordion teams={teams} sessionId={active?.id ?? null} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}