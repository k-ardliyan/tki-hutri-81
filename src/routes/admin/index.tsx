/**
 * AdminDashboardPage — dashboard panitia dengan statistik informatif.
 *
 * Insight (bukan sekadar angka):
 * - Rata-rata skor + label kualitas (baik/cukup/perlu perbaikan)
 * - Cakupan: berapa ruangan sudah dinilai (progress bar)
 * - Butuh perhatian: ruangan belum dinilai / skor rendah
 * - Kekuatan 5R: rata-rata per kategori (Ringkas..Rajin) — tim tahu fokus perbaikan
 * - Kalender penilaian harian
 */
import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { getRooms, getForms, getSubmissions } from '../../server/functions/5r'
import type { FiveRForm, FiveRSubmission } from '../../data/5r'
import { scoreSubmission, aggregateRoom, round1 } from '../../lib/scoring'
import type { SubmissionScore } from '../../lib/scoring'

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
  const [submissions, setSubmissions] = useState<FiveRSubmission[]>([])

  useEffect(() => {
    const init = async () => {
      const subs = await getSubmissions()
      setSubmissions(subs)
    }
    void init()
  }, [])

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

  // ── Butuh perhatian: pisah "belum dinilai" vs "skor rendah" ──
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

  const avgLabel = avgScore >= 80 ? { text: 'Baik', cls: 'bg-status-done-soft text-status-done' } : avgScore >= 60 ? { text: 'Cukup', cls: 'bg-status-pending-soft text-status-pending' } : { text: 'Perlu Perbaikan', cls: 'bg-status-danger-soft text-status-danger' }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">Dashboard Audit 5R</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {formatLongDate(new Date())} &middot; Masa penilaian 10&ndash;27 Agustus
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate({ to: '/admin/isi' })}
          className="hidden shrink-0 items-center gap-2 rounded-[var(--radius-md)] bg-brand-red px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 active:scale-[0.98] sm:flex"
        >
          <i aria-hidden="true" className="fa-solid fa-pen-to-square text-xs" />
          Isi Penilaian
        </button>
      </section>

      {/* Stat cards — informatif */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon="fa-clipboard-list"
          iconCls="bg-brand-red/10 text-brand-red"
          label="Total Penilaian"
          value={String(totalSubs)}
          hint={todayCount > 0 ? `${todayCount} hari ini` : 'Belum ada hari ini'}
        />
        <StatCard
          icon="fa-chart-line"
          iconCls="bg-amber-50 text-amber-600"
          label="Rata-rata Skor"
          value={totalSubs > 0 ? String(avgScore) : '--'}
          hint={
            totalSubs > 0 ? (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${avgLabel.cls}`}>
                {avgLabel.text}
              </span>
            ) : (
              'Belum ada data'
            )
          }
        />
        <StatCard
          icon="fa-circle-check"
          iconCls="bg-status-done-soft text-status-done"
          label="Cakupan Ruangan"
          value={`${roomsDone}/${rooms.length}`}
          hint={
            <span className="mt-1 block h-1.5 w-full max-w-[5rem] overflow-hidden rounded-full bg-slate-100">
              <span
                role="progressbar"
                aria-valuenow={coveragePct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Cakupan ${roomsDone}/${rooms.length} ruangan`}
                className="block h-full rounded-full bg-status-done transition-all"
                style={{ width: `${coveragePct}%` }}
              />
            </span>
          }
        />
        <StatCard
          icon="fa-triangle-exclamation"
          iconCls={
            lowScore > 0
              ? 'bg-status-danger-soft text-status-danger'
              : notRated > 0
                ? 'bg-status-pending-soft text-status-pending'
                : 'bg-status-done-soft text-status-done'
          }
          label="Butuh Perhatian"
          value={String(attention)}
          hint={
            attention > 0
              ? `Belum dinilai ${notRated} · Skor <60 ${lowScore}`
              : 'Semua ruangan aman'
          }
        />
      </div>

      {/* Kekuatan 5R per kategori */}
      <section className="surface-card px-4 py-4 sm:px-5">
        <SectionHeader title="Kekuatan 5R" subtext="Rata-rata semua penilaian" />
        {catStrength.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-dashed border-slate-200 px-4 py-6 text-center">
            <p className="text-xs text-slate-500">
              Belum ada data. Isi penilaian pertama untuk melihat kekuatan 5R.
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: '/admin/isi' })}
              className="mt-3 rounded-[var(--radius-md)] bg-brand-red px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700 active:scale-[0.98]"
            >
              Mulai Audit
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {catStrength.map((c) => (
              <div key={c.id}>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-xs font-bold text-slate-700">{c.label}</span>
                  <span className="text-xs font-extrabold tabular-nums">{round1(c.avg)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    role="progressbar"
                    aria-valuenow={round1(c.avg)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Kekuatan ${c.label} ${round1(c.avg)}%`}
                    className={`h-full rounded-full transition-all ${
                      c.avg >= 80 ? 'bg-status-done' : c.avg >= 60 ? 'bg-status-pending' : 'bg-status-danger'
                    }`}
                    style={{ width: `${c.avg}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Kalender */}
      <section className="surface-card px-4 py-4 sm:px-5">
        <SectionHeader title="Kalender Penilaian" subtext="Titik hijau = ada penilaian" />
        <CalendarGrid data={calendar} />
      </section>

      {/* Room status */}
      <section>
        <SectionHeader title="Status Ruangan" subtext="Klik untuk isi" />
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {roomStatus.map(({ room, count, final, last }) => {
            const done = count > 0
            const badgeBg = !done ? 'bg-slate-100 text-slate-500' : final >= 80 ? 'bg-status-done-soft text-status-done' : final >= 60 ? 'bg-status-pending-soft text-status-pending' : 'bg-status-danger-soft text-status-danger'
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => navigate({ to: '/admin/isi', search: { room: room.id } })}
                className="surface-card flex cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition hover:border-slate-300 active:scale-[0.99]"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${
                  done ? 'bg-status-done-soft text-status-done' : 'bg-slate-100 text-slate-400'
                }`}>
                  <i aria-hidden="true" className={`fa-solid ${room.icon} text-sm`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-900">{room.name}</p>
                  <p className="text-[10px] text-slate-500">
                    {room.pic}
                    {done && last ? ` / ${timeAgo(last.createdAt)}` : ' / Belum dinilai'}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeBg}`}>
                    {done ? round1(final) : '--'}
                    {done && <span className="sr-only"> — {final >= 80 ? 'Baik' : final >= 60 ? 'Cukup' : 'Perlu Perbaikan'}</span>}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Recent activity */}
      {recent.length > 0 && (
        <section>
          <SectionHeader title="Aktivitas Terakhir" subtext="5 penilaian terbaru" />
          <div className="surface-card divide-y divide-slate-100">
            {recent.map(({ sub, form, room, score }) => {
              const scoreVal = score?.final ?? 0
              const scoreBg = scoreVal >= 80 ? 'bg-status-done-soft text-status-done' : scoreVal >= 60 ? 'bg-status-pending-soft text-status-pending' : 'bg-status-danger-soft text-status-danger'
              return (
                <div key={sub.id} className="flex items-center justify-between px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      {room?.name}
                      <span className="mx-1.5 text-slate-300">/</span>
                      <span className="text-slate-500">{form?.label}</span>
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {sub.auditor} / {timeAgo(sub.createdAt)}
                    </p>
                  </div>
                  {score && (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${scoreBg}`}>
                      {round1(score.final)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Forms info */}
      <section className="surface-card px-4 py-4 sm:px-5">
        <SectionHeader title="Form Tersedia" subtext="Jumlah kriteria per checklist" />
        <div className="mt-2 space-y-1.5">
          {forms.map((f) => {
            const total = f.categories.reduce((s, c) => s + c.criteria.length, 0)
            return (
              <div key={f.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{f.label}</span>
                <span className="text-xs font-bold text-slate-500">{total} kriteria</span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

// ── Section header (konsisten) ──

function SectionHeader({ title, subtext }: { title: string; subtext?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-extrabold tracking-tight text-slate-900">{title}</h2>
      {subtext && <span className="shrink-0 text-[10px] font-semibold text-slate-500">{subtext}</span>}
    </div>
  )
}

// ── Stat card ──

function StatCard({
  icon,
  iconCls,
  label,
  value,
  hint,
}: {
  icon: string
  iconCls: string
  label: string
  value: string
  hint?: React.ReactNode
}) {
  return (
    <div className="surface-card px-4 py-4">
      <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] ${iconCls}`}>
        <i aria-hidden="true" className={`fa-solid ${icon} text-sm`} />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-extrabold tabular-nums text-slate-900">{value}</p>
      <p className="mt-0.5 text-[10px] font-medium text-slate-500">{hint}</p>
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
      <p className="mb-2 text-xs font-bold text-slate-600">{monthLabel}</p>
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekDays.map((d) => (
          <div key={d} className="py-1 text-[10px] font-bold text-slate-500">{d}</div>
        ))}
        {data.map((day, i) => (
          <div
            key={i}
            className={`relative flex h-8 items-center justify-center rounded-[var(--radius-sm)] text-xs ${
              !day.isCurrentMonth
                ? 'text-slate-300'
                : day.isToday
                  ? 'font-bold text-brand-red'
                  : 'text-slate-700'
            }`}
          >
            {day.date}
            {day.submissionCount > 0 && (
              <span className="absolute bottom-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-status-done" />
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
