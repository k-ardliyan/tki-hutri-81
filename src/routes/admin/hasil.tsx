/**
 * AdminHasilPage — halaman hasil admin dengan audit trail lengkap.
 *
 * Setiap submission tampilkan:
 * - Auditor + timestamps (created/updated)
 * - Skor + breakdown per kategori
 * - Detail expanded (klik untuk lihat semua jawaban + catatan)
 * - Hapus
 */
import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { getRooms, getForms } from '../../server/functions/5r'
import type { FiveRForm, FiveRSubmission } from '../../data/5r'
import { scoreSubmission, round1 } from '../../lib/scoring'
import { loadSubmissions } from '../../components/pages/Hasil5RPage'

export const Route = createFileRoute('/admin/hasil')({
  loader: async () => ({
    rooms: await getRooms(),
    forms: await getForms(),
  }),
  component: AdminHasilPage,
})

function AdminHasilPage() {
  const { rooms, forms } = Route.useLoaderData()
  const [submissions, setSubmissions] = useState<FiveRSubmission[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setSubmissions(loadSubmissions())
  }, [])

  const formMap = new Map<string, FiveRForm>(forms.map((f) => [f.id, f]))
  const roomMap = new Map(rooms.map((r) => [r.id, r]))

  const deleteSubmission = (id: string) => {
    const next = submissions.filter((s) => s.id !== id)
    setSubmissions(next)
    window.localStorage.setItem('tki5r:submissions', JSON.stringify(next))
  }

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Sorted newest first
  const sorted = [...submissions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">Hasil Penilaian</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {submissions.length} submission &middot; {new Set(submissions.map((s) => s.roomId)).size} ruangan
        </p>
      </section>

      {sorted.length === 0 && (
        <section className="surface-card p-6 text-center text-sm text-slate-500">
          Belum ada submission.
        </section>
      )}

      {sorted.map((s) => {
        const form = formMap.get(s.formId)
        const room = roomMap.get(s.roomId)
        const score = form ? scoreSubmission(form, s) : null
        const isExpanded = expanded[s.id]
        const isEdited = s.updatedAt !== s.createdAt

        return (
          <section key={s.id} className="surface-card overflow-hidden">
            {/* Header — klik untuk expand */}
            <button
              type="button"
              onClick={() => toggleExpand(s.id)}
              className="flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900">{room?.name ?? s.roomId}</p>
                  {isEdited && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      EDITED
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {form?.label ?? s.formId} · {s.auditor}
                </p>
                {/* Audit trail */}
                <div className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-slate-400">
                  <span>
                    <i className="fa-solid fa-circle-plus mr-0.5" />
                    {formatDate(s.createdAt)}
                  </span>
                  {isEdited && (
                    <span>
                      <i className="fa-solid fa-pen-to-square mr-0.5" />
                      {formatDate(s.updatedAt)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {score && (
                  <div className="text-right">
                    <p className={`text-xl font-extrabold ${
                      score.final >= 80 ? 'text-status-done' : score.final >= 60 ? 'text-status-pending' : 'text-status-danger'
                    }`}>
                      {round1(score.final)}
                    </p>
                    <p className="text-[10px] text-slate-400">/ 100</p>
                  </div>
                )}
                <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} text-xs text-slate-300`} />
              </div>
            </button>

            {/* Category chips */}
            {score && (
              <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                {score.categories.map((c) => (
                  <span
                    key={c.categoryId}
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600"
                  >
                    {c.label.split('.')[0]} {round1(c.percent)}%
                  </span>
                ))}
              </div>
            )}

            {/* Expanded detail */}
            {isExpanded && form && (
              <div className="border-t border-slate-100 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Detail Jawaban
                </p>
                <div className="mt-2 space-y-2">
                  {form.categories.map((cat) => (
                    <div key={cat.id}>
                      <p className="text-[10px] font-bold text-slate-500">{cat.label}</p>
                      <div className="mt-1 space-y-1">
                        {cat.criteria.map((c) => {
                          const val = s.answers[c.id]
                          const note = s.notes[c.id]
                          return (
                            <div key={c.id} className="flex items-start gap-2 text-xs">
                              <span className="w-5 shrink-0 text-right font-bold text-slate-400">
                                {c.order}
                              </span>
                              <span className="min-w-0 flex-1 text-slate-600">{c.text}</span>
                              <span className={`shrink-0 font-bold ${
                                val !== undefined
                                  ? val >= 4 ? 'text-emerald-600' : val >= 3 ? 'text-amber-600' : 'text-rose-600'
                                  : 'text-slate-300'
                              }`}>
                                {val ?? '—'}
                              </span>
                              {note && (
                                <span className="shrink-0 text-[10px] text-slate-400 italic">
                                  "{note}"
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); deleteSubmission(s.id) }}
                  className="mt-4 cursor-pointer rounded-[var(--radius-md)] border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
                >
                  <i className="fa-solid fa-trash-can mr-1" />
                  Hapus Submission Ini
                </button>
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
