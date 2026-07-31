import { useEffect, useMemo, useState } from 'react'
import { dataKelompok, summaryKelompok } from '../../data/kelompok'

function highlightParts(text, term) {
  if (!term) return [text]
  const lower = text.toLowerCase()
  const t = term.toLowerCase()
  const parts = []
  let start = 0
  let idx = lower.indexOf(t)
  while (idx !== -1) {
    if (idx > start) parts.push(text.slice(start, idx))
    parts.push(
      <mark key={`${idx}-${text}`} className="rounded bg-amber-200 px-0.5 text-slate-900">
        {text.slice(idx, idx + t.length)}
      </mark>,
    )
    start = idx + t.length
    idx = lower.indexOf(t, start)
  }
  if (start < text.length) parts.push(text.slice(start))
  return parts
}

export default function TimPage() {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [openIds, setOpenIds] = useState(() => new Set())

  const term = query.trim()
  const termLower = term.toLowerCase()

  const filtered = useMemo(() => {
    return dataKelompok.filter((g) => {
      const byCat = filter === 'all' || g.kategori === filter
      const byQuery =
        !termLower ||
        g.nama.toLowerCase().includes(termLower) ||
        g.anggota.some((a) => a.toLowerCase().includes(termLower))
      return byCat && byQuery
    })
  }, [filter, termLower])

  // Auto-expand groups that match a name search (better UX)
  useEffect(() => {
    if (!termLower) {
      setOpenIds(new Set())
      return
    }

    const matched = new Set()
    for (const g of filtered) {
      const nameHit = g.nama.toLowerCase().includes(termLower)
      const memberHit = g.anggota.some((a) => a.toLowerCase().includes(termLower))
      // Expand when member name matches, or when only few results
      if (memberHit || nameHit) matched.add(g.id)
    }
    setOpenIds(matched)
  }, [termLower, filtered])

  const toggle = (id) => {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="surface-card px-4 py-5 sm:px-7 sm:py-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-kicker">Peserta</p>
            <h2 className="mt-1 font-heading text-2xl font-extrabold text-slate-900 sm:text-3xl">
              {summaryKelompok.total} tim siap berlaga
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {summaryKelompok.putra} kelompok putra · {summaryKelompok.putri} kelompok putri.
              Semua anggota setara.
            </p>
          </div>
          <div className="relative w-full max-w-md">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama peserta atau tim..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm outline-none ring-brand-red transition focus:bg-white focus:ring-2"
            />
            {term && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {term && (
          <p className="mt-3 text-xs font-medium text-emerald-700">
            <i className="fa-solid fa-circle-info mr-1" />
            Hasil pencarian otomatis dibuka — {filtered.length} kelompok cocok.
          </p>
        )}

        <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: `Semua (${summaryKelompok.total})` },
            { id: 'putra', label: `Putra (${summaryKelompok.putra})` },
            { id: 'putri', label: `Putri (${summaryKelompok.putri})` },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                filter === f.id
                  ? 'bg-brand-red text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {filtered.length === 0 && (
          <div className="surface-card col-span-full px-4 py-10 text-center">
            <i className="fa-solid fa-user-slash mb-2 text-2xl text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">
              Tidak ada hasil untuk pencarian ini.
            </p>
          </div>
        )}

        {filtered.map((g) => {
          const open = openIds.has(g.id)
          const isPutra = g.kategori === 'putra'
          return (
            <article
              key={g.id}
              className={`surface-card overflow-hidden transition ${
                open && term ? 'ring-2 ring-amber-300/60' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(g.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
              >
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        isPutra ? 'bg-sky-50 text-sky-700' : 'bg-pink-50 text-pink-700'
                      }`}
                    >
                      {g.kategori}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">#{g.nomor}</span>
                  </div>
                  <h3 className="font-heading text-base font-bold text-slate-900">
                    {highlightParts(g.nama, term)}
                  </h3>
                  <p className="text-xs text-slate-500">{g.anggota.length} anggota</p>
                </div>
                <i
                  className={`fa-solid fa-chevron-down text-slate-400 transition ${
                    open ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {open && (
                <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3">
                  <ul className="space-y-1.5">
                    {g.anggota.map((nama, idx) => {
                      const isMatch = termLower && nama.toLowerCase().includes(termLower)
                      return (
                        <li
                          key={`${g.id}-${nama}`}
                          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ring-1 ${
                            isMatch
                              ? 'bg-amber-50 text-slate-900 ring-amber-200'
                              : 'bg-white text-slate-700 ring-slate-100'
                          }`}
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                            {idx + 1}
                          </span>
                          <span className="min-w-0 flex-1">{highlightParts(nama, term)}</span>
                          {isMatch && (
                            <span className="shrink-0 rounded-full bg-amber-200 px-1.5 py-0.5 text-[9px] font-bold text-amber-900">
                              cocok
                            </span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </article>
          )
        })}
      </section>
    </div>
  )
}
