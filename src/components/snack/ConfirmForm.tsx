/**
 * ConfirmForm — checklist anggota tim, petugas centang manual siapa yang ambil.
 * Default: SEMUA KOSONG (petugas pilih sendiri). Counter porsi dinamis.
 */
import { useState } from 'react'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Checkbox } from '../ui/checkbox'
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
      <Card>
        <CardContent className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary">{sessionName}</p>
            <h1 className="mt-0.5 text-lg font-extrabold text-foreground">{team.nama}</h1>
            <p className="text-xs text-muted-foreground">{team.members.length} anggota · kode {team.kode}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={onBack}>
            <ArrowLeft size={12} className="mr-1" /> Ganti
          </Button>
        </CardContent>
      </Card>

      {/* Counter porsi dinamis */}
      <Card>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Jumlah Snack</p>
            <p className="text-2xl font-extrabold tabular-nums text-foreground">
              {selected.size}
              <span className="text-sm text-muted-foreground"> / {team.members.length} porsi</span>
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={toggleAll}>
            {allChecked ? 'Kosongkan' : 'Centang Semua'}
          </Button>
        </CardContent>
      </Card>

      {/* Checklist anggota */}
      <Card className="divide-y divide-border">
        {team.members.map((m, idx) => {
          const checked = selected.has(m.employeeId)
          return (
            <label
              key={m.employeeId}
              className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition ${checked ? 'bg-success/[0.04]' : ''}`}
            >
              <Checkbox checked={checked} onCheckedChange={() => toggle(m.employeeId)} />
              <span className="w-6 shrink-0 text-xs font-bold text-muted-foreground/50">{idx + 1}</span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-semibold ${checked ? 'text-foreground' : 'text-muted-foreground/80'}`}>
                  {m.nama}
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  {m.divisi ?? '—'}
                  {m.nip ? ` · ${m.nip}` : ''}
                </span>
              </span>
              <CheckCircle2 size={20} className={checked ? 'text-success' : 'text-muted-foreground/15'} />
            </label>
          )
        })}
      </Card>

      {/* Submit */}
      <div className="sticky bottom-[calc(3.25rem+env(safe-area-inset-bottom,0px))] z-40 -mx-4 border-t border-border bg-white/95 px-4 py-3.5 shadow-[0_-2px_10px_-4px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:-mx-6 sm:px-6 lg:bottom-0">
        <Button
          disabled={selected.size === 0 || submitting}
          onClick={() => {
            setConfirming(true)
            onSubmit([...selected])
          }}
          className="w-full py-3.5 text-sm font-bold"
        >
          {submitting ? 'Menyimpan...' : `Konfirmasi ${selected.size} Porsi`}
        </Button>
        {confirming && (
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Pastikan centang sesuai jumlah snack yang diserahkan.
          </p>
        )}
      </div>
    </div>
  )
}