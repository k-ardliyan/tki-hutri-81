/**
 * AdminSnackSessions — admin set sesi snack + kuota porsi.
 * List pakai DataTable block; CRUD via Drawer, hapus via AlertDialog.
 */

import { createFileRoute } from '@tanstack/react-router';
import { createColumnHelper } from '@tanstack/react-table';
import { EllipsisVertical, Plus, Power, PowerOff, Trash2, UserPen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DataTableSkeleton } from '~/components/loading/skeletons';
import { DataTable, type features } from '../../../components/data-table';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import { Button } from '../../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { PageHeader } from '../../../components/ui/page-header';
import { Progress } from '../../../components/ui/progress';
import { ResponsiveDialog } from '../../../components/ui/responsive-dialog';
import { StatusBadge } from '../../../components/ui/status-badge';
import {
  createSession,
  deleteSession,
  getSessions,
  updateSession,
} from '../../../server/functions/snack';

export const Route = createFileRoute('/admin/snack/sessions')({
  component: AdminSnackSessions,
  pendingComponent: DataTableSkeleton,
});

interface SessionRow {
  id: number;
  name: string;
  quota: number;
  isActive: boolean;
  createdAt: Date;
  redeemed?: number;
  remaining?: number;
}

function AdminSnackSessions() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);

  // Create drawer
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newQuota, setNewQuota] = useState('');

  // Edit drawer
  const [editTarget, setEditTarget] = useState<SessionRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editQuota, setEditQuota] = useState('');

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<SessionRow | null>(null);

  const load = async () => {
    try {
      setSessions(await getSessions());
    } finally {
      setSessionsLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const doCreate = async () => {
    setErr(null);
    const q = Number(newQuota);
    if (!newName.trim()) {
      setErr('Nama sesi wajib');
      return;
    }
    if (Number.isNaN(q) || q < 0) {
      setErr('Kuota harus angka >= 0');
      return;
    }
    setCreating(true);
    try {
      await createSession({ data: { name: newName.trim(), quota: q } });
      setNewName('');
      setNewQuota('');
      setShowCreate(false);
      toast.success('Sesi dibuat!');
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
    const q = Number(editQuota);
    if (!editName.trim()) {
      setErr('Nama sesi wajib');
      return;
    }
    if (Number.isNaN(q) || q < 0) {
      setErr('Kuota harus angka >= 0');
      return;
    }
    // Guard: kuota total baru tidak boleh kurang dari yang sudah terambil
    const taken = editTarget.redeemed ?? 0;
    if (q < taken) {
      setErr(`Kuota ${q} kurang dari ${taken} yang sudah terambil. Minimal ${taken}.`);
      return;
    }
    setEditing(true);
    try {
      await updateSession({ data: { id: editTarget.id, name: editName.trim(), quota: q } });
      setEditTarget(null);
      toast.success('Sesi diupdate!');
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal mengupdate sesi');
    } finally {
      setEditing(false);
    }
  };

  const toggleActive = async (s: SessionRow) => {
    await updateSession({ data: { id: s.id, isActive: !s.isActive } });
    await load();
    toast.success(s.isActive ? 'Sesi dinonaktifkan' : 'Sesi diaktifkan');
  };

  const remove = async () => {
    if (!deleteTarget) return;
    await deleteSession({ data: { id: deleteTarget.id } });
    setDeleteTarget(null);
    await load();
    toast.success('Sesi dihapus');
  };

  const columnHelper = createColumnHelper<typeof features, SessionRow>();

  const columns = columnHelper.columns([
    columnHelper.accessor('name', {
      header: 'Sesi',
      enableHiding: false,
      cell: ({ row }) => (
        <div>
          <span className="font-semibold text-foreground">{row.original.name}</span>
          {row.original.isActive && (
            <StatusBadge status="success" className="ml-2 px-1.5 py-0 text-[10px]">
              AKTIF
            </StatusBadge>
          )}
          <p className="text-xs text-muted-foreground">
            #{row.original.id} · Kuota {row.original.quota}
          </p>
        </div>
      ),
    }),
    columnHelper.accessor('quota', {
      header: 'Kuota',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.quota}</span>,
    }),
    columnHelper.accessor('redeemed', {
      header: 'Terambil',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.redeemed ?? '—'}</span>,
    }),
    columnHelper.accessor('remaining', {
      header: 'Sisa Kuota',
      cell: ({ row }) => {
        const s = row.original;
        if (s.remaining === undefined) return <span className="text-muted-foreground">—</span>;
        const pct =
          s.quota > 0 ? Math.max(0, Math.min(100, ((s.quota - s.remaining) / s.quota) * 100)) : 0;
        const toneClass =
          s.remaining === 0
            ? '[&_[data-slot=progress-indicator]]:bg-destructive'
            : s.remaining <= s.quota * 0.2
              ? '[&_[data-slot=progress-indicator]]:bg-warning'
              : '[&_[data-slot=progress-indicator]]:bg-success';
        return (
          <div className="flex w-36 items-center gap-2">
            <Progress value={pct} className={`h-1.5 ${toneClass}`} />
            <span
              className={`shrink-0 text-xs font-bold font-mono ${s.remaining === 0 ? 'text-destructive' : s.remaining <= s.quota * 0.2 ? 'text-warning' : 'text-success'}`}
            >
              {s.remaining}
            </span>
          </div>
        );
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: () => <span className="sr-only">Aksi</span>,
      enableHiding: false,
      cell: ({ row }) => {
        const s = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground data-[state=open]:bg-muted"
              >
                <span className="sr-only">Buka menu</span>
                <EllipsisVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={() => {
                  setEditTarget(s);
                  setEditName(s.name);
                  setEditQuota(String(s.quota));
                }}
              >
                <UserPen />
                Edit Sesi
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleActive(s)}>
                {s.isActive ? <PowerOff /> : <Power />}
                {s.isActive ? 'Nonaktifkan' : 'Aktifkan'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(s)}>
                <Trash2 />
                Hapus
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    }),
  ]);

  if (sessionsLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Sesi Snack & Kuota"
          subtitle="Memuat data sesi..."
          action={
            <Button disabled>
              <Plus size={14} className="mr-1.5" />
              Tambah Sesi
            </Button>
          }
        />
        <DataTableSkeleton rows={6} cols={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sesi Snack & Kuota"
        subtitle="Buat sesi, set porsi kuota, aktifkan/nonaktifkan."
        action={
          <Button
            onClick={() => {
              setNewName('');
              setNewQuota('');
              setShowCreate(true);
            }}
          >
            <Plus size={14} className="mr-1.5" />
            Tambah Sesi
          </Button>
        }
      />

      {err && (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      <DataTable
        data={sessions}
        columns={columns}
        getRowId={(s) => String(s.id)}
        toolbar={
          <span className="text-sm font-medium text-muted-foreground">
            {sessions.length} sesi terdaftar
          </span>
        }
      />

      {/* Create Responsive Modal */}
      <ResponsiveDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        title="Buat Sesi Baru"
        description="Tentukan nama dan kuota porsi."
        footer={
          <div className="flex w-full gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowCreate(false)}
              className="flex-1 sm:flex-none"
            >
              Batal
            </Button>
            <Button
              onClick={() => void doCreate()}
              loading={creating}
              className="flex-1 sm:flex-none"
            >
              Simpan
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="sess-name">Nama Sesi</Label>
            <Input
              id="sess-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Contoh: Snack Pagi"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sess-quota">Kuota Porsi</Label>
            <Input
              id="sess-quota"
              type="number"
              value={newQuota}
              onChange={(e) => setNewQuota(e.target.value)}
              placeholder="0"
              min={0}
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
        title="Edit Sesi"
        description="Ubah nama dan kuota total."
        footer={
          <div className="flex w-full gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setEditTarget(null)}
              className="flex-1 sm:flex-none"
            >
              Batal
            </Button>
            <Button onClick={() => void doEdit()} loading={editing} className="flex-1 sm:flex-none">
              Simpan
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-sess-name">Nama Sesi</Label>
            <Input
              id="edit-sess-name"
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Nama sesi"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-sess-quota">Kuota Total</Label>
            <Input
              id="edit-sess-quota"
              type="number"
              value={editQuota}
              onChange={(e) => setEditQuota(e.target.value)}
              min={0}
            />
            <p className="text-[10px] text-muted-foreground">
              Isi angka total, misal naik 100 → 110. Sisa dihitung otomatis.
            </p>
          </div>
          {editTarget && (
            <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/50 px-3 py-2.5 text-center">
              <div>
                <p className="text-sm font-extrabold text-foreground/80">
                  {editTarget.redeemed ?? 0}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  Terambil
                </p>
              </div>
              <div>
                <p
                  className={`text-sm font-extrabold ${(() => {
                    const q = Number(editQuota);
                    const taken = editTarget.redeemed ?? 0;
                    if (Number.isNaN(q) || q < 0) return 'text-destructive';
                    return q - taken < 0 ? 'text-destructive' : 'text-success';
                  })()}`}
                >
                  {(() => {
                    const q = Number(editQuota);
                    const taken = editTarget.redeemed ?? 0;
                    if (Number.isNaN(q)) return '—';
                    return Math.max(0, q - taken);
                  })()}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  Sisa Setelah
                </p>
              </div>
            </div>
          )}
        </div>
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
            <AlertDialogTitle>Hapus sesi?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name}. Data redemption ikut terhapus. Tindakan ini tidak bisa
              dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void remove()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
