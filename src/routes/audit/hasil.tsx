/**
 * AuditHasilPage — hasil audit 5R dengan daily log + peringkat.
 */
import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { Calendar, Clock3, Inbox, Medal, Trophy } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import ScoreBadge from '../../components/ui/ScoreBadge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { getRooms, getForms } from '../../server/functions/5r'
import type { FiveRForm, FiveRSubmission } from '../../data/5r'
import { scoreSubmission, aggregateRoom, round1 } from '../../lib/scoring'
import { todayPrefix } from '../../lib/dateUtils'
import { useSubmissions } from '../../lib/queries'

const searchSchema = z.object({
  room: z.string().optional(),
})

export const Route = createFileRoute('/audit/hasil')({
  validateSearch: searchSchema,
  loader: async () => {
    const [rooms, forms] = await Promise.all([getRooms(), getForms()])
    return { rooms, forms }
  },
  component: AuditHasilPage,
})

type Tab = 'peringkat' | 'log'

function AuditHasilPage() {
  const { rooms, forms } = Route.useLoaderData()
  const { room: selectedRoom } = Route.useSearch()
  const { data: submissions = [] } = useSubmissions()
  const [tab, setTab] = useState<Tab>('peringkat')
  const [dateFilter, setDateFilter] = useState(todayPrefix())

  const formMap = useMemo(() => new Map<string, FiveRForm>(forms.map((f) => [f.id, f])), [forms])
  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms])

  // Room ranking
  const roomScores = useMemo(() => rooms
    .map((room) => {
      const subs = submissions.filter((s) => s.roomId === room.id)
      const scores = subs
        .map((s) => {
          const form = formMap.get(s.formId)
          return form ? scoreSubmission(form, s) : null
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
      return { room, count: subs.length, final: aggregateRoom(scores), last: subs[0] }
    })
    .sort((a, b) => b.final - a.final),
  [rooms, submissions, formMap])

  const filteredRooms = selectedRoom ? roomScores.filter((r) => r.room.id === selectedRoom) : roomScores

  // Daily log — grouped by date
  const dailyLog = useMemo(() => {
    let list = [...submissions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (dateFilter) list = list.filter((s) => s.createdAt.startsWith(dateFilter))
    return list
  }, [submissions, dateFilter])

  const groupedLog = useMemo(() => {
    const groups = new Map<string, FiveRSubmission[]>()
    for (const sub of dailyLog) {
      const dateKey = sub.createdAt.slice(0, 10)
      const arr = groups.get(dateKey) ?? []
      arr.push(sub)
      groups.set(dateKey, arr)
    }
    return Array.from(groups.entries())
  }, [dailyLog])

  const today = todayPrefix()
  const todayCount = submissions.filter((s) => s.createdAt.startsWith(today)).length

  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">Hasil Audit 5R</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {submissions.length} penilaian total &middot; {todayCount} hari ini
        </p>
      </section>

      {/* Tab bar */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="peringkat">
            <Trophy size={14} className="mr-1" />Peringkat
          </TabsTrigger>
          <TabsTrigger value="log">
            <Clock3 size={14} className="mr-1" />Log Harian
            {todayCount > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[9px] text-primary-foreground">{todayCount}</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab: Peringkat */}
        <TabsContent value="peringkat" className="mt-3 space-y-3">
          {filteredRooms.map(({ room, count, final, last }, rank) => {
            const scoreBg = count === 0
              ? 'bg-muted text-muted-foreground'
              : final >= 80 ? 'bg-success/10 text-success'
                : final >= 60 ? 'bg-warning/10 text-warning'
                  : 'bg-destructive/10 text-destructive'
            return (
              <Card key={room.id}>
                <CardContent className="flex items-center gap-3 py-3.5">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-base font-bold ${
                    rank < 3 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground/60'
                  }`}>
                    {rank < 3 ? (
                      <Medal size={16} className={rank === 0 ? 'text-warning' : rank === 1 ? 'text-muted-foreground' : 'text-warning/80'} />
                    ) : rank + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-bold text-foreground">{room.name}</h2>
                    <p className="text-[10px] text-muted-foreground">
                      {room.pic}
                      {last && <>, {count}x dinilai</>}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums ${scoreBg}`}>
                    {count > 0 ? round1(final) : '--'}
                  </span>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        {/* Tab: Log Harian */}
        <TabsContent value="log" className="mt-3 space-y-4">
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-muted-foreground" />
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="flex-1"
                />
                {dateFilter && (
                  <Button variant="ghost" size="sm" onClick={() => setDateFilter('')} className="h-7 px-2 text-[10px] font-bold text-primary">
                    Semua
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {groupedLog.length === 0 && (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              <Inbox size={24} className="mx-auto mb-2 text-muted-foreground/30" />
              <p>Tidak ada penilaian{dateFilter ? ' pada tanggal ini' : ''}.</p>
            </Card>
          )}

          {groupedLog.map(([dateKey, subs]) => (
            <div key={dateKey}>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-xs font-extrabold text-foreground">
                  {formatDateHeader(dateKey)}
                </h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                  {subs.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {subs.map((s) => {
                  const room = roomMap.get(s.roomId)
                  const form = formMap.get(s.formId)
                  const score = form ? scoreSubmission(form, s) : null
                  return (
                    <Card key={s.id}>
                      <CardContent className="flex items-center gap-3 py-3">
                        {score ? (
                          <ScoreBadge value={round1(score.final)} showMax={false} className="min-w-8 justify-center" />
                        ) : (
                          <div className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">--</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-foreground">{room?.name ?? s.roomId}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {s.auditor} &middot; {formatTime(s.createdAt)}
                            {s.createdBy && <> &middot; @{s.createdBy}</>}
                          </p>
                        </div>
                        {score && (
                          <div className="flex gap-1">
                            {score.categories.map((c) => (
                              <span key={c.categoryId} className="hidden rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground sm:inline">
                                {c.label.split('.')[0]} {round1(c.percent)}%
                              </span>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function formatDateHeader(dateKey: string): string {
  const d = new Date(dateKey + 'T00:00:00Z')
  const today = todayPrefix()
  if (dateKey === today) return 'Hari Ini'
  const yesterday = new Date()
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const yesterdayKey = `${yesterday.getUTCFullYear()}-${String(yesterday.getUTCMonth() + 1).padStart(2, '0')}-${String(yesterday.getUTCDate()).padStart(2, '0')}`
  if (dateKey === yesterdayKey) return 'Kemarin'
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}
