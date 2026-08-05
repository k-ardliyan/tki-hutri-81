/**
 * AuditDashboardPage — read-only dashboard untuk tim audit.
 *
 * Shows room status + results. No form filling.
 */
import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { getRooms, getForms } from '../../server/functions/5r'
import type { FiveRForm, FiveRSubmission } from '../../data/5r'
import { scoreSubmission, aggregateRoom, round1 } from '../../lib/scoring'
import { loadSubmissions } from '../../components/pages/Hasil5RPage'

const searchSchema = z.object({})

export const Route = createFileRoute('/audit/')({
  validateSearch: searchSchema,
  loader: async () => ({
    rooms: await getRooms(),
    forms: await getForms(),
  }),
  component: AuditDashboardPage,
})

function AuditDashboardPage() {
  const { rooms, forms } = Route.useLoaderData()
  const navigate = useNavigate()
  const [submissions, setSubmissions] = useState<FiveRSubmission[]>([])

  useEffect(() => {
    setSubmissions(loadSubmissions())
  }, [])

  const formMap = new Map<string, FiveRForm>(forms.map((f) => [f.id, f]))

  const totalSubs = submissions.length
  const allScores = submissions
    .map((s) => {
      const form = formMap.get(s.formId)
      return form ? scoreSubmission(form, s) : null
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
  const avgScore = allScores.length > 0
    ? round1(allScores.reduce((s, x) => s + x.final, 0) / allScores.length)
    : 0

  const roomStatus = rooms.map((room) => {
    const subs = submissions.filter((s) => s.roomId === room.id)
    const scores = subs
      .map((s) => {
        const form = formMap.get(s.formId)
        return form ? scoreSubmission(form, s) : null
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
    return { room, count: subs.length, final: aggregateRoom(scores) }
  })

  const completed = roomStatus.filter((r) => r.count > 0).length

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-lg font-extrabold tracking-tight text-slate-900">Dashboard Audit 5R</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {formatLongDate(new Date())} &middot; Lihat status semua ruangan
        </p>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="surface-card px-4 py-4 text-center">
          <p className="text-2xl font-extrabold text-slate-900">{totalSubs}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Penilaian</p>
        </div>
        <div className="surface-card px-4 py-4 text-center">
          <p className="text-2xl font-extrabold text-slate-900">{totalSubs > 0 ? avgScore : '--'}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Rata-rata</p>
        </div>
        <div className="surface-card px-4 py-4 text-center">
          <p className="text-2xl font-extrabold text-slate-900">{completed}<span className="text-sm text-slate-400">/{rooms.length}</span></p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Selesai</p>
        </div>
      </div>

      {/* Room status */}
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-extrabold tracking-tight text-slate-900">Status Ruangan</h2>
          <span className="shrink-0 text-[10px] font-semibold text-slate-400">Klik untuk isi</span>
        </div>
        <div className="space-y-2">
          {roomStatus.map(({ room, count, final }) => {
            const done = count > 0
            const badgeBg = !done ? 'bg-slate-100 text-slate-500' : final >= 80 ? 'bg-status-done-soft text-status-done' : final >= 60 ? 'bg-status-pending-soft text-status-pending' : 'bg-status-danger-soft text-status-danger'
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => navigate({ to: '/audit/isi', search: { room: room.id } })}
                className="surface-card flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition hover:border-slate-300"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${
                  done ? 'bg-status-done-soft text-status-done' : 'bg-slate-100 text-slate-400'
                }`}>
                  <i className={`fa-solid ${room.icon} text-sm`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-900">{room.name}</p>
                  <p className="text-[10px] text-slate-400">{room.pic}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeBg}`}>
                  {done ? round1(final) : '--'}
                </span>
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
