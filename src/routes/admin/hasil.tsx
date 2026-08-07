import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { createColumnHelper } from '@tanstack/react-table'
import { Eye, Search, Trash2, X } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
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
import { PageHeader } from '../../components/ui/page-header'
import { StatusBadge } from '../../components/ui/status-badge'
import { DataTable, features } from '../../components/data-table'
import { HasilPageSkeleton } from '../../components/ui/skeletons'
import { ResponsiveDialog } from '../../components/ui/responsive-dialog'
import { getRooms, getForms, getSubmissions, deleteSubmission } from '../../server/functions/5r'
import type { FiveRForm, FiveRSubmission } from '../../data/5r'
import { scoreSubmission, round1 } from '../../lib/scoring'
import { qk, useSubmissions } from '../../lib/queries'

import { Combobox, type ComboboxOption } from '../../components/ui/combobox'
import { useDebounce } from '../../hooks/use-debounce'

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
  const { data: submissions = [], isLoading } = useSubmissions()

  // Filters
  const [filterRoom, setFilterRoom] = useState<string>("ALL")
  const [filterForm, setFilterForm] = useState<string>("ALL")
  const [filterAuditor, setFilterAuditor] = useState('')
  const debouncedAuditor = useDebounce(filterAuditor, 300)
  const [filterDate, setFilterDate] = useState('')

  // Selected for detail modal & delete confirm
  const [detailTarget, setDetailTarget] = useState<FiveRSubmission | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FiveRSubmission | null>(null)

  const formMap = useMemo(() => new Map<string, FiveRForm>(forms.map((f) => [f.id, f])), [forms])
  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms])

  const roomOptions = useMemo<ComboboxOption[]>(
    () => [{ value: 'ALL', label: 'Semua Ruangan' }, ...rooms.map((r) => ({ value: r.id, label: r.name }))],
    [rooms]
  )

  const formOptions = useMemo<ComboboxOption[]>(
    () => [{ value: 'ALL', label: 'Semua Form' }, ...forms.map((f) => ({ value: f.id, label: f.label }))],
    [forms]
  )

  const deleteSubmissionLocal = async (id: string) => {
    await deleteSubmission({ data: { id } })
    await queryClient.invalidateQueries({ queryKey: qk.submissions })
  }

  // Filtered sorted
  const sorted = useMemo(() => {
    let list = [...submissions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (filterRoom && filterRoom !== "ALL") list = list.filter((s) => s.roomId === filterRoom)
    if (filterForm && filterForm !== "ALL") list = list.filter((s) => s.formId === filterForm)
    if (debouncedAuditor) {
      const q = debouncedAuditor.toLowerCase()
      list = list.filter((s) => s.auditor.toLowerCase().includes(q) || (s.createdBy ?? '').toLowerCase().includes(q))
    }
    if (filterDate) list = list.filter((s) => s.createdAt.startsWith(filterDate))
    return list
  }, [submissions, filterRoom, filterForm, debouncedAuditor, filterDate])

  const hasFilter = (filterRoom && filterRoom !== "ALL") || (filterForm && filterForm !== "ALL") || filterAuditor || filterDate
  const resetFilters = () => { setFilterRoom('ALL'); setFilterForm('ALL'); setFilterAuditor(''); setFilterDate('') }

  // Columns definition
  const columnHelper = createColumnHelper<typeof features, FiveRSubmission>()

  const columns = columnHelper.columns([
    columnHelper.accessor('roomId', {
      header: 'Ruangan',
      cell: ({ row }) => {
        const s = row.original
        const room = roomMap.get(s.roomId)
        return (
          <div className="min-w-0">
            <div className="font-bold text-foreground text-sm">{room?.name ?? s.roomId}</div>
            <div className="text-xs text-muted-foreground">{room?.pic ?? '—'}</div>
          </div>
        )
      },
    }),
    columnHelper.accessor('formId', {
      header: 'Form & Auditor',
      cell: ({ row }) => {
        const s = row.original
        const form = formMap.get(s.formId)
        return (
          <div>
            <div className="text-xs font-semibold text-foreground">{form?.label ?? s.formId}</div>
            <div className="text-[11px] text-muted-foreground">
              By: <span className="font-medium text-foreground/80">{s.auditor}</span>
              {s.createdBy && <span className="text-muted-foreground/60"> (@{s.createdBy})</span>}
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor('createdAt', {
      header: 'Waktu Penilaian',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground font-mono">{formatDate(row.original.createdAt)}</span>
      ),
    }),
    columnHelper.display({
      id: 'score',
      header: 'Skor 5R',
      cell: ({ row }) => {
        const s = row.original
        const form = formMap.get(s.formId)
        const score = form ? scoreSubmission(form, s) : null
        return score ? <StatusBadge score={round1(score.final)} showScoreMax /> : <span className="text-xs text-muted-foreground">—</span>
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: () => <span className="sr-only">Aksi</span>,
      cell: ({ row }) => {
        const s = row.original
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDetailTarget(s)}
              className="h-7 px-2 text-xs font-bold"
            >
              <Eye size={12} className="mr-1" />
              Detail
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteTarget(s)}
              className="h-7 w-7 text-destructive hover:bg-destructive/10"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        )
      },
    }),
  ])

  if (isLoading) return <HasilPageSkeleton />

  const detailForm = detailTarget ? formMap.get(detailTarget.formId) : null
  const detailRoom = detailTarget ? roomMap.get(detailTarget.roomId) : null
  const detailScore = detailForm && detailTarget ? scoreSubmission(detailForm, detailTarget) : null

  return (
    <div className="space-y-5">
      <PageHeader
        title="Hasil Penilaian 5R"
        subtitle={`${sorted.length} submission ${hasFilter ? `(dari ${submissions.length})` : ''} · ${new Set(submissions.map((s) => s.roomId)).size} ruangan`}
      />

      {/* Filter bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Ruangan</Label>
              <Combobox
                options={roomOptions}
                value={filterRoom}
                onValueChange={setFilterRoom}
                placeholder="Semua Ruangan"
                searchPlaceholder="Cari ruangan..."
                triggerClassName="w-full h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Form</Label>
              <Combobox
                options={formOptions}
                value={filterForm}
                onValueChange={setFilterForm}
                placeholder="Semua Form"
                searchPlaceholder="Cari form..."
                triggerClassName="w-full h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Cari Auditor / User</Label>
              <div className="relative">
                <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  type="text"
                  value={filterAuditor}
                  onChange={(e) => setFilterAuditor(e.target.value)}
                  placeholder="Cari nama..."
                  className="h-9 pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Tanggal</Label>
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
          {hasFilter && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="mt-3 h-7 text-xs font-bold text-primary">
              <X size={12} className="mr-1" />Reset Filter
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      <DataTable
        data={sorted}
        columns={columns}
        getRowId={(s) => s.id}
        pageSize={15}
        toolbar={<span className="text-sm font-medium text-muted-foreground">{sorted.length} data ditampilkan</span>}
      />

      {/* Detail Responsive Modal */}
      <ResponsiveDialog
        open={!!detailTarget}
        onOpenChange={(o) => { if (!o) setDetailTarget(null) }}
        title={detailRoom ? `Detail Audit: ${detailRoom.name}` : 'Detail Audit'}
        description={detailForm ? `${detailForm.label} · Auditor: ${detailTarget?.auditor}` : ''}
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (detailTarget) setDeleteTarget(detailTarget)
                setDetailTarget(null)
              }}
              className="flex-1 sm:flex-initial text-xs font-bold"
            >
              <Trash2 size={13} className="mr-1.5" />
              Hapus Submission
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDetailTarget(null)}
              className="flex-1 sm:flex-initial text-xs font-bold"
            >
              <X size={13} className="mr-1.5" />
              Tutup
            </Button>
          </div>
        }
      >
        {detailTarget && detailForm && (
          <div className="space-y-4">
            {detailScore && (
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3 border border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Skor Akhir 5R</p>
                  <p className="text-xs font-medium text-muted-foreground/70">{formatDate(detailTarget.createdAt)}</p>
                </div>
                <StatusBadge score={round1(detailScore.final)} showScoreMax />
              </div>
            )}

            <div className="space-y-3">
              {detailForm.categories.map((cat) => (
                <div key={cat.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                  <p className="text-xs font-bold text-foreground">{cat.label}</p>
                  <div className="space-y-1.5 divide-y divide-border/40">
                    {cat.criteria.map((c) => {
                      const val = detailTarget.answers[c.id]
                      const note = detailTarget.notes[c.id]
                      return (
                        <div key={c.id} className="flex items-start justify-between gap-2 pt-1.5 text-xs">
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-foreground/90">{c.order}. </span>
                            <span className="text-muted-foreground">{c.text}</span>
                            {note && <p className="text-[10px] text-muted-foreground italic mt-0.5">"{note}"</p>}
                          </div>
                          <StatusBadge score={val !== undefined ? val * 20 : null}>
                            {val ?? '—'}
                          </StatusBadge>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </ResponsiveDialog>

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
