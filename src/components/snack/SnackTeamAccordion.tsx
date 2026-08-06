/**
 * SnackTeamAccordion — collapsible team status + detail siapa ambil.
 * Mobile-first: tap header untuk expand, lihat daftar redeemed & belum.
 */
import { useState } from 'react'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { getRedemptionsBySession } from '../../server/functions/snack'

interface TeamDetail {
  id: number
  nama: string
  kode: string
  kategori: string
  total: number
  redeemed: number
  done: boolean
  full: boolean
}

interface RedeemedMember {
  employeeId: number
  nama: string
  nip: string | null
  divisi: string | null
  claimedBy: string | null
  claimedAt: string | null
}

interface Props {
  teams: TeamDetail[]
  sessionId: number | null
}

export default function SnackTeamAccordion({ teams, sessionId }: Props) {
  const [openId, setOpenId] = useState<number | null>(null)
  const [details, setDetails] = useState<Map<number, RedeemedMember[]>>(new Map())
  const [loading, setLoading] = useState<number | null>(null)

  const toggle = async (teamId: number) => {
    if (openId === teamId) { setOpenId(null); return }
    setOpenId(teamId)
    if (details.has(teamId)) return
    if (!sessionId) return
    setLoading(teamId)
    const members = await getRedemptionsBySession({ data: { sessionId, teamId } })
    setDetails((prev) => new Map(prev).set(teamId, members))
    setLoading(null)
  }

  return (
    <div className="divide-y divide-border">
      {teams.map((t) => {
        const isOpen = openId === t.id
        const members = details.get(t.id) ?? null
        const isLoading = loading === t.id

        return (
          <div key={t.id}>
            {/* Header — tap to expand */}
            <button
              type="button"
              onClick={() => toggle(t.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-muted/50"
            >
              <div className="flex items-center gap-2.5">
                <span className={`h-2.5 w-2.5 rounded-full ${t.done ? 'bg-success' : t.redeemed > 0 ? 'bg-warning' : 'bg-muted-foreground/30'}`} />
                <div>
                  <p className="text-sm font-semibold text-foreground/90">{t.nama}</p>
                  <p className="text-[10px] text-muted-foreground">{t.kode}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  t.full ? 'bg-success/10 text-success' : t.done ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'
                }`}>
                  {t.redeemed}/{t.total}
                </span>
                {isOpen ? <ChevronUp size={14} className="text-muted-foreground/50" /> : <ChevronDown size={14} className="text-muted-foreground/50" />}
              </div>
            </button>

            {/* Expanded detail */}
            {isOpen && (
              <div className="bg-muted/40 px-4 pb-3">
                {isLoading && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 size={14} className="animate-spin text-muted-foreground/50" />
                  </div>
                )}
                {!isLoading && members && (
                  <div className="space-y-1">
                    {members.filter((m) => m.claimedBy).length > 0 && (
                      <div>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-success">Sudah Ambil</p>
                        {members.filter((m) => m.claimedBy).map((m) => (
                          <div key={m.employeeId} className="flex items-center justify-between py-1.5">
                            <div>
                              <p className="text-xs font-semibold text-foreground/80">{m.nama}</p>
                              <p className="text-[10px] text-muted-foreground">{m.divisi ?? ''}{m.nip ? ` · ${m.nip}` : ''}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-semibold text-muted-foreground">{m.claimedBy}</p>
                              {m.claimedAt && (
                                <p className="text-[9px] text-muted-foreground/60">
                                  {new Date(m.claimedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {members.filter((m) => !m.claimedBy).length > 0 && (
                      <div className={members.filter((m) => m.claimedBy).length > 0 ? 'mt-2 border-t border-border pt-2' : ''}>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Belum</p>
                        {members.filter((m) => !m.claimedBy).map((m) => (
                          <p key={m.employeeId} className="py-1 text-xs text-muted-foreground">{m.nama}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}