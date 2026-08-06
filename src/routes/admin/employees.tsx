/**
 * AdminEmployees — kelola master karyawan via Modal.
 * Create/Edit: modal (nama, nip, divisi, eligible).
 * Inline: search, delete.
 */
import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { listEmployees, createEmployee, updateEmployee, deleteEmployee } from '../../server/functions/admin'
import Modal from '../../components/ui/Modal'

export const Route = createFileRoute('/admin/employees')({
  beforeLoad: async () => {
    const { requireRole } = await import('../../lib/routeGuard')
    await requireRole(['superadmin', 'admin'])
  },
  component: AdminEmployees,
})

const PAGE_SIZE = 30

interface EmployeeRow { id: number; nama: string; nip: string | null; divisi: string | null; isSnackEligible: boolean }

function AdminEmployees() {
  const [rows, setRows] = useState<EmployeeRow[]>([])
  const [q, setQ] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [nama, setNama] = useState('')
  const [nip, setNip] = useState('')
  const [divisi, setDivisi] = useState('')
  const [eligible, setEligible] = useState(true)

  const load = async (query?: string) => {
    setRows(await listEmployees({ data: { q: query ?? (q || undefined), limit: 200 } }))
    setVisibleCount(PAGE_SIZE)
  }
  useEffect(() => { void load() }, [])

  const openCreate = () => { setEditId(null); setNama(''); setNip(''); setDivisi(''); setEligible(true); setShowModal(true) }
  const openEdit = (r: EmployeeRow) => { setEditId(r.id); setNama(r.nama); setNip(r.nip ?? ''); setDivisi(r.divisi ?? ''); setEligible(r.isSnackEligible); setShowModal(true) }

  const submit = async () => {
    setErr(null); setMsg(null)
    if (!nama.trim()) { setErr('Nama wajib'); return }
    if (editId !== null) {
      await updateEmployee({ data: { id: editId, nama: nama.trim(), nip: nip || null, divisi: divisi || null, isSnackEligible: eligible } })
      setMsg('Karyawan diupdate!')
    } else {
      await createEmployee({ data: { nama: nama.trim(), nip: nip || null, divisi: divisi || null, isSnackEligible: eligible } })
      setMsg('Karyawan ditambah!')
    }
    setShowModal(false); await load()
  }

  const remove = async (r: EmployeeRow) => {
    if (!confirm(`Hapus karyawan ${r.nama}?`)) return
    await deleteEmployee({ data: { id: r.id } }); await load()
  }

  const visibleRows = rows.slice(0, visibleCount)
  const hasMore = rows.length > visibleCount

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">Karyawan</h1>
          <p className="mt-0.5 text-sm text-slate-500">{rows.length} karyawan · master data</p>
        </div>
        <div className="flex gap-2">
          <input type="text" value={q} onChange={(e) => { setQ(e.target.value); void load(e.target.value) }}
            placeholder="Cari nama / NIP..." className="w-40 rounded-[var(--radius-md)] border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-300 focus:border-brand-red sm:w-56" />
          <button type="button" onClick={openCreate}
            className="rounded-[var(--radius-md)] bg-brand-red px-4 py-2 text-sm font-bold text-white transition hover:brightness-110">
            + Karyawan
          </button>
        </div>
      </section>

      {msg && <p className="rounded-[var(--radius-md)] bg-status-done-soft px-3 py-2 text-xs font-semibold text-status-done">{msg}</p>}
      {err && <p className="rounded-[var(--radius-md)] bg-status-danger-soft px-3 py-2 text-xs font-semibold text-status-danger">{err}</p>}

      <section className="surface-card divide-y divide-slate-100">
        {visibleRows.length === 0 && <p className="px-4 py-6 text-center text-xs text-slate-400">Tidak ada karyawan.</p>}
        {visibleRows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800">{r.nama}</p>
              <p className="text-[10px] text-slate-400">{r.divisi ?? '—'}{r.nip ? ` · ${r.nip}` : ''}</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.isSnackEligible ? 'bg-status-done-soft text-status-done' : 'bg-slate-100 text-slate-400'}`}>
              {r.isSnackEligible ? 'Eligible' : 'Tidak'}
            </span>
            <button type="button" onClick={() => openEdit(r)} className="rounded-[var(--radius-sm)] bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 transition hover:bg-slate-200">Edit</button>
            <button type="button" onClick={() => remove(r)} className="rounded-[var(--radius-sm)] px-2 py-1 text-[10px] font-bold text-rose-600 transition hover:bg-rose-50">
              <i className="fa-solid fa-trash-can" />
            </button>
          </div>
        ))}
        {hasMore && (
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="w-full px-4 py-3 text-xs font-bold text-brand-red transition hover:bg-slate-50"
          >
            Muat Lagi ({rows.length - visibleCount} tersisa)
          </button>
        )}
      </section>

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId !== null ? 'Edit Karyawan' : 'Tambah Karyawan'}
        footer={
          <>
            <button type="button" onClick={() => setShowModal(false)} className="rounded-[var(--radius-md)] border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50">Batal</button>
            <button type="button" onClick={submit} className="rounded-[var(--radius-md)] bg-brand-red px-4 py-2 text-sm font-bold text-white transition hover:brightness-110">{editId !== null ? 'Simpan' : 'Tambah'}</button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Nama Lengkap</label>
            <input type="text" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama lengkap"
              className="w-full rounded-[var(--radius-md)] border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-300 focus:border-brand-red" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">NIP</label>
              <input type="text" value={nip} onChange={(e) => setNip(e.target.value)} placeholder="Opsional"
                className="w-full rounded-[var(--radius-md)] border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-300 focus:border-brand-red" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Divisi</label>
              <input type="text" value={divisi} onChange={(e) => setDivisi(e.target.value)} placeholder="Opsional"
                className="w-full rounded-[var(--radius-md)] border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-300 focus:border-brand-red" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input type="checkbox" checked={eligible} onChange={(e) => setEligible(e.target.checked)} className="h-4 w-4 accent-brand-red" />
            Eligible snack
          </label>
        </div>
      </Modal>
    </div>
  )
}
