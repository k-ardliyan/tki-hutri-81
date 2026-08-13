import { createFileRoute } from '@tanstack/react-router';
import { createColumnHelper } from '@tanstack/react-table';
import {
  Edit2,
  Layers,
  LayoutGrid,
  Mars,
  Plus,
  QrCode,
  Search,
  ShieldAlert,
  Table as TableIcon,
  Trash2,
  UserPlus,
  Users,
  Venus,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { SearchInput } from '~/components/common/SearchInput';
import { AdminTeamsSkeleton, DataTableSkeleton } from '~/components/loading/skeletons';
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
import { Combobox, type ComboboxOption } from '../../components/ui/combobox';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { PageHeader } from '../../components/ui/page-header';
import { ResponsiveDialog } from '../../components/ui/responsive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { StatusBadge } from '../../components/ui/status-badge';
import { requireRole } from '../../lib/routeGuard';
import { listEmployees } from '../../server/functions/admin';
import {
  addTeamMember,
  createTeam,
  deleteTeam,
  listTeams,
  removeTeamMember,
  updateTeam,
} from '../../server/functions/teams';

export const Route = createFileRoute('/admin/teams')({
  beforeLoad: async () => {
    await requireRole(['superadmin', 'admin']);
  },
  component: AdminTeams,
  pendingComponent: AdminTeamsSkeleton,
});

type Kategori = 'putra' | 'putri' | 'panitia';

interface TeamMemberRow {
  id: number;
  employeeId: number;
  sortOrder: number;
  nama: string;
  nip: string | null;
  divisi: string | null;
}

interface TeamRow {
  id: number;
  kategori: Kategori;
  nomor: number | null;
  nama: string;
  kode: string | null;
  members: TeamMemberRow[];
}

interface EmployeeRow {
  id: number;
  nama: string;
  nip: string | null;
}

const KATEGORI_LABEL: Record<Kategori, string> = {
  putra: 'Putra',
  putri: 'Putri',
  panitia: 'Panitia',
};

function kategoriBadge(k: Kategori) {
  return (
    <StatusBadge status={k === 'putra' ? 'info' : k === 'putri' ? 'warning' : 'muted'}>
      {KATEGORI_LABEL[k]}
    </StatusBadge>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

function errMsg(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

function AdminTeams() {
  const [rows, setRows] = useState<TeamRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Filters & View modes
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | Kategori>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Team dialog
  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [kategori, setKategori] = useState<Kategori>('putra');
  const [nomor, setNomor] = useState('');
  const [nama, setNama] = useState('');
  const [kode, setKode] = useState('');

  // Member dialog
  const [memberTeam, setMemberTeam] = useState<TeamRow | null>(null);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<string>('');
  const [submittingTeam, setSubmittingTeam] = useState(false);
  const [submittingMember, setSubmittingMember] = useState(false);

  // Delete confirms
  const [deleteTarget, setDeleteTarget] = useState<TeamRow | null>(null);
  const [deleteMemberTarget, setDeleteMemberTarget] = useState<TeamMemberRow | null>(null);

  const load = async (): Promise<TeamRow[]> => {
    try {
      const data = await listTeams();
      setRows(data);
      return data;
    } catch (e) {
      setErr(errMsg(e, 'Gagal memuat tim'));
      return [];
    } finally {
      setRowsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  // Metrics KPI
  const metrics = useMemo(() => {
    const totalTeams = rows.length;
    const totalMembers = rows.reduce((s, r) => s + r.members.length, 0);
    const putraCount = rows.filter((r) => r.kategori === 'putra').length;
    const putriCount = rows.filter((r) => r.kategori === 'putri').length;
    const panitiaCount = rows.filter((r) => r.kategori === 'panitia').length;

    return { totalTeams, totalMembers, putraCount, putriCount, panitiaCount };
  }, [rows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchCat = categoryFilter === 'all' || r.kategori === categoryFilter;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchCat;

      const matchName = r.nama.toLowerCase().includes(q);
      const matchCode = r.kode?.toLowerCase().includes(q) ?? false;
      const matchMember = r.members.some(
        (m) => m.nama.toLowerCase().includes(q) || (m.nip && m.nip.includes(q))
      );

      return matchCat && (matchName || matchCode || matchMember);
    });
  }, [rows, categoryFilter, searchQuery]);

  const nextNomor = useMemo(() => {
    const nums = rows.filter((r) => r.kategori === kategori).map((r) => r.nomor ?? 0);
    return nums.length ? Math.max(...nums) + 1 : 1;
  }, [rows, kategori]);

  const openCreate = () => {
    setEditId(null);
    setKategori('putra');
    setNomor(String(nextNomor));
    setNama('');
    setKode('');
    setErr(null);
    setShowTeamDialog(true);
  };

  const openEdit = (r: TeamRow) => {
    setEditId(r.id);
    setKategori(r.kategori);
    setNomor(r.nomor !== null ? String(r.nomor) : '');
    setNama(r.nama);
    setKode(r.kode ?? '');
    setErr(null);
    setShowTeamDialog(true);
  };

  const submitTeam = async () => {
    setErr(null);
    const namaTrim = nama.trim();
    if (!namaTrim) {
      setErr('Nama tim wajib diisi');
      return;
    }
    const nomorNum =
      kategori === 'panitia' ? null : nomor.trim() === '' ? nextNomor : Number(nomor.trim());
    if (kategori !== 'panitia' && (!Number.isInteger(nomorNum) || (nomorNum as number) < 1)) {
      setErr('Nomor tim wajib angka positif');
      return;
    }
    setSubmittingTeam(true);
    try {
      if (editId !== null) {
        await updateTeam({
          data: { id: editId, kategori, nomor: nomorNum, nama: namaTrim, kode: kode || null },
        });
        toast.success('Tim berhasil diupdate!');
      } else {
        await createTeam({
          data: { kategori, nomor: nomorNum, nama: namaTrim, kode: kode || null },
        });
        toast.success('Tim baru berhasil ditambah!');
      }
      setShowTeamDialog(false);
      await load();
    } catch (e) {
      setErr(errMsg(e, 'Gagal menyimpan tim'));
    } finally {
      setSubmittingTeam(false);
    }
  };

  const submitDeleteTeam = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTeam({ data: { id: deleteTarget.id } });
      setDeleteTarget(null);
      await load();
      toast.success('Tim berhasil dihapus');
    } catch (e) {
      toast.error(errMsg(e, 'Gagal menghapus tim'));
      setDeleteTarget(null);
    }
  };

  // ── Member management ──

  const openMembers = async (r: TeamRow) => {
    setMemberTeam(r);
    setSelectedEmp('');
    try {
      setEmployees(await listEmployees({ data: { q: '', limit: 500 } }));
    } catch (e) {
      toast.error(errMsg(e, 'Gagal memuat daftar karyawan'));
    }
  };

  const employeeOptions = useMemo<ComboboxOption[]>(() => {
    if (!memberTeam) return [];
    const existing = new Set(memberTeam.members.map((m) => m.employeeId));
    return employees
      .filter((e) => !existing.has(e.id))
      .map((e) => ({ value: String(e.id), label: e.nip ? `${e.nama} · ${e.nip}` : e.nama }));
  }, [employees, memberTeam]);

  const submitAddMember = async () => {
    if (!memberTeam || !selectedEmp) return;
    setSubmittingMember(true);
    try {
      await addTeamMember({ data: { teamId: memberTeam.id, employeeId: Number(selectedEmp) } });
      toast.success('Anggota berhasil ditambahkan');
      setSelectedEmp('');
      const fresh = (await load()).find((r) => r.id === memberTeam.id);
      if (fresh) setMemberTeam(fresh);
    } catch (e) {
      toast.error(errMsg(e, 'Gagal menambah anggota'));
    } finally {
      setSubmittingMember(false);
    }
  };

  const submitDeleteMember = async () => {
    if (!deleteMemberTarget) return;
    try {
      await removeTeamMember({ data: { id: deleteMemberTarget.id } });
      toast.success('Anggota berhasil dihapus');
      setDeleteMemberTarget(null);
      const fresh = (await load()).find((r) => r.id === memberTeam?.id);
      if (fresh) setMemberTeam(fresh);
    } catch (e) {
      toast.error(errMsg(e, 'Gagal menghapus anggota'));
      setDeleteMemberTarget(null);
    }
  };

  const kodeHint = useMemo(() => {
    if (editId !== null) return 'Kosongkan untuk memakai kode lama';
    return kategori === 'panitia'
      ? 'Otomatis: PANITIA'
      : `Otomatis: ${kategori.toUpperCase()}-${nomor.trim() || nextNomor}`;
  }, [kategori, nomor, nextNomor, editId]);

  const columnHelper = createColumnHelper<typeof features, TeamRow>();

  const columns = columnHelper.columns([
    columnHelper.accessor('kategori', {
      header: 'Kategori',
      enableHiding: false,
      cell: ({ row }) => kategoriBadge(row.original.kategori),
    }),
    columnHelper.accessor('nomor', {
      header: 'Nomor',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold">
          {row.original.nomor ? `#${row.original.nomor}` : '—'}
        </span>
      ),
    }),
    columnHelper.accessor('nama', {
      header: 'Nama Tim',
      cell: ({ row }) => (
        <div className="font-heading text-sm font-extrabold text-foreground">
          {row.original.nama}
        </div>
      ),
    }),
    columnHelper.accessor('kode', {
      header: 'Kode QR',
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
          <QrCode size={12} />
          {row.original.kode ?? '—'}
        </span>
      ),
    }),
    columnHelper.accessor('members', {
      header: 'Anggota',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-brand-red/10 px-2.5 py-0.5 text-xs font-extrabold text-brand-red">
            {row.original.members.length} anggota
          </span>
        </div>
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
              onClick={() => void openMembers(r)}
              className="h-8 px-2.5 text-xs font-bold rounded-lg"
            >
              <Users size={13} className="mr-1 text-brand-red" />
              Anggota ({r.members.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEdit(r)}
              className="h-8 px-2.5 text-xs font-bold rounded-lg"
            >
              <Edit2 size={13} className="mr-1" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteTarget(r)}
              className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
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
          title="Kelola Tim & Anggota"
          subtitle="Memuat data tim peserta..."
          action={
            <Button onClick={openCreate} disabled className="rounded-xl font-bold">
              <Plus size={14} className="mr-1.5" />
              Tambah Tim
            </Button>
          }
        />
        <DataTableSkeleton rows={10} cols={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kelola Tim & Anggota"
        subtitle="Kelola registrasi tim peserta perlombaan putra, putri, dan tim panitia."
        action={
          <Button
            onClick={openCreate}
            className="rounded-xl font-bold shadow-md shadow-brand-red/20"
          >
            <Plus size={16} className="mr-1.5" />
            Tambah Tim Baru
          </Button>
        }
      />

      {err && (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Tim</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
              <Layers size={16} />
            </span>
          </div>
          <p className="mt-2 font-heading text-2xl font-black text-foreground">
            {metrics.totalTeams}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {metrics.totalMembers} total karyawan terdaftar
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Tim Putra</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
              <Mars size={16} />
            </span>
          </div>
          <p className="mt-2 font-heading text-2xl font-black text-foreground">
            {metrics.putraCount}
          </p>
          <p className="text-[11px] text-muted-foreground">Kategori Putra</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Tim Putri</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-500/10 text-pink-500">
              <Venus size={16} />
            </span>
          </div>
          <p className="mt-2 font-heading text-2xl font-black text-foreground">
            {metrics.putriCount}
          </p>
          <p className="text-[11px] text-muted-foreground">Kategori Putri</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Panitia</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
              <ShieldAlert size={16} />
            </span>
          </div>
          <p className="mt-2 font-heading text-2xl font-black text-foreground">
            {metrics.panitiaCount}
          </p>
          <p className="text-[11px] text-muted-foreground">Tim Kerja Event</p>
        </div>
      </div>

      {/* Filter & View Switcher Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {(['all', 'putra', 'putri', 'panitia'] as const).map((cat) => {
            const isActive = categoryFilter === cat;
            const label = cat === 'all' ? 'Semua Tim' : KATEGORI_LABEL[cat];
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition ${
                  isActive
                    ? 'bg-brand-red text-white shadow-xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Right side: Live Search & Grid/Table Toggle */}
        <div className="flex flex-1 items-center justify-end gap-2.5 min-w-[240px]">
          <div className="flex-1 max-w-xs">
            <SearchInput
              placeholder="Cari tim, kode, atau anggota..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              className="h-9 text-xs rounded-xl"
            />
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-muted p-1 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                viewMode === 'grid' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
              }`}
            >
              <LayoutGrid size={14} />
              Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                viewMode === 'table' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
              }`}
            >
              <TableIcon size={14} />
              Tabel
            </button>
          </div>
        </div>
      </div>

      {/* Main Content View */}
      {viewMode === 'grid' ? (
        /* Visual Team Cards Grid View */
        filteredRows.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-12 text-center bg-card">
            <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <h4 className="font-heading text-sm font-bold text-foreground">
              Tidak Ada Tim Ditemukan
            </h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Tidak ada tim yang cocok dengan kata kunci pencarian atau filter pilihan Anda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRows.map((r) => (
              <div
                key={r.id}
                className="flex flex-col justify-between rounded-3xl border border-border bg-card p-5 shadow-xs transition hover:shadow-md hover:border-brand-red/30"
              >
                <div>
                  {/* Card Header: Category badge & Number */}
                  <div className="flex items-center justify-between pb-3">
                    {kategoriBadge(r.kategori)}
                    {r.nomor && (
                      <span className="font-mono text-xs font-black text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        #{r.nomor}
                      </span>
                    )}
                  </div>

                  {/* Team Title & Kode QR */}
                  <h4 className="font-heading text-base font-black text-foreground">{r.nama}</h4>
                  {r.kode && (
                    <p className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                      <QrCode size={12} />
                      {r.kode}
                    </p>
                  )}

                  {/* Member Stack Avatars */}
                  <div className="mt-4 pt-3 border-t border-border/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-muted-foreground">
                        Anggota Tim ({r.members.length})
                      </span>
                    </div>

                    {r.members.length === 0 ? (
                      <p className="text-xs text-muted-foreground/80 italic py-1">
                        Belum ada anggota dimasukkan
                      </p>
                    ) : (
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <div className="flex -space-x-2">
                          {r.members.slice(0, 4).map((m) => (
                            <div
                              key={m.id}
                              title={`${m.nama} (${m.nip || 'Karyawan'})`}
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-red/10 border-2 border-card text-[11px] font-black text-brand-red"
                            >
                              {getInitials(m.nama)}
                            </div>
                          ))}
                        </div>
                        {r.members.length > 4 && (
                          <span className="text-xs font-bold text-muted-foreground pl-1">
                            +{r.members.length - 4} lagi
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="mt-5 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void openMembers(r)}
                    className="flex-1 rounded-xl text-xs font-bold h-8 border-brand-red/20 text-brand-red hover:bg-brand-red/10"
                  >
                    <UserPlus size={13} className="mr-1.5" />
                    Kelola Anggota ({r.members.length})
                  </Button>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(r)}
                      className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(r)}
                      className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Table View Layout */
        <DataTable
          data={filteredRows}
          columns={columns}
          getRowId={(r) => String(r.id)}
          pageSize={15}
          loading={rowsLoading}
          toolbar={
            <span className="text-xs font-bold text-muted-foreground">
              {filteredRows.length} tim ditampilkan
            </span>
          }
        />
      )}

      {/* Create/Edit Team Dialog */}
      <ResponsiveDialog
        open={showTeamDialog}
        onOpenChange={setShowTeamDialog}
        title={editId !== null ? 'Edit Tim' : 'Tambah Tim Baru'}
        description="Data tim peserta lomba lapangan."
        footer={
          <div className="flex w-full gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowTeamDialog(false)}
              className="flex-1 sm:flex-none rounded-xl"
            >
              Batal
            </Button>
            <Button
              onClick={() => void submitTeam()}
              loading={submittingTeam}
              className="flex-1 sm:flex-none rounded-xl font-bold"
            >
              {editId !== null ? 'Simpan Perubahan' : 'Tambah Tim'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Kategori Tim</Label>
            <Select
              value={kategori}
              onValueChange={(v) => {
                setKategori(v as Kategori);
                if (editId === null) setNomor(v === 'panitia' ? '' : '');
              }}
            >
              <SelectTrigger className="w-full rounded-xl">
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="putra">Putra</SelectItem>
                <SelectItem value="putri">Putri</SelectItem>
                <SelectItem value="panitia">Panitia</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {kategori !== 'panitia' && (
            <div className="space-y-1.5">
              <Label htmlFor="team-nomor">Nomor Urut Tim</Label>
              <Input
                id="team-nomor"
                type="number"
                min={1}
                value={nomor}
                onChange={(e) => setNomor(e.target.value)}
                placeholder={`Otomatis: ${nextNomor}`}
                className="rounded-xl"
              />
              <p className="text-[11px] text-muted-foreground">
                Kosongkan untuk memakai nomor berikutnya ({nextNomor}).
              </p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="team-nama">Nama Tim</Label>
            <Input
              id="team-nama"
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Tim Rajawali Merah"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="team-kode">Kode QR / Identifier Tim</Label>
            <Input
              id="team-kode"
              type="text"
              value={kode}
              onChange={(e) => setKode(e.target.value)}
              placeholder="Kosongkan untuk otomatis"
              className="rounded-xl"
            />
            <p className="text-[11px] text-muted-foreground">{kodeHint}</p>
          </div>
        </div>
      </ResponsiveDialog>

      {/* Manage Members Dialog */}
      <ResponsiveDialog
        open={!!memberTeam}
        onOpenChange={(o) => {
          if (!o) setMemberTeam(null);
        }}
        title={memberTeam ? `Kelola Anggota: ${memberTeam.nama}` : 'Anggota'}
        description={`${memberTeam?.members.length ?? 0} Anggota · Kategori ${memberTeam ? KATEGORI_LABEL[memberTeam.kategori] : ''}`}
      >
        <div className="space-y-5">
          {/* Add member section */}
          <div className="rounded-2xl border border-border bg-muted/20 p-3.5 space-y-2">
            <Label htmlFor="emp-search" className="text-xs font-bold">
              Cari & Tambah Karyawan
            </Label>
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <Combobox
                  options={employeeOptions}
                  value={selectedEmp}
                  onValueChange={setSelectedEmp}
                  placeholder="Cari nama karyawan..."
                  searchPlaceholder="Ketik nama / NIP..."
                  emptyText={
                    employees.length === 0
                      ? 'Gagal memuat karyawan'
                      : 'Semua karyawan sudah masuk / tidak ditemukan'
                  }
                  triggerClassName="w-full rounded-xl"
                />
              </div>
              <Button
                onClick={() => void submitAddMember()}
                disabled={!selectedEmp}
                loading={submittingMember}
                className="shrink-0 rounded-xl font-bold"
              >
                <Plus size={14} className="mr-1" />
                Tambah
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Pastikan karyawan sudah terdaftar di menu Karyawan.
            </p>
          </div>

          {/* Member List */}
          <div className="space-y-2">
            <Label className="text-xs font-bold">
              Daftar Anggota Saat Ini ({memberTeam?.members.length ?? 0})
            </Label>
            {memberTeam && memberTeam.members.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                Belum ada anggota di tim ini. Gunakan pencarian di atas untuk menambahkan karyawan.
              </p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {memberTeam?.members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-2xs"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-red/10 text-xs font-black text-brand-red">
                      {getInitials(m.nama)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">{m.nama}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {[m.nip && `NIP: ${m.nip}`, m.divisi && `Divisi: ${m.divisi}`]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteMemberTarget(m)}
                      className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10 rounded-xl"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ResponsiveDialog>

      {/* Delete team confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus tim {deleteTarget?.nama}?</AlertDialogTitle>
            <AlertDialogDescription>
              Tim ({deleteTarget?.members.length ?? 0} anggota) akan dihapus dari sistem dan bagan
              pertandingan. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void submitDeleteTeam()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete member confirm */}
      <AlertDialog
        open={!!deleteMemberTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteMemberTarget(null);
        }}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Keluarkaan anggota dari tim?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteMemberTarget?.nama} akan dikeluarkan dari tim {memberTeam?.nama}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void submitDeleteMember()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
