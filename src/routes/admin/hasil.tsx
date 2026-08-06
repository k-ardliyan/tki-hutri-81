/**
 * AdminHasilPage — halaman hasil admin dengan filter + audit trail.
 * Filter: ruangan, form, auditor/user, tanggal.
 * Setiap submission: detail expanded, score, audit trail, hapus (AlertDialog).
 */
import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, CirclePlus, SquarePen, Trash2, User, X } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { NativeSelect, NativeSelectOption } from '../../components/ui/native-select'
import { getRooms, getForms, getSubmissions, deleteSubmission } from '../../server/functions/5r'
import type { FiveRForm, FiveRSubmission } from '../../data/5r'
import { scoreSubmission, round1 } from '../../lib/scoring'
import { qk, useSubmissions } from '../../lib/queries'

export const Route = createFileRoute('/admin/hasil')({
  loader: async () => {
    const [rooms, forms, submissions] = await Promise.all([getRooms(), getForms(), getSubmissions()])
    return { rooms, forms, submissions }
  },
  component: AdminHasilPage,
})

function AdminHasilPage() {
  const { rooms, forms } = Route.useLoaderData()
  const queryClient = useQueryClient()
  const { data: submissions = [] } = useSubmissions()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  // Filters
  const [filterRoom, setFilterRoom] = useState('')
  const [filterForm, setFilterForm] = useState('')
  const [filterAuditor, setFilterAuditor] = useState('')
  const [filterDate, setFilterDate] = useState('')

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<FiveRSubmission | null>(null)

  const formMap = new Map<string, FiveRForm>(forms.map((f) => [f.id, f]))
  const roomMap = new Map(rooms.map((r) => [r.id, r]))

  const deleteSubmissionLocal = async (id: string) => {
    await deleteSubmission({ data: { id } })
    await queryClient.invalidateQueries({ queryKey: qk.submissions })
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

  const resetFilters = () => { setFilterRoom(''); setFilterForm(''); setFilterAuditor(''); setFilterDate('') }

  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">Hasil Penilaian</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {sorted.length} submission {hasFilter ? `(dari ${submissions.length})` : ''} · {new Set(submissions.map((s) => s.roomId)).size} ruangan
        </p>
      </section>

      {/* Filter bar */}
      <Card>
        <CardContent className="py-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <Label className="mb-1 block text-[10px] font-bold uppercase text-muted-foreground">Ruangan</Label>
              <NativeSelect className="w-full" value={filterRoom} onChange={(e) => setFilterRoom(e.target.value)}>
                <NativeSelectOption value="">Semua</NativeSelectOption>
                {rooms.map((r) => <NativeSelectOption key={r.id} value={r.id}>{r.name}</NativeSelectOption>)}
              </NativeSelect>
            </div>
            <div>
              <Label className="mb-1 block text-[10px] font-bold uppercase text-muted-foreground">Form</Label>
              <NativeSelect className="w-full" value={filterForm} onChange={(e) => setFilterForm(e.target.value)}>
                <NativeSelectOption value="">Semua</NativeSelectOption>
                {forms.map((f) => <NativeSelectOption key={f.id} value={f.id}>{f.label}</NativeSelectOption>)}
              </NativeSelect>
            </div>
            <div>
              <Label className="mb-1 block text-[10px] font-bold uppercase text-muted-foreground">Auditor / User</Label>
              <Input type="text" value={filterAuditor} onChange={(e) => setFilterAuditor(e.target.value)} placeholder="Cari..." className="h-8" />
            </div>
            <div>
              <Label className="mb-1 block text-[10px] font-bold uppercase text-muted-foreground">Tanggal</Label>
              <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="h-8" />
            </div>
          </div>
          {hasFilter && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="mt-2 h-6 px-2 text-[10px] font-bold text-primary">
              <X size={12} className="mr-1" />Reset Filter
            </Button>
          )}
        </CardContent>
      </Card>

      {sorted.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          {hasFilter ? 'Tidak ada submission cocok filter.' : 'Belum ada submission.'}
        </Card>
      )}

      {sorted.map((s) => {
        const form = formMap.get(s.formId)
        const room = roomMap.get(s.roomId)
        const score = form ? scoreSubmission(form, s) : null
        const isExpanded = expanded[s.id]
        const isEdited = s.updatedAt !== s.createdAt

        return (
          <Card key={s.id} className="overflow-hidden">
            <button type="button" onClick={() => toggleExpand(s.id)} className="flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-foreground">{room?.name ?? s.roomId}</p>
                  {isEdited && <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-bold text-warning">EDITED</span>}
                </div>
                <p className="text-xs text-muted-foreground">{form?.label ?? s.formId} · {s.auditor}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-muted-foreground/70">
                  <span className="inline-flex items-center gap-1"><CirclePlus size={10} />{formatDate(s.createdAt)}</span>
                  {isEdited && <span className="inline-flex items-center gap-1"><SquarePen size={10} />{formatDate(s.updatedAt)}</span>}
                  {s.createdBy && <span className="inline-flex items-center gap-1"><User size={10} />{s.createdBy}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {score && (
                  <div className="text-right">
                    <p className={`text-xl font-extrabold ${score.final >= 80 ? 'text-success' : score.final >= 60 ? 'text-warning' : 'text-destructive'}`}>
                      {round1(score.final)}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70">/ 100</p>
                  </div>
                )}
                {isExpanded ? <ChevronUp size={14} className="text-muted-foreground/40" /> : <ChevronDown size={14} className="text-muted-foreground/40" />}
              </div>
            </button>

            {score && (
              <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                {score.categories.map((c) => (
                  <span key={c.categoryId} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                    {c.label.split('.')[0]} {round1(c.percent)}%
                  </span>
                ))}
              </div>
            )}

            {isExpanded && form && (
              <div className="border-t border-border px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Detail Jawaban</p>
                <div className="mt-2 space-y-2">
                  {form.categories.map((cat) => (
                    <div key={cat.id}>
                      <p className="text-[10px] font-bold text-muted-foreground/80">{cat.label}</p>
                      <div className="mt-1 space-y-1">
                        {cat.criteria.map((c) => {
                          const val = s.answers[c.id]
                          const note = s.notes[c.id]
                          return (
                            <div key={c.id} className="flex items-start gap-2 text-xs">
                              <span className="w-5 shrink-0 text-right font-bold text-muted-foreground/50">{c.order}</span>
                              <span className="min-w-0 flex-1 text-muted-foreground/90">{c.text}</span>
                              <span className={`shrink-0 font-bold ${val !== undefined ? val >= 4 ? 'text-success' : val >= 3 ? 'text-warning' : 'text-destructive' : 'text-muted-foreground/30'}`}>
                                {val ?? '—'}
                              </span>
                              {note && <span className="shrink-0 text-[10px] text-muted-foreground/60 italic">"{note}"</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteTarget(s)}
                  className="mt-4 border-rose-200 text-destructive hover:bg-rose-50"
                >
                  <Trash2 size={12} className="mr-1" />Hapus Submission Ini
                </Button>
              </div>
            )}
          </Card>
        )
      })}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus submission ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `${roomMap.get(deleteTarget.roomId)?.name ?? deleteTarget.roomId} · ${formMap.get(deleteTarget.formId)?.label ?? ''}` : ''}. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) void deleteSubmissionLocal(deleteTarget.id)
                setDeleteTarget(null)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
