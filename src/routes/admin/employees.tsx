import { createFileRoute } from '@tanstack/react-router';
import { createColumnHelper } from '@tanstack/react-table';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DataTableSkeleton } from '~/components/loading/skeletons';
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
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { PageHeader } from '../../components/ui/page-header';
import { ResponsiveDialog } from '../../components/ui/responsive-dialog';
import { StatusBadge } from '../../components/ui/status-badge';
import { useDebounce } from '../../hooks/use-debounce';
import { requireRole } from '../../lib/routeGuard';
import {
  createEmployee,
  deleteEmployee,
  listEmployees,
  updateEmployee,
} from '../../server/functions/admin';

export const Route = createFileRoute('/admin/employees')({
  beforeLoad: async () => {
    await requireRole(['superadmin', 'admin']);
  },
  component: AdminEmployees,
  pendingComponent: DataTableSkeleton,
});

interface EmployeeRow {
  id: number;
  nama: string;
  nip: string | null;
  divisi: string | null;
  isSnackEligible: boolean;
}

import { SearchInput } from '~/components/common/SearchInput';

function AdminEmployees() {
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [q, setQ] = useState('');
  const debouncedQ = useDebounce(q, 300);
  const [err, setErr] = useState<string | null>(null);

  // Drawer state
  const [showDrawer, setShowDrawer] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [nama, setNama] = useState('');
  const [nip, setNip] = useState('');
  const [divisi, setDivisi] = useState('');
  const [eligible, setEligible] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<EmployeeRow | null>(null);

  const load = async (query?: string) => {
    setIsSearching(true);
    try {
      setRows(await listEmployees({ data: { q: query, limit: 500 } }));
    } finally {
      setRowsLoading(false);
      setIsSearching(false);
    }
  };

  useEffect(() => {
    void load(debouncedQ || undefined);
  }, [debouncedQ, load]);

  const openCreate = () => {
    setEditId(null);
    setNama('');
    setNip('');
    setDivisi('');
    setEligible(true);
    setShowDrawer(true);
  };
  const openEdit = (r: EmployeeRow) => {
    setEditId(r.id);
    setNama(r.nama);
    setNip(r.nip ?? '');
    setDivisi(r.divisi ?? '');
    setEligible(r.isSnackEligible);
    setShowDrawer(true);
  };

  const submit = async () => {
    setErr(null);
    if (!nama.trim()) {
      setErr('Nama wajib');
      return;
    }
    setSubmitting(true);
    try {
      if (editId !== null) {
        await updateEmployee({
          data: {
            id: editId,
            nama: nama.trim(),
            nip: nip || null,
            divisi: divisi || null,
            isSnackEligible: eligible,
          },
        });
        toast.success('Karyawan diupdate!');
      } else {
        await createEmployee({
          data: {
            nama: nama.trim(),
            nip: nip || null,
            divisi: divisi || null,
            isSnackEligible: eligible,
          },
        });
        toast.success('Karyawan ditambah!');
      }
      setShowDrawer(false);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal menyimpan karyawan');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    await deleteEmployee({ data: { id: deleteTarget.id } });
    setDeleteTarget(null);
    await load();
    toast.success('Karyawan dihapus');
  };

  const columnHelper = createColumnHelper<typeof features, EmployeeRow>();

  const columns = columnHelper.columns([
    columnHelper.accessor('nama', {
      header: 'Nama Lengkap',
      enableHiding: false,
      cell: ({ row }) => <div className="font-semibold text-foreground">{row.original.nama}</div>,
    }),
    columnHelper.accessor('nip', {
      header: 'NIP',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.nip ?? '—'}</span>
      ),
    }),
    columnHelper.accessor('divisi', {
      header: 'Divisi',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.divisi ?? '—'}</span>
      ),
    }),
    columnHelper.accessor('isSnackEligible', {
      header: 'Snack Status',
      cell: ({ row }) => (
        <StatusBadge status={row.original.isSnackEligible ? 'success' : 'muted'}>
          {row.original.isSnackEligible ? 'Eligible' : 'Tidak Eligible'}
        </StatusBadge>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: () => <span className="sr-only">Aksi</span>,
      enableHiding: false,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEdit(r)}
              className="h-7 px-2 text-xs font-bold"
            >
              <Edit2 size={12} className="mr-1" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteTarget(r)}
              className="h-7 w-7 text-destructive hover:bg-destructive/10"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        );
      },
    }),
  ]);

  if (rowsLoading) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Kelola Master Karyawan"
          subtitle="Memuat data karyawan..."
          action={
            <Button onClick={openCreate} disabled>
              <Plus size={14} className="mr-1.5" />
              Tambah Karyawan
            </Button>
          }
        />
        <DataTableSkeleton rows={12} cols={5} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kelola Master Karyawan"
        subtitle={`${rows.length} karyawan terdaftar dalam sistem.`}
        action={
          <Button onClick={openCreate}>
            <Plus size={14} className="mr-1.5" />
            Tambah Karyawan
          </Button>
        }
      />

      {err && (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      <DataTable
        data={rows}
        columns={columns}
        getRowId={(r) => String(r.id)}
        pageSize={15}
        loading={isSearching}
        toolbar={
          <div className="w-full max-w-xs">
            <SearchInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onClear={() => setQ('')}
              loading={q !== debouncedQ || isSearching}
              placeholder="Cari nama / NIP..."
              className="h-8"
            />
          </div>
        }
      />

      {/* Create/Edit Responsive Modal */}
      <ResponsiveDialog
        open={showDrawer}
        onOpenChange={setShowDrawer}
        title={editId !== null ? 'Edit Karyawan' : 'Tambah Karyawan'}
        description="Lengkapi data karyawan."
        footer={
          <div className="flex w-full gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowDrawer(false)}
              className="flex-1 sm:flex-none"
            >
              Batal
            </Button>
            <Button onClick={submit} loading={submitting} className="flex-1 sm:flex-none">
              {editId !== null ? 'Simpan' : 'Tambah'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="emp-nama">Nama Lengkap</Label>
            <Input
              id="emp-nama"
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Nama lengkap"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="emp-nip">NIP</Label>
              <Input
                id="emp-nip"
                type="text"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="Opsional"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-divisi">Divisi</Label>
              <Input
                id="emp-divisi"
                type="text"
                value={divisi}
                onChange={(e) => setDivisi(e.target.value)}
                placeholder="Opsional"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground cursor-pointer pt-1">
            <Checkbox checked={eligible} onCheckedChange={(v) => setEligible(!!v)} />
            Eligible snack
          </label>
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
            <AlertDialogTitle>Hapus karyawan?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.nama}. Tindakan ini tidak bisa dibatalkan.
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
