/**
 * AuditDashboardPage — dashboard untuk tim audit.
 *
 * Shows:
 * - Stats: hari ini / total penilaian, avg skor, ruangan selesai
 * - Room status: badge "✓ Sudah" kalau ada submission hari ini
 * - Click room → /audit/isi?room=X
 */
import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { getRooms, getForms, getSubmissions } from '../../server/functions/5r'
import type { FiveRForm, FiveRSubmission } from '../../data/5r'
import { scoreSubmission, aggregateRoom, round1 } from '../../lib/scoring'
import { todayPrefix } from '../../lib/dateUtils'

const searchSchema = z.object({})

export const Route = createFileRoute('/audit/')({
  validateSearch: searchSchema,
  loader: async () => {
    const [rooms, forms] = await Promise.all([getRooms(), getForms()])
    return { rooms, forms }
  },
  component: AuditDashboardPage,
})

/** Today's date prefix (YYYY-MM-DD) in UTC. */

function AuditDashboardPage() {
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
    // Today's submissions for this room
    const todayRoomSubs = todaySubs.filter((s) => s.roomId === room.id)
    // All submissions
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
        <h1 className="text-lg font-extrabold tracking-tight text-slate-900">Dashboard Audit 5R</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {formatLongDate(new Date())}
        </p>
      </section>

      {/* Today's summary banner */}
      {todayTotal > 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-status-done/20 bg-status-done/[0.06] px-4 py-3">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-calendar-check text-status-done" />
            <p className="text-xs font-bold text-status-done">
              Hari ini: {todayTotal} penilaian dari {new Set(todaySubs.map((s) => s.roomId)).size} ruangan
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-calendar-xmark text-slate-400" />
            <p className="text-xs font-semibold text-slate-500">Belum ada penilaian hari ini</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="surface-card px-4 py-4 text-center">
          <p className="text-2xl font-extrabold text-slate-900">{todayTotal}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Hari Ini</p>
        </div>
        <div className="surface-card px-4 py-4 text-center">
          <p className="text-2xl font-extrabold text-slate-900">{submissions.length > 0 ? avgScore : '--'}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Rata-rata</p>
        </div>
        <div className="surface-card px-4 py-4 text-center">
          <p className="text-2xl font-extrabold text-slate-900">{completed}<span className="text-sm text-slate-400">/{rooms.length}</span></p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Selesai Hari Ini</p>
        </div>
      </div>

      {/* Room status */}
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-extrabold tracking-tight text-slate-900">Status Ruangan</h2>
          <span className="shrink-0 text-[10px] font-semibold text-slate-400">Klik untuk isi</span>
        </div>
        <div className="space-y-2">
          {roomStatus.map(({ room, count, final, doneToday, todayCount, lastSub }) => {
            const badgeBg = !doneToday
              ? 'bg-slate-100 text-slate-500'
              : final >= 80 ? 'bg-status-done-soft text-status-done'
                : final >= 60 ? 'bg-status-pending-soft text-status-pending'
                  : 'bg-status-danger-soft text-status-danger'
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => navigate({ to: '/audit/isi', search: { room: room.id } })}
                className="surface-card flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition hover:border-slate-300"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${
                  doneToday ? 'bg-status-done text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  <i className={`fa-solid ${doneToday ? 'fa-check' : room.icon} text-sm`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-bold text-slate-900">{room.name}</p>
                    {doneToday && (
                      <span className="shrink-0 rounded-full bg-status-done-soft px-2 py-0.5 text-[10px] font-bold text-status-done">
                        <i className="fa-solid fa-check mr-0.5" />Sudah
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">
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
