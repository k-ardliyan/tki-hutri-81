/**
 * RiwayatHariIni — submission 5R hari ini dengan skor + detail (Collapsible).
 */
import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Clock3 } from 'lucide-react'
import ScoreBadge from '../ui/ScoreBadge'
import { getSession } from '../../server/functions/auth'
import { scoreSubmission, round1 } from '../../lib/scoring'
import { todayPrefix } from '../../lib/dateUtils'
import { useForms, useRooms, useSubmissions } from '../../lib/queries'

export default function RiwayatHariIni() {
  const { data: subs = [] } = useSubmissions()
  const { data: rooms = [] } = useRooms()
  const { data: forms = [] } = useForms()
  const [currentUser, setCurrentUser] = useState('')
  const [filter, setFilter] = useState<'all' | 'mine'>('all')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    void getSession().then((session) => setCurrentUser(session.username ?? ''))
  }, [])

  const today = todayPrefix()
  const todaySubs = useMemo(() => subs.filter((s) => s.createdAt.startsWith(today)), [subs, today])
  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms])
  const formMap = useMemo(() => new Map(forms.map((f) => [f.id, f])), [forms])

  const filtered = filter === 'mine'
    ? todaySubs.filter((s) => s.createdBy === currentUser)
    : todaySubs

  const subsWithScore = useMemo(() => filtered.map((s) => {
    const form = formMap.get(s.formId)
    const score = form ? scoreSubmission(form, s) : null
    return { sub: s, score }
  }), [filtered, formMap])

  const myCount = todaySubs.filter((s) => s.createdBy === currentUser).length

  if (todaySubs.length === 0) return null

  return (
    <div className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden transition-all">
      {/* Clickable Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition cursor-pointer text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-100/80 text-brand-red">
            <Clock3 size={14} />
          </div>
          <span className="text-xs font-bold text-foreground truncate">
            Riwayat Penilaian Hari Ini
          </span>
          <span className="rounded-full bg-rose-50 text-brand-red border border-rose-200/70 px-2 py-0.5 text-[10px] font-extrabold shrink-0">
            {todaySubs.length}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-semibold text-muted-foreground hidden sm:inline">
            {isOpen ? 'Sembunyikan' : 'Buka'}
          </span>
          <div className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground">
            <ChevronDown
              size={15}
              className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-foreground' : ''}`}
            />
          </div>
        </div>
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="border-t border-border bg-card">
          {/* Filter Sub-header */}
          <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border">
            <span className="text-[11px] font-medium text-muted-foreground">
              Daftar form yang telah dinilai hari ini
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition cursor-pointer ${
                  filter === 'all'
                    ? 'bg-card text-foreground shadow-2xs border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Semua ({todaySubs.length})
              </button>
              {currentUser && myCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilter('mine')}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition cursor-pointer ${
                    filter === 'mine'
                      ? 'bg-card text-foreground shadow-2xs border border-border'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Punyaku ({myCount})
                </button>
              )}
            </div>
          </div>

          {/* Submission Items */}
          <div className="divide-y divide-border max-h-72 overflow-y-auto">
            {subsWithScore.map(({ sub: s, score }) => {
              const room = roomMap.get(s.roomId)
              const form = formMap.get(s.formId)
              const isMine = s.createdBy === currentUser
              return (
                <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors">
                  {score ? (
                    <ScoreBadge value={round1(score.final)} showMax={false} className="min-w-8 justify-center" />
                  ) : (
                    <div className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground">
                      --
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-foreground truncate">
                        {room?.name ?? s.roomId}
                      </p>
                      <span className="text-[10px] text-muted-foreground/40">&middot;</span>
                      <p className="text-[10px] text-muted-foreground truncate">{form?.label ?? s.formId}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {s.auditor} &middot; {new Date(s.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {isMine && (
                    <span className="shrink-0 rounded-full bg-rose-50 text-brand-red border border-rose-200/60 px-2 py-0.5 text-[10px] font-extrabold">
                      Kamu
                    </span>
                  )}
                  {!isMine && s.createdBy && (
                    <span className="shrink-0 text-[10px] text-muted-foreground font-medium">@{s.createdBy}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
