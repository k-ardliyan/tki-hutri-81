/**
 * AdminHasilPage — halaman hasil admin dengan filter + audit trail.
 * Filter: ruangan, form, auditor/user, tanggal.
 * Setiap submission: detail expanded, score, audit trail, hapus.
 */
import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { getRooms, getForms, getSubmissions, deleteSubmission } from '../../server/functions/5r'
import type { FiveRForm, FiveRSubmission } from '../../data/5r'
import { scoreSubmission, round1 } from '../../lib/scoring'

export const Route = createFileRoute('/admin/hasil')({
  loader: async () => {
    const [rooms, forms, submissions] = await Promise.all([getRooms(), getForms(), getSubmissions()])
    return { rooms, forms, submissions }
  },
  component: AdminHasilPage,
})

function AdminHasilPage() {
  const { rooms, forms } = Route.useLoaderData()
  const [submissions, setSubmissions] = useState<FiveRSubmission[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  // Filters
  const [filterRoom, setFilterRoom] = useState('')
  const [filterForm, setFilterForm] = useState('')
  const [filterAuditor, setFilterAuditor] = useState('')
  const [filterDate, setFilterDate] = useState('')

  useEffect(() => {
    const init = async () => { setSubmissions(await getSubmissions()) }
    void init()
  }, [])

  const formMap = new Map<string, FiveRForm>(forms.map((f) => [f.id, f]))
  const roomMap = new Map(rooms.map((r) => [r.id, r]))

  const deleteSubmissionLocal = async (id: string) => {
    await deleteSubmission({ data: { id } })
    setSubmissions((prev) => prev.filter((s) => s.id !== id))
  }

  const toggleExpand = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))

  // Filtered sorted
  const sorted = useMemo(() => {
    let list = [...submissions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (filterRoom) list = list.filter((s) => s.roomId === filterRoom)
    if (filterForm) list = list.filter((s) => s.formId === filterForm)
    if (filterAuditor) {
      const q = filterAuditor.toLowerCase()
      list = list.filter((s) => s.auditor.toLowerCase().includes(q) || (s.createdBy ?? '').toLowerCase().includes(q))
    }
    if (filterDate) list = list.filter((s) => s.createdAt.startsWith(filterDate))
    return list
  }, [submissions, filterRoom, filterForm, filterAuditor, filterDate])

  const hasFilter = filterRoom || filterForm || filterAuditor || filterDate

  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">Hasil Penilaian</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {sorted.length} submission {hasFilter ? `(dari ${submissions.length})` : ''} · {new Set(submissions.map((s) => s.roomId)).size} ruangan
        </p>
      </section>

      {/* Filter bar */}
      <section className="surface-card px-4 py-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Ruangan</label>
            <select value={filterRoom} onChange={(e) => setFilterRoom(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-brand-red">
              <option value="">Semua</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Form</label>
            <select value={filterForm} onChange={(e) => setFilterForm(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-brand-red">
              <option value="">Semua</option>
              {forms.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Auditor / User</label>
            <input type="text" value={filterAuditor} onChange={(e) => setFilterAuditor(e.target.value)} placeholder="Cari..."
              className="w-full rounded-[var(--radius-md)] border border-slate-200 px-2 py-1.5 text-xs outline-none placeholder:text-slate-300 focus:border-brand-red" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Tanggal</label>
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-brand-red" />
          </div>
        </div>
        {hasFilter && (
          <button type="button" onClick={() => { setFilterRoom(''); setFilterForm(''); setFilterAuditor(''); setFilterDate('') }}
            className="mt-2 text-[10px] font-bold text-brand-red transition hover:underline">
            <i className="fa-solid fa-xmark mr-1" />Reset Filter
          </button>
        )}
      </section>

      {sorted.length === 0 && (
        <section className="surface-card p-6 text-center text-sm text-slate-500">
          {hasFilter ? 'Tidak ada submission cocok filter.' : 'Belum ada submission.'}
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
            <button type="button" onClick={() => toggleExpand(s.id)}
              className="flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900">{room?.name ?? s.roomId}</p>
                  {isEdited && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">EDITED</span>}
                </div>
                <p className="text-xs text-slate-500">{form?.label ?? s.formId} · {s.auditor}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-slate-400">
                  <span><i className="fa-solid fa-circle-plus mr-0.5" />{formatDate(s.createdAt)}</span>
                  {isEdited && <span><i className="fa-solid fa-pen-to-square mr-0.5" />{formatDate(s.updatedAt)}</span>}
                  {s.createdBy && <span><i className="fa-solid fa-user mr-0.5" />{s.createdBy}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {score && (
                  <div className="text-right">
                    <p className={`text-xl font-extrabold ${score.final >= 80 ? 'text-status-done' : score.final >= 60 ? 'text-status-pending' : 'text-status-danger'}`}>
                      {round1(score.final)}
                    </p>
                    <p className="text-[10px] text-slate-400">/ 100</p>
                  </div>
                )}
                <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} text-xs text-slate-300`} />
              </div>
            </button>

            {score && (
              <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                {score.categories.map((c) => (
                  <span key={c.categoryId} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    {c.label.split('.')[0]} {round1(c.percent)}%
                  </span>
                ))}
              </div>
            )}

            {isExpanded && form && (
              <div className="border-t border-slate-100 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Detail Jawaban</p>
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
                              <span className="w-5 shrink-0 text-right font-bold text-slate-400">{c.order}</span>
                              <span className="min-w-0 flex-1 text-slate-600">{c.text}</span>
                              <span className={`shrink-0 font-bold ${val !== undefined ? val >= 4 ? 'text-emerald-600' : val >= 3 ? 'text-amber-600' : 'text-rose-600' : 'text-slate-300'}`}>
                                {val ?? '—'}
                              </span>
                              {note && <span className="shrink-0 text-[10px] text-slate-400 italic">"{note}"</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={(e) => { e.stopPropagation(); void deleteSubmissionLocal(s.id) }}
                  className="mt-4 cursor-pointer rounded-[var(--radius-md)] border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50">
                  <i className="fa-solid fa-trash-can mr-1" />Hapus Submission Ini
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
  return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
