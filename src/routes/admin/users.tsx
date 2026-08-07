import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'
import { createColumnHelper } from '@tanstack/react-table'
import { EllipsisVertical, KeyRound, Plus, Power, PowerOff, Search, Trash2, UserPen } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { PageHeader } from '../../components/ui/page-header'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { DataTable, features } from '../../components/data-table'
import { DataTableSkeleton } from '../../components/ui/skeletons'
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
import { listUsers, createUser, updateUser, resetPassword, deleteUser, listEmployees } from '../../server/functions/admin'
import { ROLE_LABELS, type UserRole } from '../../lib/auth'
import { requireRole } from '../../lib/routeGuard'
import { useDebounce } from '../../hooks/use-debounce'
import { Combobox, type ComboboxOption } from '../../components/ui/combobox'

export const Route = createFileRoute('/admin/users')({
  beforeLoad: async () => {
    await requireRole(['superadmin'])
  },
  component: SuperadminUsers,
})

interface UserRow { id: number; username: string; role: UserRole; isActive: boolean; employeeId: number | null; employeeNama: string | null; employeeNip: string | null; createdAt: Date }
interface EmployeeOption { id: number; nama: string; nip: string | null }

const ROLES: UserRole[] = ['superadmin', 'admin', 'petugas', 'audit']

const roleOptions: ComboboxOption[] = ROLES.map((r) => ({
  value: r,
  label: ROLE_LABELS[r],
}))

