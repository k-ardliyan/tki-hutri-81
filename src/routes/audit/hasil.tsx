/**
 * AuditHasilPage — read-only results untuk tim audit.
 */
import { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { getRooms, getForms } from '../../server/functions/5r'
import type { FiveRForm, FiveRSubmission } from '../../data/5r'
import { scoreSubmission, aggregateRoom, round1 } from '../../lib/scoring'
import { loadSubmissions } from '../../components/pages/Hasil5RPage'

const searchSchema = z.object({
  room: z.string().optional(),
})

export const Route = createFileRoute('/audit/hasil')({
  validateSearch: searchSchema,
  loader: async () => ({
    rooms: await getRooms(),
    forms: await getForms(),
  }),
  component: AuditHasilPage,
})

function AuditHasilPage() {
  const { rooms, forms } = Route.useLoaderData()
  const { room: selectedRoom } = Route.useSearch()
  const [submissions, setSubmissions] = useState<FiveRSubmission[]>([])

  useEffect(() => {
    setSubmissions(loadSubmissions())
  }, [])

  const formMap = new Map<string, FiveRForm>(forms.map((f) => [f.id, f]))

  const roomScores = rooms
    .map((room) => {
      const subs = submissions.filter((s) => s.roomId === room.id)
      const scores = subs
        .map((s) => {
          const form = formMap.get(s.formId)
          return form ? scoreSubmission(form, s) : null
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
      return { room, count: subs.length, final: aggregateRoom(scores), scores, last: subs[subs.length - 1] }
    })
    .sort((a, b) => b.final - a.final)

  const filtered = selectedRoom ? roomScores.filter((r) => r.room.id === selectedRoom) : roomScores

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">Hasil Audit 5R</h1>
        <p className="mt-0.5 text-sm text-slate-500">Peringkat seluruh ruangan</p>
      </section>

      <div className="space-y-3">
        {filtered.map(({ room, count, final, last }, rank) => {
          const scoreBg = final >= 80 ? 'bg-status-done-soft text-status-done' : final >= 60 ? 'bg-status-pending-soft text-status-pending' : 'bg-status-danger-soft text-status-danger'
          return (
            <div key={room.id} className="surface-card px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-base font-bold ${
                  count === 0 ? 'bg-slate-100 text-slate-400' : 'bg-brand-red/10 text-brand-red'
                }`}>
                  {rank + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold text-slate-900">{room.name}</h2>
                  <p className="text-[10px] text-slate-400">{room.pic}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${scoreBg}`}>
                  {count > 0 ? round1(final) : '--'}
                </span>
              </div>
              {count > 0 && last && (
                <div className="mt-2 text-[10px] text-slate-400">
                  Terakhir dinilai: {formatDateShort(last.createdAt)} oleh {last.auditor}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
