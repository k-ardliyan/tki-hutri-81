/**
 * AuditHasilPage — hasil audit 5R dengan daily log + peringkat.
 *
 * Features:
 * - Room ranking (peringkat) tab
 * - Daily log tab: grouped by date, show score + auditor + time
 * - Date filter
 */
import { useState, useEffect, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { getRooms, getForms, getSubmissions } from '../../server/functions/5r'
import type { FiveRForm, FiveRSubmission } from '../../data/5r'
import { scoreSubmission, aggregateRoom, round1 } from '../../lib/scoring'
import { todayPrefix } from '../../lib/dateUtils'

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
  const [submissions, setSubmissions] = useState<FiveRSubmission[]>([])
  const [tab, setTab] = useState<Tab>('peringkat')
  const [dateFilter, setDateFilter] = useState(todayPrefix())

  useEffect(() => {
    const init = async () => {
      const subs = await getSubmissions()
      setSubmissions(subs)
    }
    void init()
  }, [])

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

  // Group log by date
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
        <h1 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">Hasil Audit 5R</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {submissions.length} penilaian total &middot; {todayCount} hari ini
        </p>
      </section>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-[var(--radius-md)] bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setTab('peringkat')}
          className={`flex-1 rounded-[var(--radius-sm)] px-3 py-2 text-xs font-bold transition ${
            tab === 'peringkat' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          <i className="fa-solid fa-trophy mr-1" />Peringkat
        </button>
        <button
          type="button"
          onClick={() => setTab('log')}
          className={`flex-1 rounded-[var(--radius-sm)] px-3 py-2 text-xs font-bold transition ${
            tab === 'log' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          <i className="fa-solid fa-clock-rotate-left mr-1" />Log Harian
          {todayCount > 0 && (
            <span className="ml-1 rounded-full bg-brand-red px-1.5 py-0.5 text-[9px] text-white">{todayCount}</span>
          )}
        </button>
      </div>

      {/* Tab: Peringkat */}
      {tab === 'peringkat' && (
        <div className="space-y-3">
          {filteredRooms.map(({ room, count, final, last }, rank) => {
            const scoreBg = count === 0
              ? 'bg-slate-100 text-slate-400'
              : final >= 80 ? 'bg-status-done-soft text-status-done'
                : final >= 60 ? 'bg-status-pending-soft text-status-pending'
                  : 'bg-status-danger-soft text-status-danger'
            return (
              <div key={room.id} className="surface-card px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-base font-bold ${
                    rank < 3 ? 'bg-brand-red/10 text-brand-red' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {rank < 3 ? (
                      <i className={`fa-solid fa-medal text-sm ${rank === 0 ? 'text-amber-500' : rank === 1 ? 'text-slate-400' : 'text-amber-700'}`} />
                    ) : rank + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-bold text-slate-900">{room.name}</h2>
                    <p className="text-[10px] text-slate-400">
                      {room.pic}
                      {last && <>, {count}x dinilai</>}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums ${scoreBg}`}>
                    {count > 0 ? round1(final) : '--'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tab: Log Harian */}
      {tab === 'log' && (
        <div className="space-y-4">
          {/* Date filter */}
          <div className="surface-card px-4 py-3">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-calendar text-xs text-slate-400" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="flex-1 rounded-[var(--radius-md)] border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-brand-red"
              />
              {dateFilter && (
                <button
                  type="button"
                  onClick={() => setDateFilter('')}
                  className="text-[10px] font-bold text-brand-red transition hover:underline"
                >
                  Semua
                </button>
              )}
            </div>
          </div>

          {groupedLog.length === 0 && (
            <div className="surface-card p-6 text-center text-sm text-slate-500">
              <i className="fa-solid fa-inbox mb-2 text-2xl text-slate-300" />
              <p>Tidak ada penilaian{dateFilter ? ' pada tanggal ini' : ''}.</p>
            </div>
          )}

          {groupedLog.map(([dateKey, subs]) => (
            <div key={dateKey}>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-xs font-extrabold text-slate-900">
                  {formatDateHeader(dateKey)}
                </h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                  {subs.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {subs.map((s) => {
                  const room = roomMap.get(s.roomId)
                  const form = formMap.get(s.formId)
                  const score = form ? scoreSubmission(form, s) : null
                  return (
                    <div key={s.id} className="surface-card flex items-center gap-3 px-4 py-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-xs font-bold ${
                        score
                          ? score.final >= 80 ? 'bg-status-done-soft text-status-done'
                            : score.final >= 60 ? 'bg-status-pending-soft text-status-pending'
                              : 'bg-status-danger-soft text-status-danger'
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        {score ? round1(score.final) : '--'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900">{room?.name ?? s.roomId}</p>
                        <p className="text-[10px] text-slate-400">
                          {s.auditor} &middot; {formatTime(s.createdAt)}
                          {s.createdBy && <> &middot; @{s.createdBy}</>}
                        </p>
                      </div>
                      {score && (
                        <div className="flex gap-1">
                          {score.categories.map((c) => (
                            <span key={c.categoryId} className="hidden rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 sm:inline">
                              {c.label.split('.')[0]} {round1(c.percent)}%
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
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
