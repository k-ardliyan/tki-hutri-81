/**
 * AdminSnackSessions — manajemen sesi snack lifecycle (admin/superadmin).
 * Lifecycle (PRD §5-8): DRAFT → SCHEDULED → ACTIVE ⇄ PAUSED → CLOSED.
 * Create = draft + jadwal + stok opsional; Publish = generate entitlement snapshot.
 * Delete hanya utk draft tanpa redemption (PRD §32).
 * Mobile-First UI/UX: Adaptive card layout di mobile, DataTable di desktop.
 */

import { createFileRoute } from '@tanstack/react-router';
import { createColumnHelper } from '@tanstack/react-table';
import {
  CalendarDays,
  Clock,
  EllipsisVertical,
  Layers,
  Play,
  Plus,
  Power,
  Send,
  Trash2,
  UserPen,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { SnackSessionsSkeleton } from '~/components/loading/skeletons';
import { DataTable, type features } from '../../components/data-table';
import { Alert, AlertDescription } from '../../components/ui/alert';
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
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ResponsiveDialog } from '../../components/ui/responsive-dialog';
import { requireRole } from '../../lib/routeGuard';
import { cn } from '../../lib/utils';
import {
  closeSession,
  createSession,
  deleteSession,
  getSessions,
  pauseSession,
  publishSession,
  resumeSession,
  type SnackSessionWithMeta,
  updateSession,
} from '../../server/functions/snack';

export const Route = createFileRoute('/snack/sessions')({
  beforeLoad: async () => {
    await requireRole(['superadmin', 'admin']);
  },
  component: AdminSnackSessions,
  pendingComponent: SnackSessionsSkeleton,
});

interface SessionRow extends SnackSessionWithMeta {}

type ConfirmType = 'publish' | 'pause' | 'resume' | 'close';

const CONFIRM_META: Record<
  ConfirmType,
  { title: string; desc: (s: SessionRow) => string; label: string; destructive?: boolean }
> = {
  publish: {
    title: 'Publish sesi?',
    desc: (s) =>
      `${s.name}. ${s.entitled} karyawan akan berhak mengambil snack. Sesi aktif otomatis saat jadwal tiba.`,
    label: 'Publish',
  },
  pause: {
    title: 'Jeda distribusi?',
    desc: (s) =>
      `${s.name}. Distribusi dihentikan sementara — petugas tidak bisa mengambil snack sampai dilanjutkan.`,
    label: 'Jeda',
  },
  resume: {
    title: 'Lanjutkan distribusi?',
    desc: (s) => `${s.name}. Distribusi kembali aktif — petugas bisa mengambil snack lagi.`,
    label: 'Lanjutkan',
  },
  close: {
    title: 'Tutup sesi?',
    desc: (s) =>
      `${s.name}. ${s.redeemed} snack sudah terambil. Distribusi berhenti total — karyawan tidak bisa mengambil lagi. Riwayat pengambilan tetap tersimpan dan tidak bisa dibatalkan.`,
    label: 'Tutup Sesi',
    destructive: true,
  },
};

const STATUS_BADGE: Record<string, { label: string; className: string; dotClass: string }> = {
  draft: {
    label: 'DRAF',
    className: 'bg-muted text-muted-foreground border-border',
    dotClass: 'bg-slate-400',
  },
  scheduled: {
    label: 'DIJADWALKAN',
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
    dotClass: 'bg-blue-500',
  },
  active: {
    label: 'AKTIF',
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    dotClass: 'bg-emerald-500 animate-pulse',
  },
  paused: {
    label: 'DIJEDA',
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    dotClass: 'bg-amber-500',
  },
  closed: {
    label: 'DITUTUP',
    className: 'bg-muted text-muted-foreground border-border',
    dotClass: 'bg-slate-400',
  },
  archived: {
    label: 'ARSIP',
    className: 'bg-muted text-muted-foreground border-border',
    dotClass: 'bg-slate-400',
  },
};

