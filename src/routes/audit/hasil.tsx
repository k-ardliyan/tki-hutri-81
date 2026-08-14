import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { createColumnHelper } from '@tanstack/react-table';
import { Calendar, Clock3, Eye, HelpCircle, Search, Trash2, Trophy, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { HasilPageSkeleton } from '~/components/loading/skeletons';
import { Petunjuk5RModal } from '../../components/5r/Petunjuk5RModal';
import { ScoreBoard } from '../../components/5r/ScoreBoard';
import { DataTable, type features } from '../../components/data-table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { PageHeader } from '../../components/ui/page-header';
import { ResponsiveDialog } from '../../components/ui/responsive-dialog';
import { StatusBadge } from '../../components/ui/status-badge';
import type { FiveRForm, FiveRSubmission } from '../../data/5r';
import { useDebounce } from '../../hooks/use-debounce';
import { currentWeekNumber, todayPrefix } from '../../lib/dateUtils';
import { qk, useSubmissions } from '../../lib/queries';
import { round1, scoreSubmission } from '../../lib/scoring';
import { deleteSubmission, getForms, getRooms, getSettings } from '../../server/functions/5r';

const searchSchema = z.object({
  room: z.string().optional(),
});

export const Route = createFileRoute('/audit/hasil')({
  validateSearch: searchSchema,
  loader: async () => {
    const [rooms, forms, settings] = await Promise.all([getRooms(), getForms(), getSettings()]);
    return { rooms, forms, startDate: settings.startDate, endDate: settings.endDate };
  },
  component: AuditHasilPage,
  pendingComponent: HasilPageSkeleton,
});

type Tab = 'peringkat' | 'log';

function AuditHasilPage() {
  const { rooms, forms, startDate, endDate } = Route.useLoaderData();
  const queryClient = useQueryClient();
  const { data: submissions = [], isLoading } = useSubmissions();
  const [tab, setTab] = useState<Tab>('peringkat');
  const [showGuide, setShowGuide] = useState(false);
  const [dateFilter, setDateFilter] = useState(todayPrefix());
  const [qLog, setQLog] = useState('');
  const debouncedQLog = useDebounce(qLog, 300);
  const [detailTarget, setDetailTarget] = useState<FiveRSubmission | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FiveRSubmission | null>(null);

  const deleteSubmissionLocal = async (id: string) => {
    const res = await deleteSubmission({ data: { id } });
    if (!res.ok) {
      toast.error(res.error ?? 'Gagal menghapus submission');
      return;
    }
    await queryClient.invalidateQueries({ queryKey: qk.submissions });
    toast.success('Penilaian berhasil dihapus');
  };

  const formMap = useMemo(() => new Map<string, FiveRForm>(forms.map((f) => [f.id, f])), [forms]);
  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);

  // Statistik minggu aktif
  const currentWeek = startDate ? currentWeekNumber(new Date(startDate)) : 0;
  const weekCount = useMemo(() => {
    if (currentWeek <= 0) return 0;
    return submissions.filter((s) => (s.weekNumber ?? 1) === currentWeek).length;
  }, [submissions, currentWeek]);

  const dailyLog = useMemo(() => {
    let list = [...submissions];
    if (dateFilter) {
      list = list.filter((s) => s.createdAt.startsWith(dateFilter));
    }
    if (debouncedQLog.trim()) {
      const q = debouncedQLog.toLowerCase().trim();
      list = list.filter((s) => {
        const roomName = (roomMap.get(s.roomId)?.name ?? s.roomId).toLowerCase();
        const auditor = s.auditor.toLowerCase();
        return roomName.includes(q) || auditor.includes(q);
      });
    }
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }, [submissions, dateFilter, debouncedQLog, roomMap]);

  // Columns Log
  const logColumnHelper = createColumnHelper<typeof features, FiveRSubmission>();
  const logColumns = logColumnHelper.columns([
    logColumnHelper.accessor('roomId', {
      header: 'Ruangan',
      cell: ({ row }) => {
        const s = row.original;
        const room = roomMap.get(s.roomId);
        return (
          <div>
            <div className="font-bold text-foreground text-sm">{room?.name ?? s.roomId}</div>
            <div className="text-xs text-muted-foreground">{room?.pic ?? '—'}</div>
          </div>
        );
      },
    }),
    logColumnHelper.accessor('formId', {
      header: 'Form & Penilai',
      cell: ({ row }) => {
        const s = row.original;
        const form = formMap.get(s.formId);
        return (
          <div>
            <div className="text-xs font-semibold text-foreground">{form?.label ?? s.formId}</div>
            <div className="text-[11px] text-muted-foreground">Auditor: {s.auditor}</div>
          </div>
        );
      },
    }),
    logColumnHelper.accessor('createdAt', {
      header: 'Waktu Penilaian',
      cell: ({ row }) => (
        <span className="text-xs font-mono text-muted-foreground">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    }),
    logColumnHelper.display({
      id: 'score',
      header: 'Skor',
      cell: ({ row }) => {
        const s = row.original;
        const form = formMap.get(s.formId);
        const score = form ? scoreSubmission(form, s) : null;
        return score ? (
          <StatusBadge score={round1(score.final)} showScoreMax />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      },
    }),
    logColumnHelper.display({
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => {
        const s = row.original;
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
        );
      },
    }),
  ]);

  const detailForm = detailTarget ? formMap.get(detailTarget.formId) : null;
  const detailRoom = detailTarget ? roomMap.get(detailTarget.roomId) : null;
  const detailScore = detailTarget && detailForm ? scoreSubmission(detailForm, detailTarget) : null;

  if (isLoading) return <HasilPageSkeleton />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Hasil Audit 5R"
        subtitle={`${submissions.length} penilaian total · ${weekCount} minggu ini`}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGuide(true)}
            className="text-xs font-bold cursor-pointer"
          >
            <HelpCircle size={14} className="mr-1.5 text-primary" />
            Panduan &amp; Aturan Nilai
          </Button>
        }
      />

      {/* Modern Main Tab Bar */}
      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 flex-wrap">
        <div className="inline-flex items-center gap-1 rounded-2xl border border-border bg-muted/60 p-1">
          <button
            type="button"
            onClick={() => setTab('peringkat')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              tab === 'peringkat'
                ? 'bg-card text-foreground shadow-xs font-extrabold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Trophy
              size={14}
              className={tab === 'peringkat' ? 'text-amber-500' : 'text-muted-foreground'}
            />
            <span>Papan Peringkat</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('log')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              tab === 'log'
                ? 'bg-card text-foreground shadow-xs font-extrabold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock3
              size={14}
              className={tab === 'log' ? 'text-primary' : 'text-muted-foreground'}
            />
            <span>Log Seluruh Penilaian</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                tab === 'log' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
              }`}
            >
              {submissions.length}
            </span>
          </button>
        </div>

        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span>
            Minggu ini: <strong className="text-foreground font-bold">{weekCount}</strong> penilaian
          </span>
        </div>
      </div>

      {/* Tab: Peringkat */}
      {tab === 'peringkat' && (
        <div className="space-y-4 pt-1">
          <ScoreBoard
            submissions={submissions}
            rooms={rooms}
            forms={forms}
            deadline={endDate}
            mode="admin"
            showGuideButton={false}
            onOpenGuide={() => setShowGuide(true)}
          />
        </div>
      )}

      {/* Tab: Log Penilaian */}
      {tab === 'log' && (
        <div className="space-y-4 pt-1">
          {/* Date filter & Search */}
          <Card className="rounded-2xl border-border bg-card shadow-2xs">
            <CardContent className="p-3.5 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 items-center gap-2">
                  <div className="relative flex-1 max-w-sm">
                    <Search
                      size={14}
                      className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground/60 pointer-events-none"
                    />
                    <Input
                      type="text"
                      value={qLog}
                      onChange={(e) => setQLog(e.target.value)}
                      placeholder="Cari ruangan / auditor..."
                      className="h-10 pl-9 rounded-xl text-xs bg-muted/40"
                    />
                  </div>
                  {qLog && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setQLog('')}
                      className="h-9 px-2 text-xs font-bold text-primary rounded-xl"
                    >
                      <X size={12} className="mr-1" />
                      Clear
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-muted-foreground shrink-0" />
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="h-10 w-40 rounded-xl text-xs bg-muted/40"
                  />
                  {dateFilter && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDateFilter('')}
                      className="h-9 px-2 text-xs font-bold text-primary rounded-xl"
                    >
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
            toolbar={
              <span className="text-xs font-bold text-muted-foreground">
                Menampilkan {dailyLog.length} riwayat penilaian
              </span>
            }
          />
        </div>
      )}

      {/* Detail Responsive Modal */}
      <ResponsiveDialog
        open={!!detailTarget}
        onOpenChange={(o) => {
          if (!o) setDetailTarget(null);
        }}
        title={detailRoom ? `Detail Audit: ${detailRoom.name}` : 'Detail Audit'}
        description={detailForm ? `${detailForm.label} · Auditor: ${detailTarget?.auditor}` : ''}
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (detailTarget) setDeleteTarget(detailTarget);
                setDetailTarget(null);
              }}
              className="flex-1 sm:flex-initial text-xs font-bold rounded-xl"
            >
              <Trash2 size={13} className="mr-1.5" />
              Hapus Submission
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDetailTarget(null)}
              className="flex-1 sm:flex-initial text-xs font-bold rounded-xl"
            >
              <X size={13} className="mr-1.5" />
              Tutup
            </Button>
          </div>
        }
      >
        {detailTarget && detailForm && (
          <div className="space-y-4 text-xs">
            {detailScore && (
              <div className="flex items-center justify-between rounded-2xl bg-muted/50 p-4 border border-border">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    Skor Akhir Form
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                    {formatDate(detailTarget.createdAt)}
                  </p>
                </div>
                <StatusBadge score={round1(detailScore.final)} showScoreMax />
              </div>
            )}

            <div className="space-y-3">
              {detailForm.categories.map((cat) => (
                <div
                  key={cat.id}
                  className="rounded-2xl border border-border bg-card p-3.5 space-y-2.5 shadow-2xs"
                >
                  <p className="text-xs font-heading font-black text-foreground">{cat.label}</p>
                  <div className="space-y-2 divide-y divide-border/40">
                    {cat.criteria.map((c) => {
                      const val = detailTarget.answers[c.id];
                      const note = detailTarget.notes[c.id];
                      return (
                        <div
                          key={c.id}
                          className="flex items-start justify-between gap-3 pt-2 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-foreground">{c.order}. </span>
                            <span className="text-muted-foreground">{c.text}</span>
                            {note && (
                              <p className="text-[11px] text-muted-foreground/90 italic mt-1 bg-muted/40 rounded-lg p-1.5">
                                "{note}"
                              </p>
                            )}
                          </div>
                          <StatusBadge score={val !== undefined ? val * 20 : null}>
                            {val ?? '—'}
                          </StatusBadge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </ResponsiveDialog>

      {/* Delete confirm dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus submission ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `${roomMap.get(deleteTarget.roomId)?.name ?? deleteTarget.roomId} · ${formMap.get(deleteTarget.formId)?.label ?? ''}`
                : ''}
              . Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) void deleteSubmissionLocal(deleteTarget.id);
                setDeleteTarget(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Petunjuk5RModal open={showGuide} onOpenChange={setShowGuide} />
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
