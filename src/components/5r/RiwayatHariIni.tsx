/**
 * RiwayatHariIni — submission 5R hari ini dengan skor + detail.
 */
import { useEffect, useMemo, useState } from 'react'
import { Clock3 } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import ScoreBadge from '../ui/ScoreBadge'
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'
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
    <Card>
      <CardContent className="px-0 py-0">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
            <Clock3 size={13} />
            Riwayat Hari Ini
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
              {todaySubs.length}
            </span>
          </p>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'mine')}>
            <TabsList className="h-7">
              <TabsTrigger value="all" className="h-6 px-2.5 text-[10px] font-bold">Semua ({todaySubs.length})</TabsTrigger>
              {currentUser && myCount > 0 && (
                <TabsTrigger value="mine" className="h-6 px-2.5 text-[10px] font-bold">Punyaku ({myCount})</TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        </div>
        <div className="divide-y divide-border">
          {subsWithScore.map(({ sub: s, score }) => {
            const room = roomMap.get(s.roomId)
            const form = formMap.get(s.formId)
            const isMine = s.createdBy === currentUser
            return (
              <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                {score ? (
                  <ScoreBadge value={round1(score.final)} showMax={false} className="min-w-8 justify-center" />
                ) : (
                  <div className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground">
                    --
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-foreground/80">
                      {room?.name ?? s.roomId}
                    </p>
                    <span className="text-[10px] text-muted-foreground/30">&middot;</span>
                    <p className="text-[10px] text-muted-foreground">{form?.label ?? s.formId}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {s.auditor} &middot; {new Date(s.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {isMine && (
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">Kamu</span>
                )}
                {!isMine && s.createdBy && (
                  <span className="shrink-0 text-[10px] text-muted-foreground">@{s.createdBy}</span>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}