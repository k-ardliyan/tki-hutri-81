/**
 * AuditDashboardPage — dashboard untuk tim audit.
 */
import { useMemo } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { CalendarCheck, CalendarX, Check } from 'lucide-react'
import { Card, CardContent } from '../../components/ui/card'
import RoomIcon from '../../components/ui/RoomIcon'
import StatCard from '../../components/ui/StatCard'
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
  const { data: submissions = [] } = useSubmissions()

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

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-lg font-extrabold tracking-tight text-foreground">Dashboard Audit 5R</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {formatLongDate(new Date())}
        </p>
      </section>

      {/* Today's summary banner */}
      {todayTotal > 0 ? (
        <div className="rounded-lg border border-success/20 bg-success/[0.06] px-4 py-3">
          <div className="flex items-center gap-2">
            <CalendarCheck size={16} className="text-success" />
            <p className="text-xs font-bold text-success">
              Hari ini: {todayTotal} penilaian dari {new Set(todaySubs.map((s) => s.roomId)).size} ruangan
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <CalendarX size={16} className="text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground">Belum ada penilaian hari ini</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard center icon={CalendarCheck} label="Hari Ini" value={String(todayTotal)} />
        <StatCard center icon={Check} iconCls="bg-warning/10 text-warning" label="Rata-rata" value={submissions.length > 0 ? String(avgScore) : '--'} />
        <StatCard center icon={Check} iconCls="bg-success/10 text-success" label="Selesai Hari Ini" value={`${completed}/${rooms.length}`} />
      </div>

      {/* Room status */}
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-extrabold tracking-tight text-foreground">Status Ruangan</h2>
          <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">Klik untuk isi</span>
        </div>
        <div className="space-y-2">
          {roomStatus.map(({ room, count, final, doneToday, todayCount, lastSub }) => {
            const badgeBg = !doneToday
              ? 'bg-muted text-muted-foreground'
              : final >= 80 ? 'bg-success/10 text-success'
                : final >= 60 ? 'bg-warning/10 text-warning'
                  : 'bg-destructive/10 text-destructive'
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => navigate({ to: '/audit/isi', search: { room: room.id } })}
                className="cursor-pointer text-left transition active:scale-[0.99]"
              >
                <Card className="hover:bg-muted/40">
                  <CardContent className="flex items-center gap-3 py-3.5">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
                      doneToday ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground/60'
                    }`}>
                      {doneToday ? <Check size={14} /> : <RoomIcon name={room.icon} size={14} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-bold text-foreground">{room.name}</p>
                        {doneToday && (
                          <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                            <Check size={9} className="mr-0.5 inline" />Sudah
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {room.pic}
                        {lastSub && !doneToday && (
                          <> &middot; Terakhir: {formatDateShort(lastSub.createdAt)}</>
                        )}
                        {doneToday && todayCount > 0 && (
                          <> &middot; {todayCount}x hari ini</>
                        )}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeBg}`}>
                      {count > 0 ? round1(final) : '--'}
                    </span>
                  </CardContent>
                </Card>
              </button>
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
