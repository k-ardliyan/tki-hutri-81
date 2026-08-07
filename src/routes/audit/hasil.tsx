/**
 * AuditHasilPage — hasil audit 5R dengan daily log + peringkat (menggunakan DataTable block).
 * Complete with ResponsiveDialog detail modal (mobile bottomsheet) with Hapus & Close buttons.
 */
import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { createColumnHelper } from '@tanstack/react-table'
import { Calendar, Clock3, Eye, Medal, Search, Trash2, Trophy, X } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { PageHeader } from '../../components/ui/page-header'
import { StatusBadge } from '../../components/ui/status-badge'
import { DataTable, features } from '../../components/data-table'
import { HasilPageSkeleton } from '../../components/ui/skeletons'
import { ResponsiveDialog } from '../../components/ui/responsive-dialog'
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
import { getRooms, getForms, deleteSubmission } from '../../server/functions/5r'
import type { FiveRForm, FiveRSubmission } from '../../data/5r'
import { scoreSubmission, aggregateRoom, round1, type SubmissionScore } from '../../lib/scoring'
import { todayPrefix } from '../../lib/dateUtils'
import { useSubmissions } from '../../lib/queries'

import { useDebounce } from '../../hooks/use-debounce'

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

interface RoomScoreRow {
  rank: number
  id: string
  name: string
  pic: string
  count: number
  final: number
}

