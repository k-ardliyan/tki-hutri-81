import { useMemo } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { CalendarCheck, CalendarX, Check } from 'lucide-react'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { Badge } from '../../components/ui/badge'
import { CardContent } from '../../components/ui/card'
import { SectionCards } from '../../components/section-cards'
import RoomIcon from '../../components/ui/RoomIcon'
import { PageHeader } from '../../components/ui/page-header'
import { InteractiveCard } from '../../components/ui/interactive-card'
import { StatusBadge } from '../../components/ui/status-badge'
import { AuditDashboardSkeleton } from '../../components/ui/skeletons'
import { getRooms, getForms } from '../../server/functions/5r'
import type { FiveRForm } from '../../data/5r'
import { scoreSubmission, aggregateRoom, round1 } from '../../lib/scoring'
import { todayPrefix } from '../../lib/dateUtils'
import { useSubmissions } from '../../lib/queries'

const searchSchema = z.object({})

export const Route = createFileRoute('/audit/')({
  validateSearch: searchSchema,
  loader: async () => {
    const [rooms, forms] = await Promise.all([getRooms(), getForms()])
    return { rooms, forms }
  },
  component: AuditDashboardPage,
})

function AuditDashboardPage() {
  const { rooms, forms } = Route.useLoaderData()
  const navigate = useNavigate()
  const { data: submissions = [], isLoading } = useSubmissions()

  const formMap = useMemo(() => new Map<string, FiveRForm>(forms.map((f) => [f.id, f])), [forms])

  // Today's submissions
  const today = todayPrefix()
  const todaySubs = useMemo(
    () => submissions.filter((s) => s.createdAt.startsWith(today)),
    [submissions, today],
  )

  // All-time stats
  const allScores = useMemo(
    () => submissions
      .map((s) => {
        const form = formMap.get(s.formId)
        return form ? scoreSubmission(form, s) : null
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
    [submissions, formMap],
  )
  const avgScore = allScores.length > 0
    ? round1(allScores.reduce((s, x) => s + x.final, 0) / allScores.length)
    : 0

  // Per-room status
  const roomStatus = useMemo(() => rooms.map((room) => {
    const todayRoomSubs = todaySubs.filter((s) => s.roomId === room.id)
    const allRoomSubs = submissions.filter((s) => s.roomId === room.id)
    const scores = allRoomSubs
      .map((s) => {
        const form = formMap.get(s.formId)
        return form ? scoreSubmission(form, s) : null
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
    const final = aggregateRoom(scores)
    const doneToday = todayRoomSubs.length > 0
    const lastSub = allRoomSubs[0] // sorted desc by createdAt
    return { room, count: allRoomSubs.length, todayCount: todayRoomSubs.length, final, doneToday, lastSub }
  }), [rooms, todaySubs, submissions, formMap])

  const completed = roomStatus.filter((r) => r.doneToday).length
  const todayTotal = todaySubs.length

  if (isLoading) return <AuditDashboardSkeleton />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Audit 5R"
        subtitle={formatLongDate(new Date())}
      />

      {/* Today's summary banner */}
      {todayTotal > 0 ? (
        <Alert className="border-success/20 bg-success/[0.06] text-success">
          <CalendarCheck size={16} />
          <AlertDescription className="text-xs font-bold text-success">
            Hari ini: {todayTotal} penilaian dari {new Set(todaySubs.map((s) => s.roomId)).size} ruangan
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="bg-muted/40">
          <CalendarX size={16} />
          <AlertDescription className="text-xs font-semibold">Belum ada penilaian hari ini</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <SectionCards
        gridClass="grid-cols-2 lg:grid-cols-3"
        stats={[
          {
            label: 'Hari Ini',
            value: String(todayTotal),
            action: (
              <Badge variant="outline">
                <CalendarCheck className="mr-1 size-3.5" />
                {todayTotal}
              </Badge>
            ),
          },
          {
            label: 'Rata-rata',
            value: submissions.length > 0 ? String(avgScore) : '--',
            action: submissions.length > 0 ? (
              <StatusBadge score={avgScore}>Semua</StatusBadge>
            ) : undefined,
          },
          {
            label: 'Selesai Hari Ini',
            value: `${completed}/${rooms.length}`,
            action: (
              <StatusBadge status="success">
                <Check className="mr-1 size-3.5 inline" />
                {completed}
              </StatusBadge>
            ),
          },
        ]}
      />

      {/* Room status */}
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-extrabold tracking-tight text-foreground">Status Ruangan</h2>
          <span className="shrink-0 text-xs font-semibold text-muted-foreground">Klik untuk isi</span>
        </div>
        <div className="space-y-2.5">
          {roomStatus.map(({ room, count, final, doneToday, todayCount, lastSub }) => {
            return (
              <InteractiveCard
                key={room.id}
                onClick={() => navigate({ to: '/audit/isi', search: { room: room.id } })}
              >
                <CardContent className="flex items-center gap-3 p-3.5">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    doneToday ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground/60'
                  }`}>
                    {doneToday ? <Check size={16} /> : <RoomIcon name={room.icon} size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-bold text-foreground text-sm">{room.name}</p>
                      {doneToday && (
                        <StatusBadge status="success" className="px-1.5 py-0 text-[10px]">
                          <Check size={9} className="mr-0.5 inline" />Sudah
                        </StatusBadge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {room.pic}
                      {lastSub && !doneToday && (
                        <> &middot; Terakhir: {formatDateShort(lastSub.createdAt)}</>
                      )}
                      {doneToday && todayCount > 0 && (
                        <> &middot; {todayCount}x hari ini</>
                      )}
                    </p>
                  </div>
                  <StatusBadge score={count > 0 ? round1(final) : null} />
                </CardContent>
              </InteractiveCard>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function formatLongDate(d: Date): string {
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}
