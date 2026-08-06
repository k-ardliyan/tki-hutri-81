/**
 * ConfirmForm — checklist anggota tim, petugas centang manual siapa yang ambil.
 * Default: SEMUA KOSONG (petugas pilih sendiri). Counter porsi dinamis.
 */
import { useState } from 'react'
import type { SnackTeam } from '../../server/functions/snack'

interface ConfirmFormProps {
  team: SnackTeam
  sessionName: string
  submitting: boolean
  onSubmit: (employeeIds: number[]) => void
  onBack: () => void
}

export default function ConfirmForm({ team, sessionName, submitting, onSubmit, onBack }: ConfirmFormProps) {
  // Default: kosong semua — petugas centang manual
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [confirming, setConfirming] = useState(false)

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelected((prev) => {
      if (prev.size === team.members.length) return new Set()
      return new Set(team.members.map((m) => m.employeeId))
    })
  }

  const allChecked = team.members.length > 0 && selected.size === team.members.length

  return (
    <div className="space-y-3">
      {/* Header */}
      <section className="surface-card px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-brand-red">{sessionName}</p>
            <h1 className="mt-0.5 text-lg font-extrabold text-slate-900">{team.nama}</h1>
            <p className="text-xs text-slate-500">{team.members.length} anggota · kode {team.kode}</p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-200"
          >
            <i className="fa-solid fa-arrow-left mr-1" /> Ganti
          </button>
        </div>
      </section>

      {/* Counter porsi dinamis */}
      <section className="surface-card flex items-center justify-between px-4 py-3.5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Jumlah Snack</p>
          <p className="text-2xl font-extrabold tabular-nums text-slate-900">
            {selected.size}
            <span className="text-sm text-slate-400"> / {team.members.length} porsi</span>
          </p>
        </div>
        <button
          type="button"
          onClick={toggleAll}
          className="rounded-[var(--radius-md)] border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
        >
          {allChecked ? 'Kosongkan' : 'Centang Semua'}
        </button>
      </section>

      {/* Checklist anggota */}
      <section className="surface-card divide-y divide-slate-100">
        {team.members.map((m, idx) => {
          const checked = selected.has(m.employeeId)
          return (
            <label
              key={m.employeeId}
              className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition ${
                checked ? 'bg-status-done/[0.04]' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(m.employeeId)}
                className="h-5 w-5 shrink-0 cursor-pointer rounded border-slate-300 accent-brand-red"
              />
              <span className="w-6 shrink-0 text-xs font-bold text-slate-400">{idx + 1}</span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-semibold ${checked ? 'text-slate-900' : 'text-slate-600'}`}>
                  {m.nama}
                </span>
                <span className="block text-[10px] text-slate-400">
                  {m.divisi ?? '—'}
                  {m.nip ? ` · ${m.nip}` : ''}
                </span>
              </span>
              <i className={`fa-solid fa-circle-check text-lg ${checked ? 'text-status-done' : 'text-slate-200'}`} />
            </label>
          )
        })}
      </section>

      {/* Submit */}
      <div className="sticky bottom-[calc(3.25rem+env(safe-area-inset-bottom,0px))] z-40 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3.5 shadow-[0_-2px_10px_-4px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:-mx-6 sm:px-6 lg:bottom-0">
        <button
          type="button"
          disabled={selected.size === 0 || submitting}
          onClick={() => {
            setConfirming(true)
            onSubmit([...selected])
          }}
          className="w-full cursor-pointer rounded-[var(--radius-md)] bg-brand-red px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-red/15 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
        >
          {submitting ? 'Menyimpan...' : `Konfirmasi ${selected.size} Porsi`}
        </button>
        {confirming && (
          <p className="mt-2 text-center text-[10px] text-slate-400">
            Pastikan centang sesuai jumlah snack yang diserahkan.
          </p>
        )}
      </div>
    </div>
  )
}
