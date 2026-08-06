/**
 * AdminDashboardPage — dashboard panitia dengan statistik informatif.
 */
import { useMemo } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { ChartLine, CircleCheck, ClipboardList, SquarePen, TriangleAlert } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import EmptyState from '../../components/ui/EmptyState'
import { Progress } from '../../components/ui/progress'
import RoomIcon from '../../components/ui/RoomIcon'
import ScoreBadge from '../../components/ui/ScoreBadge'
import SectionHeader from '../../components/ui/SectionHeader'
import { Skeleton } from '../../components/ui/skeleton'
import StatCard from '../../components/ui/StatCard'
import { getRooms, getForms } from '../../server/functions/5r'
import type { FiveRForm, FiveRSubmission } from '../../data/5r'
import { scoreSubmission, aggregateRoom, round1 } from '../../lib/scoring'
import type { SubmissionScore } from '../../lib/scoring'
import { useSubmissions } from '../../lib/queries'

const searchSchema = z.object({
  room: z.string().optional(),
})

export const Route = createFileRoute('/admin/')({
  validateSearch: searchSchema,
  loader: async () => {
    const [rooms, forms] = await Promise.all([getRooms(), getForms()])
    return { rooms, forms }
  },
  component: AdminDashboardPage,
})

function AdminDashboardPage() {
  const { rooms, forms } = Route.useLoaderData()
  const navigate = useNavigate()
  const { data: submissions = [], isLoading } = useSubmissions()

  const formMap = useMemo(() => new Map<string, FiveRForm>(forms.map((f) => [f.id, f])), [forms])

  // ── Hitung semua skor ──
  const scored = useMemo(() => {
    const list: SubmissionScore[] = []
    for (const s of submissions) {
      const form = formMap.get(s.formId)
      if (!form) continue
      try {
        list.push(scoreSubmission(form, s))
      } catch {
        // data korup — skip
      }
    }
    return list
  }, [submissions, formMap])

  // ── Statistik utama ──
  const totalSubs = submissions.length
  const avgScore = scored.length > 0 ? round1(scored.reduce((s, x) => s + x.final, 0) / scored.length) : 0
  const roomsDone = new Set(submissions.map((s) => s.roomId)).size
  const coveragePct = rooms.length > 0 ? Math.round((roomsDone / rooms.length) * 100) : 0

  const todayKey = new Date().toDateString()
  const todayCount = submissions.filter((s) => new Date(s.createdAt).toDateString() === todayKey).length

  // ── Room status ──
  const roomStatus = rooms.map((room) => {
    const subs = submissions.filter((s) => s.roomId === room.id)
    const scores = subs
      .map((s) => {
        const form = formMap.get(s.formId)
        return form ? scoreSubmission(form, s) : null
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
    const final = aggregateRoom(scores)
    const last = subs.length > 0
      ? subs.reduce((a, b) => (a.createdAt > b.createdAt ? a : b))
      : null
    return { room, count: subs.length, final, last }
  })

  // ── Butuh perhatian ──
  const notRated = roomStatus.filter((r) => r.count === 0).length
  const lowScore = roomStatus.filter((r) => r.count > 0 && r.final < 60).length
  const attention = notRated + lowScore

  // ── Kekuatan 5R per kategori ──
  const catStrength = useMemo(() => {
    const map = new Map<string, { label: string; total: number; count: number }>()
    for (const score of scored) {
      for (const c of score.categories) {
        const e = map.get(c.categoryId)
        if (e) {
          e.total += c.percent
          e.count++
        } else {
          map.set(c.categoryId, { label: c.label, total: c.percent, count: 1 })
        }
      }
    }
    return [...map.entries()]
      .map(([id, v]) => ({
        id,
        label: v.label.replace(/^[A-E]\.\s*/, ''),
        avg: v.count > 0 ? round1(v.total / v.count) : 0,
      }))
      .sort((a, b) => a.avg - b.avg) // terlemah dulu
  }, [scored])

  // ── Aktivitas (5 terakhir) ──
  const recent = [...submissions]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
    .map((s) => {
      const form = formMap.get(s.formId)
      const room = rooms.find((r) => r.id === s.roomId)
      const score = form ? scoreSubmission(form, s) : null
      return { sub: s, form, room, score }
    })

  const calendar = useMemo(() => buildCalendar(submissions), [submissions])

  const avgLabel = avgScore >= 80 ? 'Baik' : avgScore >= 60 ? 'Cukup' : 'Perlu Perbaikan'
  const avgTone = avgScore >= 80 ? 'bg-success/10 text-success' : avgScore >= 60 ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">Dashboard Audit 5R</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {formatLongDate(new Date())} &middot; Masa penilaian 10&ndash;27 Agustus
          </p>
        </div>
        <Button onClick={() => navigate({ to: '/admin/isi' })} className="hidden shrink-0 sm:inline-flex">
          <SquarePen size={14} />
          Isi Penilaian
        </Button>
      </section>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {isLoading ? (
          <>
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[104px] rounded-lg" />)}
          </>
        ) : (
          <>
        <StatCard
          icon={ClipboardList}
          label="Total Penilaian"
          value={String(totalSubs)}
          hint={todayCount > 0 ? `${todayCount} hari ini` : 'Belum ada hari ini'}
        />
        <StatCard
          icon={ChartLine}
          iconCls="bg-warning/10 text-warning"
          label="Rata-rata Skor"
          value={totalSubs > 0 ? String(avgScore) : '--'}
          hint={
            totalSubs > 0 ? (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${avgTone}`}>
                {avgLabel}
              </span>
            ) : (
              'Belum ada data'
            )
          }
        />
        <StatCard
          icon={CircleCheck}
          iconCls="bg-success/10 text-success"
          label="Cakupan Ruangan"
          value={`${roomsDone}/${rooms.length}`}
          hint={
            <span className="mt-1 block h-1.5 w-full max-w-[5rem] overflow-hidden rounded-full bg-muted">
              <span
                role="progressbar"
                aria-valuenow={coveragePct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Cakupan ${roomsDone}/${rooms.length} ruangan`}
                className="block h-full rounded-full bg-success transition-all"
                style={{ width: `${coveragePct}%` }}
              />
            </span>
          }
        />
        <StatCard
          icon={TriangleAlert}
          iconCls={
            lowScore > 0
              ? 'bg-destructive/10 text-destructive'
              : notRated > 0
                ? 'bg-warning/10 text-warning'
                : 'bg-success/10 text-success'
          }
          label="Butuh Perhatian"
          value={String(attention)}
          hint={
            attention > 0
              ? `Belum dinilai ${notRated} · Skor <60 ${lowScore}`
              : 'Semua ruangan aman'
          }
        />
          </>
        )}
      </div>

      {/* Kekuatan 5R */}
      <Card>
        <CardContent>
          <SectionHeader title="Kekuatan 5R" subtext="Rata-rata semua penilaian" />
          {catStrength.length === 0 ? (
            <EmptyState
              title="Belum ada data."
              hint="Isi penilaian pertama untuk melihat kekuatan 5R."
              action={
                <Button size="sm" onClick={() => navigate({ to: '/admin/isi' })}>
                  Mulai Audit
                </Button>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {catStrength.map((c) => (
                <div key={c.id}>
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="text-xs font-bold text-foreground/80">{c.label}</span>
                    <span className="text-xs font-extrabold tabular-nums">{round1(c.avg)}</span>
                  </div>
                  <Progress
                    value={c.avg}
                    className={`h-2 bg-muted [&_[data-slot=progress-indicator]]:${c.avg >= 80 ? 'bg-success' : c.avg >= 60 ? 'bg-warning' : 'bg-destructive'}`}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Kalender */}
      <Card>
        <CardContent>
          <SectionHeader title="Kalender Penilaian" subtext="Titik hijau = ada penilaian" />
          <CalendarGrid data={calendar} />
        </CardContent>
      </Card>

      {/* Room status */}
      <section>
        <SectionHeader title="Status Ruangan" subtext="Klik untuk isi" />
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {roomStatus.map(({ room, count, final, last }) => {
            const done = count > 0
            const badgeBg = !done ? 'bg-muted text-muted-foreground' : final >= 80 ? 'bg-success/10 text-success' : final >= 60 ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => navigate({ to: '/admin/isi', search: { room: room.id } })}
                className="cursor-pointer text-left transition active:scale-[0.99]"
              >
                <Card className="h-full hover:bg-muted/40">
                  <CardContent className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
                      done ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground/60'
                    }`}>
                      <RoomIcon name={room.icon} size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-foreground">{room.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {room.pic}
                        {done && last ? ` / ${timeAgo(last.createdAt)}` : ' / Belum dinilai'}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeBg}`}>
                      {done ? round1(final) : '--'}
                    </span>
                  </CardContent>
                </Card>
              </button>
            )
          })}
        </div>
      </section>

      {/* Recent activity */}
      {recent.length > 0 && (
        <section>
          <SectionHeader title="Aktivitas Terakhir" subtext="5 penilaian terbaru" />
          <Card className="divide-y divide-border">
            {recent.map(({ sub, form, room, score }) => {
              return (
                <div key={sub.id} className="flex items-center justify-between px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground/90">
                      {room?.name}
                      <span className="mx-1.5 text-muted-foreground/40">/</span>
                      <span className="text-muted-foreground">{form?.label}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {sub.auditor} / {timeAgo(sub.createdAt)}
                    </p>
                  </div>
                  {score && <ScoreBadge value={round1(score.final)} showMax={false} />}
                </div>
              )
            })}
          </Card>
        </section>
      )}

      {/* Forms info */}
      <Card>
        <CardContent>
          <SectionHeader title="Form Tersedia" subtext="Jumlah kriteria per checklist" />
          <div className="mt-2 space-y-1.5">
            {forms.map((f) => {
              const total = f.categories.reduce((s, c) => s + c.criteria.length, 0)
              return (
                <div key={f.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{f.label}</span>
                  <span className="text-xs font-bold text-muted-foreground/80">{total} kriteria</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Calendar helpers ──

interface CalendarDay {
  date: number
  isCurrentMonth: boolean
  isToday: boolean
  submissionCount: number
}

function buildCalendar(submissions: FiveRSubmission[]): CalendarDay[] {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = firstDay.getDay()

  const dayCounts = new Map<number, number>()
  for (const s of submissions) {
    const d = new Date(s.createdAt)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1)
    }
  }

  const days: CalendarDay[] = []

  const prevLast = new Date(year, month, 0).getDate()
  for (let i = startPad - 1; i >= 0; i--) {
    days.push({ date: prevLast - i, isCurrentMonth: false, isToday: false, submissionCount: 0 })
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({
      date: d,
      isCurrentMonth: true,
      isToday: d === now.getDate(),
      submissionCount: dayCounts.get(d) ?? 0,
    })
  }

  while (days.length % 7 !== 0) {
    days.push({ date: days.length - (startPad + lastDay.getDate()) + 1, isCurrentMonth: false, isToday: false, submissionCount: 0 })
  }

  return days
}

function CalendarGrid({ data }: { data: CalendarDay[] }) {
  const now = new Date()
  const monthLabel = now.toLocaleString('id-ID', { month: 'long', year: 'numeric' })
  const weekDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

  return (
    <div>
      <p className="mb-2 text-xs font-bold text-muted-foreground/80">{monthLabel}</p>
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekDays.map((d) => (
          <div key={d} className="py-1 text-[10px] font-bold text-muted-foreground">{d}</div>
        ))}
        {data.map((day, i) => (
          <div
            key={i}
            className={`relative flex h-8 items-center justify-center rounded-[var(--radius-sm)] text-xs ${
              !day.isCurrentMonth
                ? 'text-muted-foreground/30'
                : day.isToday
                  ? 'font-bold text-primary'
                  : 'text-foreground/80'
            }`}
          >
            {day.date}
            {day.submissionCount > 0 && (
              <span className="absolute bottom-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-success" />
            )}
            <span className="sr-only">{day.submissionCount > 0 ? `${day.submissionCount} penilaian` : 'tidak ada penilaian'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── helpers ──

function formatLongDate(d: Date): string {
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'Baru saja'
  if (min < 60) return `${min} menit lalu`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} jam lalu`
  const day = Math.floor(hr / 24)
  return `${day} hari lalu`
}
