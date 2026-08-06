/**
 * GelangPage — pilih team → print gelang (QR tim, kartu per anggota).
 * Route: /admin/snack/gelang?team=PUTRA-1
 */
import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { getTeamsWithMembers } from '../../../server/functions/snack'
import type { SnackTeam } from '../../../server/functions/snack'
import GelangPrint from '../../../components/snack/GelangPrint'
import BarcodeAll from '../../../components/snack/BarcodeAll'

const searchSchema = z.object({
  team: z.string().optional(),
})

export const Route = createFileRoute('/admin/snack/gelang')({
  validateSearch: searchSchema,
  component: GelangPage,
})

function GelangPage() {
  const { team: teamParam } = Route.useSearch()
  const [teams, setTeams] = useState<SnackTeam[]>([])
  const [selected, setSelected] = useState<SnackTeam | null>(null)

  useEffect(() => {
    void getTeamsWithMembers().then((t) => {
      setTeams(t)
      const found = t.find((x) => x.kode === teamParam) ?? null
      setSelected(found)
    })
  }, [teamParam])

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">Generate Gelang</h1>
          <p className="mt-0.5 text-sm text-slate-500">QR = kode tim, dicetak per anggota. Ukuran A4 otomatis.</p>
        </div>
        <select
          value={selected?.kode ?? ''}
          onChange={(e) => {
            const t = teams.find((x) => x.kode === e.target.value)
            setSelected(t ?? null)
          }}
          className="rounded-[var(--radius-md)] border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-brand-red"
        >
          <option value="">Pilih kelompok...</option>
          {teams.map((t) => (
            <option key={t.id} value={t.kode}>
              {t.nama} ({t.members.length} org)
            </option>
          ))}
        </select>
      </section>

      {!selected && (
        <section className="surface-card p-8 text-center">
          <i className="fa-solid fa-print text-2xl text-slate-300" />
          <p className="mt-2 text-sm font-bold text-slate-600">Pilih kelompok untuk generate gelang</p>
          <p className="mt-1 text-xs text-slate-400">Gelang dicetak per anggota, QR berisi kode tim.</p>
        </section>
      )}

      {selected && <GelangPrint team={selected} />}

      {/* Barcode semua tim — download satu PNG */}
      <BarcodeAll />
    </div>
  )
}
