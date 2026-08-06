/**
 * GelangPage — pilih team → print gelang (QR tim, kartu per anggota).
 */
import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { Printer } from 'lucide-react'
import { Card, CardContent } from '../../../components/ui/card'
import { NativeSelect, NativeSelectOption } from '../../../components/ui/native-select'
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
          <h1 className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">Generate Gelang</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">QR = kode tim, dicetak per anggota. Ukuran A4 otomatis.</p>
        </div>
        <NativeSelect
          className="w-full sm:w-64"
          value={selected?.kode ?? ''}
          onChange={(e) => {
            const t = teams.find((x) => x.kode === e.target.value)
            setSelected(t ?? null)
          }}
        >
          <NativeSelectOption value="">Pilih kelompok...</NativeSelectOption>
          {teams.map((t) => (
            <NativeSelectOption key={t.id} value={t.kode}>
              {t.nama} ({t.members.length} org)
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </section>

      {!selected && (
        <Card className="p-8 text-center">
          <CardContent className="flex flex-col items-center gap-2">
            <Printer size={24} className="text-muted-foreground/40" />
            <p className="text-sm font-bold text-foreground/80">Pilih kelompok untuk generate gelang</p>
            <p className="text-xs text-muted-foreground">Gelang dicetak per anggota, QR berisi kode tim.</p>
          </CardContent>
        </Card>
      )}

      {selected && <GelangPrint team={selected} />}

      {/* Barcode semua tim — download satu PNG */}
      <BarcodeAll />
    </div>
  )
}