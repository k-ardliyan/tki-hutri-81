/**
 * SuperadminUsers — kelola user via Modal.
 * Create: modal (username, password, role, cari karyawan).
 * Inline: toggle active, change role, reset password, delete.
 */
import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { listUsers, createUser, updateUser, resetPassword, deleteUser, listEmployees } from '../../server/functions/admin'
import { ROLE_LABELS, type UserRole } from '../../lib/auth'
import Modal from '../../components/ui/Modal'

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

  // Edit modal state
  const [editTarget, setEditTarget] = useState<UserRow | null>(null)
  const [editUsername, setEditUsername] = useState('')

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
  const doReset = async (u: UserRow) => {
    const pw = prompt(`Reset password untuk ${u.username}? Masukkan password baru:`)
    if (!pw) return
    await resetPassword({ data: { id: u.id, password: pw } }); setMsg('Password direset!'); await load()
  }

  const doEditUsername = async () => {
    setErr(null); setMsg(null)
    if (!editTarget) return
    if (!editUsername.trim()) { setErr('Username wajib'); return }
    await updateUser({ data: { id: editTarget.id, username: editUsername.trim() } })
    setEditTarget(null); setMsg('Username diupdate!'); await load()
  }
  const remove = async (u: UserRow) => { if (!confirm(`Hapus user ${u.username}?`)) return; await deleteUser({ data: { id: u.id } }); await load() }

  return (
    <div className="space-y-5">
      <section className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">Kelola User</h1>
          <p className="mt-0.5 text-sm text-slate-500">Superadmin — buat user, reset password, atur role.</p>
        </div>
        <button type="button" onClick={() => { setUsername(''); setPassword(''); setEmployeeId(''); setSearch(''); setRole('admin'); setShowCreate(true) }}
          className="rounded-[var(--radius-md)] bg-brand-red px-4 py-2 text-sm font-bold text-white transition hover:brightness-110">
          + User Baru
        </button>
      </section>

      {msg && <p className="rounded-[var(--radius-md)] bg-status-done-soft px-3 py-2 text-xs font-semibold text-status-done">{msg}</p>}
      {err && <p className="rounded-[var(--radius-md)] bg-status-danger-soft px-3 py-2 text-xs font-semibold text-status-danger">{err}</p>}

      {/* User list */}
      <section className="surface-card divide-y divide-slate-100">
        {users.length === 0 && <p className="px-4 py-6 text-center text-xs text-slate-400">Belum ada user.</p>}
        {users.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800">
                {u.username}
                {!u.isActive && <span className="ml-2 rounded-full bg-status-danger-soft px-2 py-0.5 text-[10px] font-bold text-status-danger">NONAKTIF</span>}
              </p>
              <p className="text-[10px] text-slate-400">{ROLE_LABELS[u.role]}{u.employeeNama ? ` · ${u.employeeNama}` : ' · (tanpa karyawan)'}</p>
            </div>
            <select value={u.role} onChange={(e) => changeRole(u, e.target.value as UserRole)}
              className="rounded-[var(--radius-sm)] border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-brand-red">
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <button type="button" onClick={() => toggleActive(u)} className={`rounded-[var(--radius-sm)] px-2 py-1 text-[10px] font-bold transition ${u.isActive ? 'bg-amber-100 text-amber-700' : 'bg-status-done-soft text-status-done'}`}>
              {u.isActive ? 'Nonaktif' : 'Aktif'}
            </button>
            <button type="button" onClick={() => { setEditTarget(u); setEditUsername(u.username) }} className="rounded-[var(--radius-sm)] bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 transition hover:bg-slate-200">Edit</button>
            <button type="button" onClick={() => doReset(u)} className="rounded-[var(--radius-sm)] bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 transition hover:bg-slate-200">Reset PW</button>
            <button type="button" onClick={() => remove(u)} className="rounded-[var(--radius-sm)] px-2 py-1 text-[10px] font-bold text-rose-600 transition hover:bg-rose-50">
              <i className="fa-solid fa-trash-can" />
            </button>
          </div>
        ))}
      </section>

      {/* Create User Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Buat User Baru"
        footer={
          <>
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-[var(--radius-md)] border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50">Batal</button>
            <button type="button" onClick={submit} className="rounded-[var(--radius-md)] bg-brand-red px-4 py-2 text-sm font-bold text-white transition hover:brightness-110">Buat User</button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username"
                className="w-full rounded-[var(--radius-md)] border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-300 focus:border-brand-red" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Password Awal</label>
              <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password awal"
                className="w-full rounded-[var(--radius-md)] border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-300 focus:border-brand-red" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Role</label>
            <div className="flex flex-wrap gap-1.5">
              {ROLES.map((r) => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${role === r ? 'bg-brand-red text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Karyawan (opsional)</label>
            <input type="text" value={search} onChange={(e) => loadEmployees(e.target.value)} placeholder="Cari nama, minimal 2 huruf"
              className="w-full rounded-[var(--radius-md)] border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-300 focus:border-brand-red" />
            {employees.length > 0 && (
              <div className="mt-1.5 max-h-40 overflow-auto divide-y divide-slate-100 rounded-[var(--radius-md)] border border-slate-200">
                {employees.map((e) => (
                  <button key={e.id} type="button" onClick={() => { setEmployeeId(e.id); setSearch(e.nama); setEmployees([]) }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50">
                    <span className="font-semibold text-slate-700">{e.nama}</span>
                    <span className="text-[10px] text-slate-400">{e.nip ?? '—'}</span>
                  </button>
                ))}
              </div>
            )}
            {employeeId !== '' && (
              <p className="mt-1 text-[10px] font-semibold text-status-done"><i className="fa-solid fa-check mr-1" />Terhubung: {search}</p>
            )}
          </div>
        </div>
      </Modal>

      {/* Edit Username Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Username"
        footer={
          <>
            <button type="button" onClick={() => setEditTarget(null)} className="rounded-[var(--radius-md)] border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50">Batal</button>
            <button type="button" onClick={doEditUsername} className="rounded-[var(--radius-md)] bg-brand-red px-4 py-2 text-sm font-bold text-white transition hover:brightness-110">Simpan</button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Username</label>
            <input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} placeholder="Username baru"
              className="w-full rounded-[var(--radius-md)] border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-300 focus:border-brand-red" />
            <p className="mt-1 text-[10px] text-slate-400">Login selanjutnya pakai username baru ini.</p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
