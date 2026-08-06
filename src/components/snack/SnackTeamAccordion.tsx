/**
 * SnackTeamAccordion — collapsible team status + detail siapa ambil.
 * Mobile-first: tap header untuk expand, lihat daftar redeemed & belum.
 */
import { useState } from 'react'
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
    <div className="divide-y divide-slate-100">
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
              className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-slate-50/50"
            >
              <div className="flex items-center gap-2.5">
                <span className={`h-2.5 w-2.5 rounded-full ${t.done ? 'bg-status-done' : t.redeemed > 0 ? 'bg-amber-400' : 'bg-slate-300'}`} />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{t.nama}</p>
                  <p className="text-[10px] text-slate-400">{t.kode}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  t.full ? 'bg-status-done-soft text-status-done' : t.done ? 'bg-status-pending-soft text-status-pending' : 'bg-slate-100 text-slate-500'
                }`}>
                  {t.redeemed}/{t.total}
                </span>
                <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'} text-[10px] text-slate-300 transition-transform`} />
              </div>
            </button>

            {/* Expanded detail */}
            {isOpen && (
              <div className="bg-slate-50/50 px-4 pb-3">
                {isLoading && (
                  <div className="flex items-center justify-center py-4">
                    <i className="fa-solid fa-spinner fa-spin text-sm text-slate-300" />
                  </div>
                )}
                {!isLoading && members && (
                  <div className="space-y-1">
                    {/* Sudah ambil */}
                    {members.filter((m) => m.claimedBy).length > 0 && (
                      <div>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-status-done">Sudah Ambil</p>
                        {members.filter((m) => m.claimedBy).map((m) => (
                          <div key={m.employeeId} className="flex items-center justify-between py-1.5">
                            <div>
                              <p className="text-xs font-semibold text-slate-700">{m.nama}</p>
                              <p className="text-[10px] text-slate-400">{m.divisi ?? ''}{m.nip ? ` · ${m.nip}` : ''}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-semibold text-slate-500">{m.claimedBy}</p>
                              {m.claimedAt && (
                                <p className="text-[9px] text-slate-300">
                                  {new Date(m.claimedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Belum ambil */}
                    {members.filter((m) => !m.claimedBy).length > 0 && (
                      <div className={members.filter((m) => m.claimedBy).length > 0 ? 'mt-2 border-t border-slate-200 pt-2' : ''}>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Belum</p>
                        {members.filter((m) => !m.claimedBy).map((m) => (
                          <p key={m.employeeId} className="py-1 text-xs text-slate-400">{m.nama}</p>
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
