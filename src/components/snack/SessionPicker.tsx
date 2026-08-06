/**
 * SessionPicker — autocomplete pencarian sesi snack (master data bisa banyak).
 * Mobile-first: input search + daftar hasil filter, tap untuk pilih.
 * Ganti native <select> yang menyusahkan kalau sesi sudah banyak.
 */
import { useEffect, useRef, useState } from 'react'

export interface SessionOption {
  id: number
  name: string
  quota: number
  isActive: boolean
  redeemed?: number
  remaining?: number
}

interface SessionPickerProps {
  sessions: SessionOption[]
  value: number | null
  onChange: (id: number) => void
  placeholder?: string
}

export default function SessionPicker({ sessions, value, onChange, placeholder = 'Pilih sesi...' }: SessionPickerProps) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const selected = sessions.find((s) => s.id === value) ?? null

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = q.trim()
    ? sessions.filter((s) => s.name.toLowerCase().includes(q.trim().toLowerCase()))
    : sessions

  const pick = (s: SessionOption) => {
    onChange(s.id)
    setQ('')
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative w-full sm:w-64">
      {/* Input — tampil nama terpilih saat tutup, jadi query saat buka */}
      <div className="relative">
        <i className="fa-solid fa-magnifying-glass pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-slate-300" />
        <input
          type="text"
          value={open ? q : (selected?.name ?? '')}
          onFocus={() => { setOpen(true); setQ('') }}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          placeholder={placeholder}
          className="w-full rounded-[var(--radius-md)] border border-slate-200 bg-white py-2 pr-8 pl-9 text-sm font-semibold text-slate-700 outline-none placeholder:font-normal placeholder:text-slate-300 focus:border-brand-red focus:ring-2 focus:ring-brand-red/15"
        />
        {selected && !open && (
          <button
            type="button"
            onClick={() => { setQ(''); setOpen(true) }}
            className="absolute top-1/2 right-2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
            aria-label="Ubah sesi"
          >
            <i className="fa-solid fa-chevron-down text-xs" />
          </button>
        )}
      </div>

      {/* Dropdown hasil filter */}
      {open && (
        <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-[var(--radius-md)] border border-slate-200 bg-white shadow-xl">
          {filtered.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-slate-400">Tidak ada sesi cocok.</p>
          )}
          <div className="max-h-64 overflow-auto">
            {filtered.map((s) => {
              const isSelected = s.id === value
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pick(s)}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition hover:bg-slate-50 ${isSelected ? 'bg-brand-red/[0.04]' : ''}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate font-semibold ${isSelected ? 'text-brand-red' : 'text-slate-700'}`}>{s.name}</span>
                    <span className="block text-[10px] text-slate-400">
                      {s.remaining !== undefined && s.remaining > 0
                        ? `Sisa ${s.remaining} dari ${s.quota}`
                        : s.remaining === 0 && s.quota > 0
                          ? 'Habis'
                          : `Kuota ${s.quota} porsi`}
                    </span>
                  </span>
                  {s.isActive && (
                    <span className="shrink-0 rounded-full bg-status-done-soft px-2 py-0.5 text-[10px] font-bold text-status-done">AKTIF</span>
                  )}
                  {isSelected && <i className="fa-solid fa-check shrink-0 text-xs text-brand-red" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
