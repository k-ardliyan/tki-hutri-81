/**
 * AdminSnackSessions — admin set sesi snack + kuota porsi.
 * CRUD via Modal: buat sesi, edit nama+kuota, toggle aktif, hapus.
 */
import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { getSessions, createSession, updateSession, deleteSession } from '../../../server/functions/snack'
import Modal from '../../../components/ui/Modal'

export const Route = createFileRoute('/admin/snack/sessions')({
  component: AdminSnackSessions,
})

interface SessionRow {
  id: number
  name: string
  quota: number
  isActive: boolean
  createdAt: Date
  redeemed?: number
  remaining?: number
}

function AdminSnackSessions() {
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newQuota, setNewQuota] = useState('')

  // Edit modal
  const [editTarget, setEditTarget] = useState<SessionRow | null>(null)
  const [editName, setEditName] = useState('')
  const [editQuota, setEditQuota] = useState('')

  const load = async () => { setSessions(await getSessions()) }
  useEffect(() => { void load() }, [])

  const doCreate = async () => {
    setErr(null); setMsg(null)
    const q = Number(newQuota)
    if (!newName.trim()) { setErr('Nama sesi wajib'); return }
    if (Number.isNaN(q) || q < 0) { setErr('Kuota harus angka >= 0'); return }
    await createSession({ data: { name: newName.trim(), quota: q } })
    setNewName(''); setNewQuota(''); setShowCreate(false); setMsg('Sesi dibuat!')
    await load()
  }

  const doEdit = async () => {
    setErr(null); setMsg(null)
    if (!editTarget) return
    const q = Number(editQuota)
    if (!editName.trim()) { setErr('Nama sesi wajib'); return }
    if (Number.isNaN(q) || q < 0) { setErr('Kuota harus angka >= 0'); return }
    // Guard: kuota total baru tidak boleh kurang dari yang sudah terambil
    const taken = editTarget.redeemed ?? 0
    if (q < taken) {
      setErr(`Kuota ${q} kurang dari ${taken} yang sudah terambil. Minimal ${taken}.`)
      return
    }
    await updateSession({ data: { id: editTarget.id, name: editName.trim(), quota: q } })
    setEditTarget(null); setMsg('Sesi diupdate!')
    await load()
  }

  const toggleActive = async (s: SessionRow) => {
    await updateSession({ data: { id: s.id, isActive: !s.isActive } })
    await load()
  }

  const remove = async (s: SessionRow) => {
    if (!confirm(`Hapus sesi "${s.name}"? Data redemption ikut terhapus.`)) return
    await deleteSession({ data: { id: s.id } })
    await load()
  }

  return (
    <div className="space-y-5">
      <section className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">Sesi Snack & Kuota</h1>
          <p className="mt-0.5 text-sm text-slate-500">Buat sesi, set porsi kuota, aktifkan/nonaktifkan.</p>
        </div>
        <button
          type="button"
          onClick={() => { setNewName(''); setNewQuota(''); setShowCreate(true) }}
          className="rounded-[var(--radius-md)] bg-brand-red px-4 py-2 text-sm font-bold text-white transition hover:brightness-110"
        >
          + Sesi
        </button>
      </section>

      {msg && <p className="rounded-[var(--radius-md)] bg-status-done-soft px-3 py-2 text-xs font-semibold text-status-done">{msg}</p>}
      {err && <p className="rounded-[var(--radius-md)] bg-status-danger-soft px-3 py-2 text-xs font-semibold text-status-danger">{err}</p>}

      {/* Session list */}
      <section className="surface-card divide-y divide-slate-100">
        {sessions.length === 0 && <p className="px-4 py-6 text-center text-xs text-slate-400">Belum ada sesi.</p>}
        {sessions.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800">
                {s.name}
                {s.isActive && <span className="ml-2 rounded-full bg-status-done-soft px-2 py-0.5 text-[10px] font-bold text-status-done">AKTIF</span>}
              </p>
              <p className="text-[10px] text-slate-400">#{s.id} · Kuota {s.quota}</p>
              {/* Sisa snack */}
              {s.remaining !== undefined && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${s.remaining === 0 ? 'bg-status-danger' : s.remaining <= s.quota * 0.2 ? 'bg-amber-500' : 'bg-status-done'}`}
                      style={{ width: `${s.quota > 0 ? Math.max(0, Math.min(100, ((s.quota - s.remaining) / s.quota) * 100)) : 0}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-bold ${s.remaining === 0 ? 'text-status-danger' : s.remaining <= s.quota * 0.2 ? 'text-amber-600' : 'text-status-done'}`}>
                    Sisa {s.remaining}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => { setEditTarget(s); setEditName(s.name); setEditQuota(String(s.quota)) }}
                className="rounded-[var(--radius-sm)] bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 transition hover:bg-slate-200"
              >
                <i className="fa-solid fa-pen-to-square mr-1" />Edit
              </button>
              <button
                type="button"
                onClick={() => toggleActive(s)}
                className={`rounded-[var(--radius-sm)] px-2.5 py-1 text-[10px] font-bold transition ${s.isActive ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-status-done-soft text-status-done hover:brightness-95'}`}
              >
                {s.isActive ? 'Nonaktif' : 'Aktifkan'}
              </button>
              <button
                type="button"
                onClick={() => remove(s)}
                className="rounded-[var(--radius-sm)] px-2.5 py-1 text-[10px] font-bold text-rose-600 transition hover:bg-rose-50"
              >
                <i className="fa-solid fa-trash-can" />
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Buat Sesi Baru"
        footer={
          <>
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-[var(--radius-md)] border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50">Batal</button>
            <button type="button" onClick={doCreate} className="rounded-[var(--radius-md)] bg-brand-red px-4 py-2 text-sm font-bold text-white transition hover:brightness-110">Simpan</button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Nama Sesi</label>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Contoh: Snack Pagi"
              className="w-full rounded-[var(--radius-md)] border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-300 focus:border-brand-red" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Kuota Porsi</label>
            <input type="number" value={newQuota} onChange={(e) => setNewQuota(e.target.value)} placeholder="0" min={0}
              className="w-full rounded-[var(--radius-md)] border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-300 focus:border-brand-red" />
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Sesi"
        footer={
          <>
            <button type="button" onClick={() => setEditTarget(null)} className="rounded-[var(--radius-md)] border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50">Batal</button>
            <button type="button" onClick={doEdit} className="rounded-[var(--radius-md)] bg-brand-red px-4 py-2 text-sm font-bold text-white transition hover:brightness-110">Simpan</button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Nama Sesi</label>
            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nama sesi"
              className="w-full rounded-[var(--radius-md)] border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-300 focus:border-brand-red" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Kuota Total</label>
            <input type="number" value={editQuota} onChange={(e) => setEditQuota(e.target.value)} min={0}
              className="w-full rounded-[var(--radius-md)] border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-300 focus:border-brand-red" />
            <p className="mt-1 text-[10px] text-slate-400">
              Isi angka total, misal naik 100 → 110. Sisa dihitung otomatis.
            </p>
          </div>
          {/* Info live: terambil & sisa */}
          {editTarget && (
            <div className="grid grid-cols-2 gap-2 rounded-[var(--radius-md)] bg-slate-50 px-3 py-2.5 text-center">
              <div>
                <p className="text-sm font-extrabold text-slate-700">{editTarget.redeemed ?? 0}</p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Terambil</p>
              </div>
              <div>
                <p className={`text-sm font-extrabold ${(() => {
                  const q = Number(editQuota)
                  const taken = editTarget.redeemed ?? 0
                  if (Number.isNaN(q) || q < 0) return 'text-status-danger'
                  return q - taken < 0 ? 'text-status-danger' : q - taken === 0 ? 'text-status-danger' : 'text-status-done'
                })()}`}>
                  {(() => {
                    const q = Number(editQuota)
                    const taken = editTarget.redeemed ?? 0
                    if (Number.isNaN(q)) return '—'
                    return Math.max(0, q - taken)
                  })()}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Sisa Setelah</p>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