function AdminSnackSessions() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  // Konfirmasi action risk (publish/pause/resume/close)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'publish' | 'pause' | 'resume' | 'close';
    session: SessionRow;
  } | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Create drawer
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStarts, setNewStarts] = useState('');
  const [newEnds, setNewEnds] = useState('');
  const [newStock, setNewStock] = useState('');

  // Edit drawer
  const [editTarget, setEditTarget] = useState<SessionRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editStarts, setEditStarts] = useState('');
  const [editEnds, setEditEnds] = useState('');
  const [editStock, setEditStock] = useState('');

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<SessionRow | null>(null);

  const load = useCallback(async () => {
    try {
      setSessions(await getSessions());
    } finally {
      setSessionsLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const doCreate = async () => {
    setErr(null);
    if (!newName.trim()) {
      setErr('Nama sesi wajib diisi');
      return;
    }
    setCreating(true);
    try {
      await createSession({
        data: {
          name: newName.trim(),
          // datetime-local = jam lokal; konversi ke UTC ISO sebelum kirim
          // (server prod TZ UTC — parse string lokal mentah = geser 7 jam).
          startsAt: newStarts ? new Date(newStarts).toISOString() : null,
          endsAt: newEnds ? new Date(newEnds).toISOString() : null,
          stockQuota: newStock ? Number(newStock) : null,
        },
      });
      setNewName('');
      setNewStarts('');
      setNewEnds('');
      setNewStock('');
      setShowCreate(false);
      toast.success('Draft sesi berhasil dibuat!');
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal membuat sesi');
    } finally {
      setCreating(false);
    }
  };

  const doEdit = async () => {
    setErr(null);
    if (!editTarget) return;
    if (!editName.trim()) {
      setErr('Nama sesi wajib diisi');
      return;
    }
    try {
      await updateSession({
        data: {
          id: editTarget.id,
          name: editName.trim(),
          startsAt: editStarts ? new Date(editStarts).toISOString() : null,
          endsAt: editEnds ? new Date(editEnds).toISOString() : null,
          stockQuota: editStock ? Number(editStock) : null,
        },
      });
      setEditTarget(null);
      toast.success('Sesi berhasil diperbarui!');
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal mengupdate sesi');
    }
  };

  const doPublish = async (s: SessionRow) => setConfirmAction({ type: 'publish', session: s });
  const doPause = async (s: SessionRow) => setConfirmAction({ type: 'pause', session: s });
  const doResume = async (s: SessionRow) => setConfirmAction({ type: 'resume', session: s });
  const doClose = async (s: SessionRow) => setConfirmAction({ type: 'close', session: s });

  /** Jalankan action risk setelah konfirmasi dialog (try/catch — error tampil di alert). */
  const runConfirmed = async () => {
    if (!confirmAction) return;
    const { type, session } = confirmAction;
    setConfirming(true);
    try {
      if (type === 'publish') {
        const res = await publishSession({ data: { id: session.id } });
        toast.success(`Sesi dipublish — ${res.entitled} karyawan berhak snack`);
      } else if (type === 'pause') {
        await pauseSession({ data: { id: session.id } });
        toast.success('Distribusi dijeda');
      } else if (type === 'resume') {
        await resumeSession({ data: { id: session.id } });
        toast.success('Distribusi dilanjutkan');
      } else {
        await closeSession({ data: { id: session.id } });
        toast.success('Sesi ditutup');
      }
      setConfirmAction(null);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal menjalankan aksi');
    } finally {
      setConfirming(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSession({ data: { id: deleteTarget.id } });
      setDeleteTarget(null);
      await load();
      toast.success('Sesi berhasil dihapus');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal menghapus');
    }
  };

  const columnHelper = createColumnHelper<typeof features, SessionRow>();

  const columns = columnHelper.columns([
    columnHelper.accessor('name', {
      header: 'Sesi',
      enableHiding: false,
      cell: ({ row }) => {
        const s = row.original;
        const st = STATUS_BADGE[s.effectiveStatus] ?? STATUS_BADGE.draft;
        return (
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground">{s.name}</span>
              <Badge className={cn('px-1.5 py-0 text-[10px] font-bold', st.className)}>
                {st.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              #{s.id}
              {s.startsAt && s.endsAt ? (
                <> · {formatRange(s.startsAt, s.endsAt)}</>
              ) : (
                ' · tanpa jadwal'
              )}
            </p>
          </div>
        );
      },
    }),
    columnHelper.accessor('entitled', {
      header: 'Berhak',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold">{row.original.entitled}</span>
      ),
    }),
    columnHelper.accessor('redeemed', {
      header: 'Terambil',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
          {row.original.redeemed}
        </span>
      ),
    }),
    columnHelper.accessor('remaining', {
      header: 'Sisa Stok',
      cell: ({ row }) => {
        const s = row.original;
        if (s.remaining === null) return <span className="text-muted-foreground text-xs">—</span>;
        const stock = s.stockQuota ?? s.quota;
        return (
          <span
            className={cn(
              'text-xs font-bold font-mono',
              s.remaining === 0
                ? 'text-destructive'
                : s.remaining <= stock * 0.2
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
            )}
          >
            {s.remaining}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: () => <span className="sr-only">Aksi</span>,
      enableHiding: false,
      cell: ({ row }) => {
        const s = row.original;
        const isDraft = s.effectiveStatus === 'draft';
        const isActive = s.effectiveStatus === 'active';
        const isPaused = s.effectiveStatus === 'paused';
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground data-[state=open]:bg-muted rounded-lg"
              >
                <span className="sr-only">Buka menu</span>
                <EllipsisVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl">
              {isDraft && (
                <DropdownMenuItem
                  onClick={() => {
                    setEditTarget(s);
                    setEditName(s.name);
                    setEditStarts(s.startsAt ? toLocalInput(s.startsAt) : '');
                    setEditEnds(s.endsAt ? toLocalInput(s.endsAt) : '');
                    setEditStock(s.stockQuota !== null ? String(s.stockQuota) : '');
                  }}
                >
                  <UserPen className="mr-1.5 size-4" /> Edit Sesi
                </DropdownMenuItem>
              )}
              {isDraft && (
                <DropdownMenuItem onClick={() => void doPublish(s)}>
                  <Send className="mr-1.5 size-4" /> Publish (Jadwalkan)
                </DropdownMenuItem>
              )}
              {(isActive || isPaused) && (
                <DropdownMenuItem onClick={() => (isPaused ? void doResume(s) : void doPause(s))}>
                  {isPaused ? (
                    <Play className="mr-1.5 size-4 text-emerald-500" />
                  ) : (
                    <Power className="mr-1.5 size-4 text-amber-500" />
                  )}
                  {isPaused ? 'Lanjutkan Distribusi' : 'Jeda Sementara (Pause)'}
                </DropdownMenuItem>
              )}
              {(isActive || isPaused) && (
                <DropdownMenuItem onClick={() => void doClose(s)}>
                  <CalendarDays className="mr-1.5 size-4 text-destructive" /> Tutup Sesi
                </DropdownMenuItem>
              )}
              {isDraft && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(s)}>
                    <Trash2 className="mr-1.5 size-4" /> Hapus Sesi
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    }),
  ]);

  if (sessionsLoading) {
    return <SnackSessionsSkeleton />;
  }

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <Card className="border border-border/80 bg-gradient-to-br from-card to-muted/20 shadow-xs rounded-2xl overflow-hidden">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                <Layers size={17} />
              </div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-foreground">
                Manajemen Sesi Snack
              </h1>
            </div>
            <p className="text-xs text-muted-foreground pl-10">
              Kelola jadwal, kuota stok, dan siklus hidup sesi distribusi snack.
            </p>
          </div>

          <Button
            onClick={() => {
              setNewName('');
              setNewStarts('');
              setNewEnds('');
              setNewStock('');
              setShowCreate(true);
            }}
            className="rounded-xl h-10 font-bold px-4 shadow-sm self-start sm:self-auto"
          >
            <Plus size={15} className="mr-1.5" />
            Tambah Sesi
          </Button>
        </CardContent>
      </Card>

      {err && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertDescription className="text-xs sm:text-sm">{err}</AlertDescription>
        </Alert>
      )}

      {/* ── MOBILE VIEW (< md): Responsive Interactive Session Cards ── */}
      <div className="space-y-3 block md:hidden">
        {sessions.length === 0 ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="py-10 text-center text-xs text-muted-foreground">
              Belum ada sesi snack. Tekan tombol Tambah Sesi untuk membuat.
            </CardContent>
          </Card>
        ) : (
          sessions.map((s) => {
            const st = STATUS_BADGE[s.effectiveStatus] ?? STATUS_BADGE.draft;
            const isDraft = s.effectiveStatus === 'draft';
            const isActive = s.effectiveStatus === 'active';
            const isPaused = s.effectiveStatus === 'paused';
            const stock = s.stockQuota ?? s.quota;

            return (
              <Card
                key={s.id}
                className="rounded-2xl border border-border/80 shadow-xs overflow-hidden bg-card"
              >
                <CardContent className="p-3.5 space-y-3">
                  {/* Card Header: Title & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className={cn('size-2 rounded-full shrink-0', st.dotClass)} />
                        <h2 className="text-base font-extrabold text-foreground truncate">
                          {s.name}
                        </h2>
                      </div>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock size={11} className="text-muted-foreground/70 shrink-0" />
                        {s.startsAt && s.endsAt
                          ? formatRange(s.startsAt, s.endsAt)
                          : 'Tanpa jadwal'}
                      </p>
                    </div>

                    <Badge
                      variant="outline"
                      className={cn('text-[10px] px-2 py-0.5 font-bold shrink-0', st.className)}
                    >
                      {st.label}
                    </Badge>
                  </div>

                  {/* Telemetry Metric Grid */}
                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-2 text-center text-xs">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">
                        Berhak
                      </p>
                      <p className="text-sm font-black text-foreground tabular-nums mt-0.5">
                        {s.entitled}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                        Terambil
                      </p>
                      <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
                        {s.redeemed}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">
                        Sisa Stok
                      </p>
                      <p
                        className={cn(
                          'text-sm font-black tabular-nums mt-0.5',
                          s.remaining === 0
                            ? 'text-destructive'
                            : s.remaining !== null && s.remaining <= stock * 0.2
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-foreground'
                        )}
                      >
                        {s.remaining !== null ? s.remaining : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Quick Action Button Bar */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/60">
                    {isDraft && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => void doPublish(s)}
                          className="flex-1 h-8 text-xs font-bold rounded-xl"
                        >
                          <Send size={13} className="mr-1" /> Publish
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditTarget(s);
                            setEditName(s.name);
                            setEditStarts(s.startsAt ? toLocalInput(s.startsAt) : '');
                            setEditEnds(s.endsAt ? toLocalInput(s.endsAt) : '');
                            setEditStock(s.stockQuota !== null ? String(s.stockQuota) : '');
                          }}
                          className="h-8 px-2.5 text-xs font-bold rounded-xl"
                        >
                          <UserPen size={13} className="mr-1" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(s)}
                          className="size-8 text-muted-foreground hover:text-destructive rounded-xl"
                          title="Hapus Sesi"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </>
                    )}

                    {(isActive || isPaused) && (
                      <>
                        <Button
                          variant={isPaused ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => (isPaused ? void doResume(s) : void doPause(s))}
                          className="flex-1 h-8 text-xs font-bold rounded-xl"
                        >
                          {isPaused ? (
                            <Play size={13} className="mr-1" />
                          ) : (
                            <Power size={13} className="mr-1" />
                          )}
                          {isPaused ? 'Lanjutkan' : 'Jeda (Pause)'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void doClose(s)}
                          className="h-8 text-xs font-bold rounded-xl text-destructive hover:bg-destructive/10 border-destructive/30"
                        >
                          <CalendarDays size={13} className="mr-1" /> Tutup
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* ── DESKTOP VIEW (>= md): Full TanStack DataTable ── */}
      <div className="hidden md:block">
        <DataTable
          data={sessions}
          columns={columns}
          getRowId={(s) => String(s.id)}
          toolbar={
            <span className="text-xs font-medium text-muted-foreground">
              {sessions.length} sesi terdaftar · publish otomatis aktif saat jadwal tiba
            </span>
          }
        />
      </div>

      {/* Create Responsive Modal */}
      <ResponsiveDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        title="Buat Sesi Snack"
        description="Sesi dibuat sebagai DRAFT. Atur jadwal dan kuota stok, lalu Publish."
        blockBackdropClose
        footer={
          <div className="flex w-full gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowCreate(false)}
              className="flex-1 sm:flex-none rounded-xl"
            >
              Batal
            </Button>
            <Button
              onClick={() => void doCreate()}
              loading={creating}
              className="flex-1 sm:flex-none rounded-xl font-bold"
            >
              Simpan Draft
            </Button>
          </div>
        }
      >
        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="sess-name" className="text-xs font-bold text-foreground">
              Nama Sesi *
            </Label>
            <Input
              id="sess-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Contoh: Snack Pagi / Makan Siang"
              className="h-10 rounded-xl"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sess-starts" className="text-xs font-bold text-foreground">
                Waktu Mulai
              </Label>
              <Input
                id="sess-starts"
                type="datetime-local"
                value={newStarts}
                onChange={(e) => setNewStarts(e.target.value)}
                className="h-10 rounded-xl text-xs sm:text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sess-ends" className="text-xs font-bold text-foreground">
                Waktu Selesai
              </Label>
              <Input
                id="sess-ends"
                type="datetime-local"
                value={newEnds}
                onChange={(e) => setNewEnds(e.target.value)}
                className="h-10 rounded-xl text-xs sm:text-sm"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sess-stock" className="text-xs font-bold text-foreground">
              Batas Stok Fisik (opsional)
            </Label>
            <Input
              id="sess-stock"
              type="number"
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
              placeholder="Kosongkan jika sesuai total peserta berhak"
              min={0}
              className="h-10 rounded-xl"
            />
          </div>
        </div>
      </ResponsiveDialog>

      {/* Edit Responsive Modal */}
      <ResponsiveDialog
        open={!!editTarget}
        onOpenChange={(o) => {
          if (!o) setEditTarget(null);
        }}
        title="Edit Sesi Draft"
        description="Ubah nama, jadwal waktu, dan kuota stok sebelum dipublish."
        blockBackdropClose
        footer={
          <div className="flex w-full gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setEditTarget(null)}
              className="flex-1 sm:flex-none rounded-xl"
            >
              Batal
            </Button>
            <Button
              onClick={() => void doEdit()}
              className="flex-1 sm:flex-none rounded-xl font-bold"
            >
              Simpan Perubahan
            </Button>
          </div>
        }
      >
        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="edit-sess-name" className="text-xs font-bold text-foreground">
              Nama Sesi *
            </Label>
            <Input
              id="edit-sess-name"
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-10 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-sess-starts" className="text-xs font-bold text-foreground">
                Waktu Mulai
              </Label>
              <Input
                id="edit-sess-starts"
                type="datetime-local"
                value={editStarts}
                onChange={(e) => setEditStarts(e.target.value)}
                className="h-10 rounded-xl text-xs sm:text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-sess-ends" className="text-xs font-bold text-foreground">
                Waktu Selesai
              </Label>
              <Input
                id="edit-sess-ends"
                type="datetime-local"
                value={editEnds}
                onChange={(e) => setEditEnds(e.target.value)}
                className="h-10 rounded-xl text-xs sm:text-sm"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-sess-stock" className="text-xs font-bold text-foreground">
              Batas Stok Fisik
            </Label>
            <Input
              id="edit-sess-stock"
              type="number"
              value={editStock}
              onChange={(e) => setEditStock(e.target.value)}
              min={0}
              className="h-10 rounded-xl"
            />
          </div>
          {editTarget && (
            <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border/60">
              Peserta berhak: <strong className="text-foreground">{editTarget.entitled}</strong> ·
              Sudah terambil: <strong className="text-foreground">{editTarget.redeemed}</strong>
            </p>
          )}
        </div>
      </ResponsiveDialog>

      {/* Konfirmasi action risk: publish / pause / resume / close */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(o) => {
          // Jangan tutup manual saat aksi sedang berjalan
          if (!o && !confirming) setConfirmAction(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction ? CONFIRM_META[confirmAction.type].title : ''}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground">
              {confirmAction ? CONFIRM_META[confirmAction.type].desc(confirmAction.session) : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirming} className="rounded-xl">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void runConfirmed()}
              disabled={confirming}
              className={cn(
                'rounded-xl font-bold',
                confirmAction &&
                  CONFIRM_META[confirmAction.type].destructive &&
                  'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              )}
            >
              {confirming
                ? 'Memproses...'
                : confirmAction
                  ? CONFIRM_META[confirmAction.type].label
                  : 'Konfirmasi'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus sesi draft?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground">
              {deleteTarget?.name}. Hanya sesi draft tanpa catatan pengambilan yang dapat dihapus.
              Tindakan ini permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void remove()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold"
            >
              Hapus Sesi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatRange(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const d = s.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  const st = s.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const et = e.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return `${d} · ${st}–${et}`;
}
