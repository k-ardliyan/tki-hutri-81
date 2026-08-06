/**
 * PetugasDashboard — dashboard petugas, mobile-first.
 * CTA "Ambil Tanpa QR" prominent di atas → buka Modal search (sheet).
 * Detail per tim: accordion siapa sudah ambil.
 */
import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { getRedemptionSummary, searchEmployees, redeemSnack } from '../../server/functions/snack'
import { getSession } from '../../server/functions/auth'
import SnackTeamAccordion from '../../components/snack/SnackTeamAccordion'
import Modal from '../../components/ui/Modal'

export const Route = createFileRoute('/petugas/dashboard')({
  component: PetugasDashboardPage,
})

interface SearchResult {
  id: number
  nama: string
  nip: string | null
  divisi: string | null
}

type Summary = {
  active: { id: number; name: string; quota: number; isActive: boolean; createdAt: Date } | null
  teams: Array<{
    id: number
    nama: string
    kode: string
    kategori: string
    total: number
    redeemed: number
    done: boolean
    full: boolean
  }>
  totalRedeemed: number
  totalQuota: number
  sessions: Array<{ id: number; name: string; quota: number; isActive: boolean; createdAt: Date }>
}

function PetugasDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [claimedBy, setClaimedBy] = useState('')
  const [sessionId, setSessionId] = useState<number | null>(null)

  // Modal "Ambil Tanpa QR"
  const [showSearch, setShowSearch] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const [s, sess] = await Promise.all([getRedemptionSummary({ data: {} }), getSession()])
      setSummary(s)
      setClaimedBy(sess.username ?? 'petugas')
      setSessionId(s.active?.id ?? null)
    }
    void init()
  }, [])

  const openSearch = () => {
    setQ(''); setResults([]); setMsg(null); setErr(null); setShowSearch(true)
  }

  const doSearch = async () => {
    setErr(null); setMsg(null)
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    try {
      const res = await searchEmployees({ data: { q, limit: 8 } })
      setResults(res)
    } catch {
      setErr('Gagal mencari karyawan')
    } finally {
      setSearching(false)
    }
  }

  const redeemOne = async (id: number) => {
    if (!sessionId) { setErr('Tidak ada sesi aktif'); return }
    setErr(null); setMsg(null)
    const res = await redeemSnack({ data: { sessionId, employeeIds: [id], claimedBy } })
    if (!res.ok) { setErr(res.error ?? 'Gagal'); return }
    if (res.skipped.length > 0) {
      const r = res.skipped[0]
      setErr(`${r.claimedBy} sudah ambil pada ${new Date(r.claimedAt).toLocaleString('id-ID')}`)
    } else {
      setMsg('1 porsi dicatat!')
      setResults([]); setQ('')
      const s = await getRedemptionSummary({ data: {} })
      setSummary(s)
    }
  }

  const active = summary?.active
  const teams = summary?.teams ?? []

  return (
    <div className="space-y-4">
      {/* Header */}
      <section>
        <h1 className="text-lg font-extrabold tracking-tight text-slate-900">Dashboard Snack</h1>
        <p className="mt-0.5 text-sm text-slate-500">Sesi: <b>{active?.name ?? '—'}</b> · {active?.quota ?? 0} kuota</p>
      </section>

      {/* CTA prominent — Ambil Tanpa QR (mobile-first, di atas) */}
      <button
        type="button"
        onClick={openSearch}
        className="flex w-full items-center gap-3 rounded-[var(--radius-lg)] bg-brand-red px-4 py-3.5 text-left shadow-lg shadow-brand-red/15 transition hover:brightness-110 active:scale-[0.99]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
          <i className="fa-solid fa-user-plus text-base" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold text-white">Ambil Snack Tanpa QR</span>
          <span className="block text-[10px] text-white/80">Cari karyawan, catat pengambilan langsung</span>
        </span>
        <i className="fa-solid fa-chevron-right text-white/70" />
      </button>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="surface-card px-4 py-4">
          <p className="text-2xl font-extrabold text-slate-900">{active ? teams.filter((t) => t.done).length : 0}<span className="text-sm text-slate-400">/{teams.length}</span></p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Kelompok Ambil</p>
        </div>
        <div className="surface-card px-4 py-4">
          <p className="text-2xl font-extrabold text-slate-900">{active ? summary.totalRedeemed : 0}<span className="text-sm text-slate-400">/{active?.quota ?? 0}</span></p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Porsi Terambil</p>
        </div>
      </div>

      {/* Accordion detail per tim */}
      <section className="surface-card overflow-hidden">
        <div className="px-4 py-3">
          <p className="text-xs font-bold text-slate-600">Detail Kelompok</p>
        </div>
        {teams.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-slate-400">Belum ada data.</p>
        ) : (
          <SnackTeamAccordion teams={teams} sessionId={active?.id ?? null} />
        )}
      </section>

      {/* Modal search — Ambil Tanpa QR */}
      <Modal
        open={showSearch}
        onClose={() => setShowSearch(false)}
        title="Ambil Tanpa QR"
      >
        <div className="space-y-3">
          {/* Search input */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Cari Karyawan</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <i className="fa-solid fa-magnifying-glass absolute top-1/2 left-3 -translate-y-1/2 text-xs text-slate-300" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                  placeholder="Nama / NIP"
                  autoFocus
                  className="w-full rounded-[var(--radius-md)] border border-slate-200 py-2.5 pr-3 pl-9 text-sm outline-none placeholder:text-slate-300 focus:border-brand-red focus:ring-2 focus:ring-brand-red/15"
                />
              </div>
              <button
                type="button"
                onClick={doSearch}
                disabled={!q.trim() || searching}
                className="shrink-0 rounded-[var(--radius-md)] bg-brand-red px-4 py-2.5 text-xs font-bold text-white transition hover:brightness-110 active:scale-95 disabled:opacity-40"
              >
                {searching ? <i className="fa-solid fa-spinner fa-spin" /> : 'Cari'}
              </button>
            </div>
          </div>

          {/* Feedback */}
          {err && <p className="rounded-[var(--radius-md)] bg-status-danger-soft px-3 py-2 text-xs font-semibold text-status-danger">{err}</p>}
          {msg && <p className="rounded-[var(--radius-md)] bg-status-done-soft px-3 py-2 text-xs font-semibold text-status-done">{msg}</p>}

          {/* Empty state */}
          {!searching && results.length === 0 && !err && (
            <div className="rounded-[var(--radius-md)] bg-slate-50 px-4 py-6 text-center">
              <i className="fa-solid fa-users text-xl text-slate-300" />
              <p className="mt-2 text-xs font-semibold text-slate-500">Ketik nama atau NIP untuk mencari</p>
              <p className="mt-0.5 text-[10px] text-slate-400">Karyawan PKL tidak tampil (tidak eligible)</p>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="divide-y divide-slate-100 rounded-[var(--radius-md)] border border-slate-200">
              {results.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                    {r.nama.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{r.nama}</p>
                    <p className="truncate text-[10px] text-slate-400">{r.divisi ?? '—'}{r.nip ? ` · ${r.nip}` : ''}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => redeemOne(r.id)}
                    className="shrink-0 rounded-full bg-brand-red px-3.5 py-1.5 text-xs font-bold text-white transition hover:brightness-110 active:scale-95"
                  >
                    Ambil
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
