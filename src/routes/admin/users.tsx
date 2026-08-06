/**
 * SuperadminUsers — kelola user via Drawer + Dialog.
 * Create: drawer (username, password, role, cari karyawan).
 * Inline: toggle active, change role, edit username, reset password, delete.
 */
import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { KeyRound, Plus, Search, Trash2, UserPen } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '../../components/ui/drawer'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { NativeSelect, NativeSelectOption } from '../../components/ui/native-select'
import FeedbackBanner from '../../components/ui/FeedbackBanner'
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

export const Route = createFileRoute('/admin/users')({
  beforeLoad: async () => {
    const { requireRole } = await import('../../lib/routeGuard')
    await requireRole(['superadmin'])
  },
  component: SuperadminUsers,
})

interface UserRow { id: number; username: string; role: UserRole; isActive: boolean; employeeId: number | null; employeeNama: string | null; employeeNip: string | null; createdAt: Date }
interface EmployeeOption { id: number; nama: string; nip: string | null }

const ROLES: UserRole[] = ['superadmin', 'admin', 'petugas', 'audit']

function SuperadminUsers() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('admin')
  const [employeeId, setEmployeeId] = useState<number | ''>('')
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  // Edit username dialog
  const [editTarget, setEditTarget] = useState<UserRow | null>(null)
  const [editUsername, setEditUsername] = useState('')

  // Reset password dialog
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null)
  const [resetPw, setResetPw] = useState('')

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null)

  const load = async () => { setUsers(await listUsers()) }
  useEffect(() => { void load() }, [])

  const loadEmployees = async (q: string) => {
    setSearch(q)
    if (q.length < 2) { setEmployees([]); return }
    setEmployees(await listEmployees({ data: { q, limit: 8 } }))
  }

  const submit = async () => {
    setErr(null); setMsg(null)
    if (!username.trim() || !password.trim()) { setErr('Username & password wajib'); return }
    try {
      await createUser({ data: { username: username.trim(), password, role, employeeId: employeeId === '' ? null : employeeId } })
      setMsg('User dibuat!'); setUsername(''); setPassword(''); setEmployeeId(''); setSearch(''); setShowCreate(false); await load()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Gagal buat user') }
  }

  const toggleActive = async (u: UserRow) => { await updateUser({ data: { id: u.id, isActive: !u.isActive } }); await load() }
  const changeRole = async (u: UserRow, next: UserRole) => { await updateUser({ data: { id: u.id, role: next } }); await load() }

  const doEditUsername = async () => {
    setErr(null); setMsg(null)
    if (!editTarget) return
    if (!editUsername.trim()) { setErr('Username wajib'); return }
    await updateUser({ data: { id: editTarget.id, username: editUsername.trim() } })
    setEditTarget(null); setMsg('Username diupdate!'); await load()
  }

  const doReset = async () => {
    setErr(null); setMsg(null)
    if (!resetTarget) return
    if (!resetPw.trim()) { setErr('Password baru wajib'); return }
    await resetPassword({ data: { id: resetTarget.id, password: resetPw } })
    setResetTarget(null); setResetPw(''); setMsg('Password direset!'); await load()
  }

  const remove = async () => {
    if (!deleteTarget) return
    await deleteUser({ data: { id: deleteTarget.id } }); setDeleteTarget(null); await load()
  }

  return (
    <div className="space-y-5">
      <section className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">Kelola User</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Superadmin — buat user, reset password, atur role.</p>
        </div>
        <Button onClick={() => { setUsername(''); setPassword(''); setEmployeeId(''); setSearch(''); setRole('admin'); setShowCreate(true) }}>
          <Plus size={14} className="mr-1" />User Baru
        </Button>
      </section>

      {msg && <FeedbackBanner tone="success">{msg}</FeedbackBanner>}
      {err && <FeedbackBanner tone="error">{err}</FeedbackBanner>}

      {/* User list */}
      <Card className="divide-y divide-border">
        {users.length === 0 && <p className="px-4 py-6 text-center text-xs text-muted-foreground">Belum ada user.</p>}
        {users.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">
                {u.username}
                {!u.isActive && <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">NONAKTIF</span>}
              </p>
              <p className="text-[10px] text-muted-foreground">{ROLE_LABELS[u.role]}{u.employeeNama ? ` · ${u.employeeNama}` : ' · (tanpa karyawan)'}</p>
            </div>
            <NativeSelect size="sm" value={u.role} onChange={(e) => changeRole(u, e.target.value as UserRole)}>
              {ROLES.map((r) => <NativeSelectOption key={r} value={r}>{ROLE_LABELS[r]}</NativeSelectOption>)}
            </NativeSelect>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => toggleActive(u)}
              className={`h-6 px-2 text-[10px] font-bold ${u.isActive ? 'bg-warning/15 text-warning hover:bg-warning/25' : 'bg-success/10 text-success hover:bg-success/20'}`}
            >
              {u.isActive ? 'Nonaktif' : 'Aktif'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => { setEditTarget(u); setEditUsername(u.username) }} className="h-6 px-2 text-[10px] font-bold">
              <UserPen size={11} className="mr-1" />Edit
            </Button>
            <Button variant="secondary" size="sm" onClick={() => { setResetTarget(u); setResetPw('') }} className="h-6 px-2 text-[10px] font-bold">
              <KeyRound size={11} className="mr-1" />Reset PW
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(u)} className="text-destructive hover:bg-rose-50">
              <Trash2 size={13} />
            </Button>
          </div>
        ))}
      </Card>

      {/* Create User Drawer */}
      <Drawer open={showCreate} onOpenChange={setShowCreate}>
        <DrawerContent className="mx-auto max-w-md">
          <DrawerHeader>
            <DrawerTitle>Buat User Baru</DrawerTitle>
            <DrawerDescription>Set kredensial awal dan role.</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-3 px-4">
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
              <NativeSelect className="w-full" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                {ROLES.map((r) => <NativeSelectOption key={r} value={r}>{ROLE_LABELS[r]}</NativeSelectOption>)}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label>Karyawan (opsional)</Label>
              <div className="relative">
                <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground/60" />
                <Input type="text" value={search} onChange={(e) => loadEmployees(e.target.value)} placeholder="Cari nama, minimal 2 huruf" className="pl-9" />
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
          <DrawerFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Batal</Button>
            <Button onClick={submit}>Buat User</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Edit Username Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Username</DialogTitle>
            <DialogDescription>Login selanjutnya pakai username baru ini.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="edit-username">Username</Label>
            <Input id="edit-username" type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} placeholder="Username baru" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Batal</Button>
            <Button onClick={() => void doEditUsername()}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => { if (!o) setResetTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Masukkan password baru untuk {resetTarget?.username}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reset-pw">Password Baru</Label>
            <Input id="reset-pw" type="text" value={resetPw} onChange={(e) => setResetPw(e.target.value)} placeholder="Password baru" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>Batal</Button>
            <Button onClick={() => void doReset()}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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