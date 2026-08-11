import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { createColumnHelper } from '@tanstack/react-table';
import { CalendarClock, Clock3, Eye, HelpCircle, Search, Trash2, Trophy, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
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
import { Combobox, type ComboboxOption } from '../../components/ui/combobox';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { PageHeader } from '../../components/ui/page-header';
import { ResponsiveDialog } from '../../components/ui/responsive-dialog';
import { StatusBadge } from '../../components/ui/status-badge';
import type { FiveRForm, FiveRSubmission } from '../../data/5r';
import { useDebounce } from '../../hooks/use-debounce';
import { qk, useSubmissions } from '../../lib/queries';
import { round1, scoreSubmission } from '../../lib/scoring';
import {
  deleteSubmission,
  getForms,
  getRooms,
  getSettings,
  setSettings,
} from '../../server/functions/5r';

export const Route = createFileRoute('/admin/hasil')({
  loader: async () => {
    const [rooms, forms, settings] = await Promise.all([getRooms(), getForms(), getSettings()]);
    return { rooms, forms, startDate: settings.startDate, endDate: settings.endDate };
  },
  component: AdminHasilPage,
  pendingComponent: HasilPageSkeleton,
});

/** ISO → value utk <input type="datetime-local"> (waktu lokal). */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type TabKey = 'peringkat' | 'log' | 'tenggat';

function AdminHasilPage() {
  const { rooms, forms, startDate, endDate } = Route.useLoaderData();
  const queryClient = useQueryClient();
  const { data: submissions = [], isLoading } = useSubmissions();
  const [activeTab, setActiveTab] = useState<TabKey>('peringkat');
  const [showGuide, setShowGuide] = useState(false);

  // Periode penilaian (admin set)
  const [startState, setStartState] = useState<string | null>(startDate);
  const [endState, setEndState] = useState<string | null>(endDate);
  const [startInput, setStartInput] = useState(toLocalInput(startDate));
  const [endInput, setEndInput] = useState(toLocalInput(endDate));
  const [periodBusy, setPeriodBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const savePeriod = async (rawStart: string, rawEnd: string) => {
    setPeriodBusy(true);
    const startValue = rawStart.trim() ? new Date(rawStart).toISOString() : null;
    const endValue = rawEnd.trim() ? new Date(rawEnd).toISOString() : null;
    const res = await setSettings({ data: { startDate: startValue, endDate: endValue } });
    setPeriodBusy(false);
    if (!res.ok) {
      toast.error(res.error ?? 'Gagal menyimpan periode penilaian');
      return;
    }
    setStartState(res.startDate);
    setEndState(res.endDate);
    setStartInput(toLocalInput(res.startDate));
    setEndInput(toLocalInput(res.endDate));
    toast.success(
      res.startDate && res.endDate ? 'Periode penilaian disimpan' : 'Periode penilaian dihapus'
    );
  };

  // Filters
  const [filterRoom, setFilterRoom] = useState<string>('ALL');
  const [filterForm, setFilterForm] = useState<string>('ALL');
  const [filterAuditor, setFilterAuditor] = useState('');
  const debouncedAuditor = useDebounce(filterAuditor, 300);
  const [filterDate, setFilterDate] = useState('');

  // Selected for detail modal & delete confirm
  const [detailTarget, setDetailTarget] = useState<FiveRSubmission | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FiveRSubmission | null>(null);

  const formMap = useMemo(() => new Map<string, FiveRForm>(forms.map((f) => [f.id, f])), [forms]);
  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);

  const roomOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: 'ALL', label: 'Semua Ruangan' },
      ...rooms.map((r) => ({ value: r.id, label: r.name })),
    ],
    [rooms]
  );

  const formOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: 'ALL', label: 'Semua Form' },
      ...forms.map((f) => ({ value: f.id, label: f.label })),
    ],
    [forms]
  );

  const deleteSubmissionLocal = async (id: string) => {
    const res = await deleteSubmission({ data: { id } });
    if (!res.ok) {
      toast.error(res.error ?? 'Gagal menghapus submission');
      return;
    }
    await queryClient.invalidateQueries({ queryKey: qk.submissions });
    toast.success('Penilaian berhasil dihapus');
  };

  // Filtered sorted
  const sorted = useMemo(() => {
    let list = [...submissions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (filterRoom && filterRoom !== 'ALL') list = list.filter((s) => s.roomId === filterRoom);
    if (filterForm && filterForm !== 'ALL') list = list.filter((s) => s.formId === filterForm);
    if (debouncedAuditor) {
      const q = debouncedAuditor.toLowerCase();
      list = list.filter(
        (s) => s.auditor.toLowerCase().includes(q) || (s.createdBy ?? '').toLowerCase().includes(q)
      );
    }
    if (filterDate) list = list.filter((s) => s.createdAt.startsWith(filterDate));
    return list;
  }, [submissions, filterRoom, filterForm, debouncedAuditor, filterDate]);

  const hasFilter =
    (filterRoom && filterRoom !== 'ALL') ||
    (filterForm && filterForm !== 'ALL') ||
    filterAuditor ||
    filterDate;
  const resetFilters = () => {
    setFilterRoom('ALL');
    setFilterForm('ALL');
    setFilterAuditor('');
    setFilterDate('');
  };

  // Columns definition
  const columnHelper = createColumnHelper<typeof features, FiveRSubmission>();

  const columns = columnHelper.columns([
    columnHelper.accessor('roomId', {
      header: 'Ruangan',
      cell: ({ row }) => {
        const s = row.original;
        const room = roomMap.get(s.roomId);
        return (
          <div className="min-w-0">
            <div className="font-bold text-foreground text-sm">{room?.name ?? s.roomId}</div>
            <div className="text-xs text-muted-foreground">{room?.pic ?? '—'}</div>
          </div>
        );
      },
    }),
    columnHelper.accessor('formId', {
      header: 'Form & Auditor',
      cell: ({ row }) => {
        const s = row.original;
        const form = formMap.get(s.formId);
        return (
          <div>
            <div className="text-xs font-semibold text-foreground">{form?.label ?? s.formId}</div>
            <div className="text-[11px] text-muted-foreground">
              By: <span className="font-medium text-foreground/80">{s.auditor}</span>
              {s.createdBy && <span className="text-muted-foreground/60"> (@{s.createdBy})</span>}
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor('createdAt', {
      header: 'Waktu Penilaian',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground font-mono">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    }),
    columnHelper.display({
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
    columnHelper.display({
      id: 'actions',
      header: () => <span className="sr-only">Aksi</span>,
      cell: ({ row }) => {
        const s = row.original;
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
        );
      },
    }),
  ]);

  if (isLoading) return <HasilPageSkeleton />;

  const detailForm = detailTarget ? formMap.get(detailTarget.formId) : null;
  const detailRoom = detailTarget ? roomMap.get(detailTarget.roomId) : null;
  const detailScore = detailForm && detailTarget ? scoreSubmission(detailForm, detailTarget) : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Hasil Penilaian 5R & Dekorasi"
        subtitle={`${submissions.length} submission tercatat · ${new Set(submissions.map((s) => s.roomId)).size} ruangan dinilai`}
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
        <div className="inline-flex items-center gap-1 rounded-2xl border border-border/80 bg-muted/60 p-1 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('peringkat')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              activeTab === 'peringkat'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Trophy
              size={14}
              className={activeTab === 'peringkat' ? 'text-amber-500' : 'text-muted-foreground'}
            />
            <span>Papan Peringkat</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('log')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              activeTab === 'log'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock3
              size={14}
              className={activeTab === 'log' ? 'text-primary' : 'text-muted-foreground'}
            />
            <span>Log Seluruh Penilaian</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                activeTab === 'log'
                  ? 'bg-primary/15 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {submissions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tenggat')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              activeTab === 'tenggat'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CalendarClock
              size={14}
              className={activeTab === 'tenggat' ? 'text-rose-500' : 'text-muted-foreground'}
            />
            <span>Periode Penilaian</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Peringkat & Skor */}
      {activeTab === 'peringkat' && (
        <div className="space-y-4 pt-1">
          <ScoreBoard
            submissions={submissions}
            rooms={rooms}
            forms={forms}
            deadline={endState}
            mode="admin"
            showGuideButton={false}
            onOpenGuide={() => setShowGuide(true)}
          />
        </div>
      )}

      {/* Tab 2: Log & Data Table */}
      {activeTab === 'log' && (
        <div className="space-y-4 pt-1">
          {/* Filter Card */}
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
                  <Label className="text-xs font-bold text-muted-foreground">
                    Cari Auditor / User
                  </Label>
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground/60"
                    />
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="mt-3 h-7 text-xs font-bold text-primary"
                >
                  <X size={12} className="mr-1" />
                  Reset Filter
                </Button>
              )}
            </CardContent>
          </Card>

          {/* DataTable */}
          <DataTable
            data={sorted}
            columns={columns}
            getRowId={(s) => s.id}
            pageSize={15}
            toolbar={
              <span className="text-sm font-medium text-muted-foreground">
                {sorted.length} data{' '}
                {hasFilter ? `(dari total ${submissions.length})` : 'ditampilkan'}
              </span>
            }
          />
        </div>
      )}

      {/* Tab 3: Periode Penilaian */}
      {activeTab === 'tenggat' && (
        <div className="space-y-4 pt-1">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CalendarClock size={20} />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <h2 className="text-sm font-extrabold text-foreground">
                    Pengaturan Periode Penilaian
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {startState && endState
                      ? `Periode aktif: ${new Date(startState).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })} sampai ${new Date(endState).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}. Di luar periode ini, form penilaian dekorasi & 5R otomatis terkunci untuk semua role.`
                      : 'Belum ada periode penilaian yang ditentukan. Set tanggal mulai & selesai agar penilaian per minggu aktif.'}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-3">
                <Label className="text-xs font-bold text-foreground">
                  Tanggal Mulai & Selesai Penilaian
                </Label>
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                    <Input
                      type="datetime-local"
                      value={startInput}
                      onChange={(e) => setStartInput(e.target.value)}
                      className="h-10 w-full sm:w-64 bg-card"
                      aria-label="Tanggal mulai periode"
                    />
                    <span className="text-xs text-muted-foreground text-center">sampai</span>
                    <Input
                      type="datetime-local"
                      value={endInput}
                      onChange={(e) => setEndInput(e.target.value)}
                      className="h-10 w-full sm:w-64 bg-card"
                      aria-label="Tanggal selesai periode"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-10 text-xs font-bold"
                      loading={periodBusy}
                      onClick={() => void savePeriod(startInput, endInput)}
                    >
                      {startState && endState ? 'Perbarui Periode' : 'Aktifkan Periode'}
                    </Button>
                    {(startState || endState) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 text-xs font-bold text-destructive hover:bg-destructive/10"
                        loading={periodBusy}
                        onClick={() => {
                          setStartInput('');
                          setEndInput('');
                          void savePeriod('', '');
                        }}
                      >
                        Hapus Periode
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Setiap 7 hari dari tanggal mulai = 1 minggu penilaian. Auditor boleh mengisi tiap
                  form maksimal 1x per minggu per ruangan.
                </p>
              </div>
            </CardContent>
          </Card>
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
                  <p className="text-xs text-muted-foreground">Skor Akhir</p>
                  <p className="text-xs font-medium text-muted-foreground/70">
                    {formatDate(detailTarget.createdAt)}
                  </p>
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
                      const val = detailTarget.answers[c.id];
                      const note = detailTarget.notes[c.id];
                      return (
                        <div
                          key={c.id}
                          className="flex items-start justify-between gap-2 pt-1.5 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-foreground/90">{c.order}. </span>
                            <span className="text-muted-foreground">{c.text}</span>
                            {note && (
                              <p className="text-[10px] text-muted-foreground italic mt-0.5">
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

      {/* Delete confirm */}
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
