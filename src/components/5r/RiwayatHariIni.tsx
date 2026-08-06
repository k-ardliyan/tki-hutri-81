/**
 * RiwayatHariIni — submission 5R hari ini dengan skor + detail.
 *
 * Features:
 * - Score badge per submission (color-coded)
 * - "Kamu" badge for current user
 * - Filter: semua / punyaku
 * - Grouped by time
 */
import { useEffect, useMemo, useState } from 'react'
import { getSubmissions } from '../../server/functions/5r'
import { getSession } from '../../server/functions/auth'
import type { FiveRSubmission } from '../../data/5r'
import { getRooms, getForms } from '../../server/functions/5r'
import type { FiveRRoom, FiveRForm } from '../../data/5r'
import { scoreSubmission, round1 } from '../../lib/scoring'
import { todayPrefix } from '../../lib/dateUtils'

export default function RiwayatHariIni() {
  const [subs, setSubs] = useState<FiveRSubmission[]>([])
  const [currentUser, setCurrentUser] = useState('')
  const [rooms, setRooms] = useState<FiveRRoom[]>([])
  const [forms, setForms] = useState<FiveRForm[]>([])
  const [filter, setFilter] = useState<'all' | 'mine'>('all')

  useEffect(() => {
    const init = async () => {
      const [allSubs, session, r, f] = await Promise.all([
        getSubmissions(),
        getSession(),
        getRooms(),
        getForms(),
      ])
      const today = todayPrefix()
      const todaySubs = allSubs.filter((s) => s.createdAt.startsWith(today))
      setSubs(todaySubs)
      setCurrentUser(session.username ?? '')
      setRooms(r)
      setForms(f)
    }
    void init()
  }, [])

  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms])
  const formMap = useMemo(() => new Map(forms.map((f) => [f.id, f])), [forms])

  const filtered = filter === 'mine'
    ? subs.filter((s) => s.createdBy === currentUser)
    : subs

  // Compute scores for each submission
  const subsWithScore = useMemo(() => filtered.map((s) => {
    const form = formMap.get(s.formId)
    const score = form ? scoreSubmission(form, s) : null
    return { sub: s, score }
  }), [filtered, formMap])

  const myCount = subs.filter((s) => s.createdBy === currentUser).length

  if (subs.length === 0) return null

  return (
    <section className="surface-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-xs font-bold text-slate-600">
          <i className="fa-solid fa-clock-rotate-left mr-1 text-slate-400" />
          Riwayat Hari Ini
          <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
            {subs.length}
          </span>
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition ${filter === 'all' ? 'bg-brand-red text-white' : 'bg-slate-100 text-slate-500'}`}
          >
            Semua ({subs.length})
          </button>
          {currentUser && myCount > 0 && (
            <button
              type="button"
              onClick={() => setFilter('mine')}
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition ${filter === 'mine' ? 'bg-brand-red text-white' : 'bg-slate-100 text-slate-500'}`}
            >
              Punyaku ({myCount})
            </button>
          )}
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {subsWithScore.map(({ sub: s, score }) => {
          const room = roomMap.get(s.roomId)
          const form = formMap.get(s.formId)
          const isMine = s.createdBy === currentUser
          return (
            <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
              {/* Score badge */}
              {score ? (
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[10px] font-bold ${
                  score.final >= 80 ? 'bg-status-done-soft text-status-done'
                    : score.final >= 60 ? 'bg-status-pending-soft text-status-pending'
                      : 'bg-status-danger-soft text-status-danger'
                }`}>
                  {round1(score.final)}
                </div>
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-slate-100 text-[10px] font-bold text-slate-400">
                  --
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-slate-700">
                    {room?.name ?? s.roomId}
                  </p>
                  <span className="text-[10px] text-slate-300">&middot;</span>
                  <p className="text-[10px] text-slate-400">{form?.label ?? s.formId}</p>
                </div>
                <p className="text-[10px] text-slate-400">
                  {s.auditor} &middot; {new Date(s.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {isMine && (
                <span className="shrink-0 rounded-full bg-brand-red/10 px-2 py-0.5 text-[10px] font-bold text-brand-red">Kamu</span>
              )}
              {!isMine && s.createdBy && (
                <span className="shrink-0 text-[10px] text-slate-400">@{s.createdBy}</span>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