function AuditHasilPage() {
  const { rooms, forms } = Route.useLoaderData()
  const { room: selectedRoom } = Route.useSearch()
  const { data: submissions = [], isLoading } = useSubmissions()
  const [tab, setTab] = useState<Tab>('peringkat')
  const [dateFilter, setDateFilter] = useState(todayPrefix())
  const [qLog, setQLog] = useState('')
  const debouncedQLog = useDebounce(qLog, 300)
  const [detailTarget, setDetailTarget] = useState<FiveRSubmission | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FiveRSubmission | null>(null)

  const formMap = useMemo(() => new Map<string, FiveRForm>(forms.map((f) => [f.id, f])), [forms])
  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms])

  // Room ranking data
  const roomScores = useMemo<RoomScoreRow[]>(() => {
    const list = rooms.map((room) => {
      const roomSubs = submissions.filter((s) => s.roomId === room.id)
      const scores = roomSubs
        .map((s) => {
          const form = formMap.get(s.formId)
          return form ? scoreSubmission(form, s) : null
        })
        .filter((x): x is SubmissionScore => x !== null)
      const agg = aggregateRoom(scores)
      return {
        rank: 0,
        id: room.id,
        name: room.name,
        pic: room.pic,
        count: roomSubs.length,
        final: agg,
      }
    })
    list.sort((a, b) => b.final - a.final)
    return list.map((r, i) => ({ ...r, rank: i + 1 }))
  }, [rooms, submissions, formMap])

  const filteredRooms = useMemo(() => {
    if (!selectedRoom) return roomScores
    return roomScores.filter((r) => r.id === selectedRoom)
  }, [roomScores, selectedRoom])

  // Daily log
  const todayCount = useMemo(() => {
    const today = todayPrefix()
    return submissions.filter((s) => s.createdAt.startsWith(today)).length
  }, [submissions])

  const dailyLog = useMemo(() => {
    let list = [...submissions]
    if (dateFilter) {
      list = list.filter((s) => s.createdAt.startsWith(dateFilter))
    }
    if (debouncedQLog.trim()) {
      const q = debouncedQLog.toLowerCase().trim()
      list = list.filter((s) => {
        const roomName = (roomMap.get(s.roomId)?.name ?? s.roomId).toLowerCase()
        const auditor = s.auditor.toLowerCase()
        return roomName.includes(q) || auditor.includes(q)
      })
    }
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return list
  }, [submissions, dateFilter, debouncedQLog, roomMap])

  // Columns Ranking
  const rankColumnHelper = createColumnHelper<typeof features, RoomScoreRow>()
  const rankColumns = rankColumnHelper.columns([
    rankColumnHelper.accessor('rank', {
      header: 'Peringkat',
      cell: ({ row }) => {
        const r = row.original.rank
        return (
          <div className="flex items-center gap-1.5 font-bold">
            {r === 1 && <Medal size={16} className="text-amber-500 shrink-0" />}
            {r === 2 && <Medal size={16} className="text-slate-400 shrink-0" />}
            {r === 3 && <Medal size={16} className="text-amber-700 shrink-0" />}
            <span className="tabular-nums">#{r}</span>
          </div>
        )
      },
    }),
    rankColumnHelper.accessor('name', {
      header: 'Ruangan & PIC',
      cell: ({ row }) => (
        <div>
          <div className="font-bold text-foreground text-sm">{row.original.name}</div>
          <div className="text-xs text-muted-foreground">PIC: {row.original.pic}</div>
        </div>
      ),
    }),
    rankColumnHelper.accessor('count', {
      header: 'Jumlah Penilaian',
      cell: ({ row }) => (
        <span className="text-xs font-semibold text-muted-foreground">{row.original.count}x dinilai</span>
      ),
    }),
    rankColumnHelper.display({
      id: 'finalScore',
      header: 'Skor Akhir 5R',
      cell: ({ row }) => (
        <StatusBadge score={row.original.count > 0 ? round1(row.original.final) : null} />
      ),
    }),
  ])

  // Columns Log
  const logColumnHelper = createColumnHelper<typeof features, FiveRSubmission>()
  const logColumns = logColumnHelper.columns([
    logColumnHelper.accessor('roomId', {
      header: 'Ruangan',
      cell: ({ row }) => {
        const s = row.original
        const room = roomMap.get(s.roomId)
        return (
          <div>
            <div className="font-bold text-foreground text-sm">{room?.name ?? s.roomId}</div>
            <div className="text-xs text-muted-foreground">{room?.pic ?? '—'}</div>
          </div>
        )
      },
    }),
    logColumnHelper.accessor('formId', {
      header: 'Form & Penilai',
      cell: ({ row }) => {
        const s = row.original
        const form = formMap.get(s.formId)
        return (
          <div>
            <div className="text-xs font-semibold text-foreground">{form?.label ?? s.formId}</div>
            <div className="text-[11px] text-muted-foreground">Auditor: {s.auditor}</div>
          </div>
        )
      },
    }),
    logColumnHelper.accessor('createdAt', {
      header: 'Waktu Penilaian',
      cell: ({ row }) => (
        <span className="text-xs font-mono text-muted-foreground">{formatDate(row.original.createdAt)}</span>
      ),
    }),
    logColumnHelper.display({
      id: 'score',
      header: 'Skor',
      cell: ({ row }) => {
        const s = row.original
        const form = formMap.get(s.formId)
        const score = form ? scoreSubmission(form, s) : null
        return score ? <StatusBadge score={round1(score.final)} showScoreMax /> : <span className="text-xs text-muted-foreground">—</span>
      },
    }),
    logColumnHelper.display({
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => {
        const s = row.original
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDetailTarget(s)}
              className="h-8 px-2.5 text-xs font-bold"
            >
              <Eye size={13} className="mr-1 text-primary" />
              Detail
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setDeleteTarget(s)}
              className="h-8 w-8 text-destructive hover:bg-destructive/10"
            >
              <Trash2 size={13} />
              <span className="sr-only">Hapus</span>
            </Button>
          </div>
        )
      },
    }),
  ])

  const detailForm = detailTarget ? formMap.get(detailTarget.formId) : null
  const detailRoom = detailTarget ? roomMap.get(detailTarget.roomId) : null
  const detailScore = detailTarget && detailForm ? scoreSubmission(detailForm, detailTarget) : null

  if (isLoading) return <HasilPageSkeleton />

  return (
    <div className="space-y-4">
      <PageHeader
        title="Hasil Audit 5R"
        subtitle={`${submissions.length} penilaian total · ${todayCount} hari ini`}
      />

      {/* Tab bar */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="peringkat">
            <Trophy size={14} className="mr-1" />Peringkat Ruangan
          </TabsTrigger>
          <TabsTrigger value="log">
            <Clock3 size={14} className="mr-1" />Log Penilaian
            {todayCount > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[9px] text-primary-foreground">{todayCount}</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab: Peringkat */}
        <TabsContent value="peringkat" className="mt-4 space-y-4">
          <DataTable
            data={filteredRooms}
            columns={rankColumns}
            getRowId={(r) => r.id}
            pageSize={10}
            toolbar={<span className="text-sm font-medium text-muted-foreground">{filteredRooms.length} ruangan terdaftar</span>}
          />
        </TabsContent>

        {/* Tab: Log Penilaian */}
        <TabsContent value="log" className="mt-4 space-y-4">
          {/* Date filter & Search */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 items-center gap-2">
                  <div className="relative flex-1 max-w-xs">
                    <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground/60" />
                    <Input
                      type="text"
                      value={qLog}
                      onChange={(e) => setQLog(e.target.value)}
                      placeholder="Cari ruangan / auditor..."
                      className="h-9 pl-9"
                    />
                  </div>
                  {qLog && (
                    <Button variant="ghost" size="sm" onClick={() => setQLog('')} className="h-9 px-2 text-xs font-bold text-primary">
                      <X size={12} className="mr-1" />Clear
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-muted-foreground shrink-0" />
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="h-9 w-40"
                  />
                  {dateFilter && (
                    <Button variant="ghost" size="sm" onClick={() => setDateFilter('')} className="h-9 px-2 text-xs font-bold text-primary">
                      Semua
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <DataTable
            data={dailyLog}
            columns={logColumns}
            getRowId={(s) => s.id}
            pageSize={15}
            toolbar={<span className="text-sm font-medium text-muted-foreground">{dailyLog.length} log penilaian</span>}
          />
        </TabsContent>
      </Tabs>

      {/* Detail Responsive Modal (Mobile BottomSheet / Desktop Dialog) */}
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
              <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3 border border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Skor Akhir 5R</p>
                  <p className="text-[11px] font-mono text-muted-foreground/80">{formatDate(detailTarget.createdAt)}</p>
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

      {/* Delete confirm dialog */}
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
                if (deleteTarget) void deleteSubmission({ data: { id: deleteTarget.id } })
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