function SuperadminUsers() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('admin')
  const [employeeId, setEmployeeId] = useState<number | ''>('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [err, setErr] = useState<string | null>(null)

  // Edit username dialog
  const [editTarget, setEditTarget] = useState<UserRow | null>(null)
  const [editUsername, setEditUsername] = useState('')

  // Reset password dialog
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null)
  const [resetPw, setResetPw] = useState('')

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null)

  const load = async () => {
    try {
      setUsers(await listUsers())
    } finally {
      setUsersLoading(false)
    }
  }
  useEffect(() => { void load() }, [])

  useEffect(() => {
    const fetchEmps = async () => {
      if (debouncedSearch.length < 2) { setEmployees([]); return }
      setEmployees(await listEmployees({ data: { q: debouncedSearch, limit: 8 } }))
    }
    void fetchEmps()
  }, [debouncedSearch])

  const submit = async () => {
    setErr(null)
    if (!username.trim() || !password.trim()) { setErr('Username & password wajib'); return }
    try {
      await createUser({ data: { username: username.trim(), password, role, employeeId: employeeId === '' ? null : employeeId } })
      toast.success('User dibuat!'); setUsername(''); setPassword(''); setEmployeeId(''); setSearch(''); setShowCreate(false); await load()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Gagal buat user') }
  }

  const toggleActive = async (u: UserRow) => {
    await updateUser({ data: { id: u.id, isActive: !u.isActive } }); await load()
    toast.success(u.isActive ? 'User dinonaktifkan' : 'User diaktifkan')
  }
  const changeRole = async (u: UserRow, next: UserRole) => { await updateUser({ data: { id: u.id, role: next } }); await load() }

  const doEditUsername = async () => {
    setErr(null)
    if (!editTarget) return
    if (!editUsername.trim()) { setErr('Username wajib'); return }
    await updateUser({ data: { id: editTarget.id, username: editUsername.trim() } })
    setEditTarget(null); toast.success('Username diupdate!'); await load()
  }

  const doReset = async () => {
    setErr(null)
    if (!resetTarget) return
    if (!resetPw.trim()) { setErr('Password baru wajib'); return }
    await resetPassword({ data: { id: resetTarget.id, password: resetPw } })
    setResetTarget(null); setResetPw(''); toast.success('Password direset!'); await load()
  }

  const remove = async () => {
    if (!deleteTarget) return
    await deleteUser({ data: { id: deleteTarget.id } }); setDeleteTarget(null); await load()
    toast.success('User dihapus')
  }

  const columnHelper = createColumnHelper<typeof features, UserRow>()

  const columns = columnHelper.columns([
    columnHelper.accessor('username', {
      header: 'Username',
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{row.original.username}</span>
          {!row.original.isActive && (
            <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">NONAKTIF</Badge>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('role', {
      header: 'Role',
      cell: ({ row }) => (
        <Combobox
          options={roleOptions}
          value={row.original.role}
          onValueChange={(val) => changeRole(row.original, val as UserRole)}
          showSearch={false}
          size="sm"
          triggerClassName="w-32 h-8"
        />
      ),
    }),
    columnHelper.accessor('employeeNama', {
      header: 'Karyawan',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.employeeNama ?? '(tanpa karyawan)'}</span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: () => <span className="sr-only">Aksi</span>,
      enableHiding: false,
      cell: ({ row }) => {
        const u = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground data-[state=open]:bg-muted">
                <span className="sr-only">Buka menu</span>
                <EllipsisVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => { setEditTarget(u); setEditUsername(u.username) }}>
                <UserPen />Edit Username
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setResetTarget(u); setResetPw('') }}>
                <KeyRound />Reset Password
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleActive(u)}>
                {u.isActive ? <PowerOff /> : <Power />}{u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(u)}>
                <Trash2 />Hapus
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    }),
  ])

  if (usersLoading) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Kelola User & Akses"
          subtitle="Memuat data user..."
          action={<Button disabled><Plus size={14} className="mr-1.5" />User Baru</Button>}
        />
        <DataTableSkeleton rows={10} cols={5} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kelola User & Akses"
        subtitle="Superadmin — buat user baru, reset password, atur role pengakses."
        action={
          <Button onClick={() => { setUsername(''); setPassword(''); setEmployeeId(''); setSearch(''); setRole('admin'); setShowCreate(true) }}>
            <Plus size={14} className="mr-1.5" />
            User Baru
          </Button>
        }
      />

      {err && (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      )}

      <DataTable
        data={users}
        columns={columns}
        getRowId={(u) => String(u.id)}
        toolbar={<span className="text-sm font-medium text-muted-foreground">{users.length} user terdaftar</span>}
      />

      {/* Create User Responsive Modal */}
      <ResponsiveDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        title="Buat User Baru"
        description="Set kredensial awal dan role."
        footer={
          <div className="flex w-full gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setShowCreate(false)} className="flex-1 sm:flex-none">Batal</Button>
            <Button onClick={submit} className="flex-1 sm:flex-none">Buat User</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="usr-username">Username</Label>
              <Input id="usr-username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="usr-password">Password Awal</Label>
              <Input id="usr-password" type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password awal" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Combobox
              options={roleOptions}
              value={role}
              onValueChange={(v) => setRole(v as UserRole)}
              showSearch={false}
              triggerClassName="w-full h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Karyawan (opsional)</Label>
            <div className="relative">
              <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground/60" />
              <Input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, minimal 2 huruf" className="pl-9" />
            </div>
            {employees.length > 0 && (
              <div className="mt-1.5 max-h-40 overflow-auto divide-y divide-border rounded-md border border-border">
                {employees.map((e) => (
                  <button key={e.id} type="button" onClick={() => { setEmployeeId(e.id); setSearch(e.nama); setEmployees([]) }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted">
                    <span className="font-semibold text-foreground/80">{e.nama}</span>
                    <span className="text-[10px] text-muted-foreground">{e.nip ?? '—'}</span>
                  </button>
                ))}
              </div>
            )}
            {employeeId !== '' && (
              <p className="text-[10px] font-semibold text-success">Terhubung: {search}</p>
            )}
          </div>
        </div>
      </ResponsiveDialog>

      {/* Edit Username Responsive Modal */}
      <ResponsiveDialog
        open={!!editTarget}
        onOpenChange={(o) => { if (!o) setEditTarget(null) }}
        title="Edit Username"
        description="Login selanjutnya pakai username baru ini."
        footer={
          <div className="flex w-full gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setEditTarget(null)} className="flex-1 sm:flex-none">Batal</Button>
            <Button onClick={() => void doEditUsername()} className="flex-1 sm:flex-none">Simpan</Button>
          </div>
        }
      >
        <div className="space-y-1.5">
          <Label htmlFor="edit-username">Username</Label>
          <Input id="edit-username" type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} placeholder="Username baru" />
        </div>
      </ResponsiveDialog>

      {/* Reset Password Responsive Modal */}
      <ResponsiveDialog
        open={!!resetTarget}
        onOpenChange={(o) => { if (!o) setResetTarget(null) }}
        title="Reset Password"
        description={`Masukkan password baru untuk ${resetTarget?.username ?? ''}.`}
        footer={
          <div className="flex w-full gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setResetTarget(null)} className="flex-1 sm:flex-none">Batal</Button>
            <Button onClick={() => void doReset()} className="flex-1 sm:flex-none">Reset Password</Button>
          </div>
        }
      >
        <div className="space-y-1.5">
          <Label htmlFor="reset-pw">Password Baru</Label>
          <Input id="reset-pw" type="text" value={resetPw} onChange={(e) => setResetPw(e.target.value)} placeholder="Password baru" />
        </div>
      </ResponsiveDialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus user?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.username}. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
