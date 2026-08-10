import { useState, useEffect, useMemo } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import {
  CalendarCheck,
  Check,
  ChevronRight,
  ClipboardList,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import RoomIcon from '../../components/ui/RoomIcon'
import { PageHeader } from '../../components/ui/page-header'
import { InteractiveCard } from '../../components/ui/interactive-card'
import ScoreBadge from '../../components/ui/ScoreBadge'
import { AuditDashboardSkeleton } from '../../components/ui/skeletons'
import { getRooms, getForms } from '../../server/functions/5r'
import { getSession } from '../../server/functions/auth'
import type { FiveRForm } from '../../data/5r'
import { isDekorasiSubmission } from '../../data/5r'
import { scoreSubmission, aggregateRoom, round1 } from '../../lib/scoring'
import { todayPrefix } from '../../lib/dateUtils'
import { useSubmissions } from '../../lib/queries'

const searchSchema = z.object({})

export const Route = createFileRoute('/audit/')({
  validateSearch: searchSchema,
  loader: async () => {
    const [rooms, forms] = await Promise.all([getRooms(), getForms()])
    return { rooms, forms }
  },
  component: AuditDashboardPage,
})

function AuditDashboardPage() {
  const { rooms, forms } = Route.useLoaderData()
  const navigate = useNavigate()
  const { data: submissions = [], isLoading } = useSubmissions()

  const [me, setMe] = useState<string | null>(null)
  useEffect(() => {
    void getSession().then((s) => setMe(s.username ?? null))
  }, [])

  const formMap = useMemo(() => new Map<string, FiveRForm>(forms.map((f) => [f.id, f])), [forms])
  const today = todayPrefix()

  // User-specific stats
  const mySubs = useMemo(() => submissions.filter((s) => s.createdBy === me), [submissions, me])
  const myTodaySubs = useMemo(
    () => mySubs.filter((s) => s.createdAt.startsWith(today)),
    [mySubs, today],
  )
  const myToday5RSubs = useMemo(
    () => myTodaySubs.filter((s) => !isDekorasiSubmission(s.formId)),
    [myTodaySubs],
  )
  const my5RRoomsTodayCount = useMemo(
    () => new Set(myToday5RSubs.map((s) => s.roomId)).size,
    [myToday5RSubs],
  )
  const myDekorasiRoomsCount = useMemo(
    () => new Set(mySubs.filter((s) => isDekorasiSubmission(s.formId)).map((s) => s.roomId)).size,
    [mySubs],
  )

  // Global team stats
  const todaySubs = useMemo(
    () => submissions.filter((s) => s.createdAt.startsWith(today)),
    [submissions, today],
  )
  const today5RSubs = useMemo(
    () => todaySubs.filter((s) => !isDekorasiSubmission(s.formId)),
    [todaySubs],
  )
  const roomsDoneTodayCount = useMemo(
    () => new Set(today5RSubs.map((s) => s.roomId)).size,
    [today5RSubs],
  )

  // Average 5R score
  const all5RScores = useMemo(
    () =>
      submissions
        .filter((s) => !isDekorasiSubmission(s.formId))
        .map((s) => {
          const form = formMap.get(s.formId)
          return form ? scoreSubmission(form, s) : null
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    [submissions, formMap],
  )
  const avg5RScore =
    all5RScores.length > 0
      ? round1(all5RScores.reduce((s, x) => s + x.final, 0) / all5RScores.length)
      : 0

  // Per-room calculations
  const roomStatus = useMemo(() => {
    return rooms.map((room) => {
      const roomSubs = submissions.filter((s) => s.roomId === room.id)
      const myRoomSubs = roomSubs.filter((s) => s.createdBy === me)
      const myTodayRoomSubs = myRoomSubs.filter((s) => s.createdAt.startsWith(today))
      const otherTodayRoomSubs = roomSubs.filter(
        (s) => s.createdBy !== me && s.createdAt.startsWith(today),
      )
      const myDekorasiDone = myRoomSubs.some((s) => isDekorasiSubmission(s.formId))

      const myTodayFormsList = myTodayRoomSubs.map((s) => {
        const f = formMap.get(s.formId)
        return f ? f.label.replace('Checklist 5R ', '') : s.formId
      })

      // Overall 5R score for this room
      const room5RScores = roomSubs
        .filter((s) => !isDekorasiSubmission(s.formId))
        .map((s) => {
          const form = formMap.get(s.formId)
          return form ? scoreSubmission(form, s) : null
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)

      const final5R = aggregateRoom(room5RScores)

      return {
        room,
        myTodayRoomSubs,
        otherTodayRoomSubs,
        myDekorasiDone,
        myTodayFormsList,
        hasMyActivityToday: myTodayRoomSubs.length > 0,
        hasOtherActivityToday: otherTodayRoomSubs.length > 0,
        room5RCount: room5RScores.length,
        final5R,
      }
    })
  }, [rooms, submissions, me, today, formMap])

  if (isLoading) return <AuditDashboardSkeleton />

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard Audit 5R"
        subtitle={formatLongDate(new Date())}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/audit/hasil' })}
              className="text-xs font-bold shrink-0 cursor-pointer"
            >
              <Trophy size={14} className="mr-1 text-amber-500" />
              Papan Hasil
            </Button>
            <Button
              size="sm"
              onClick={() => navigate({ to: '/audit/isi' })}
              className="text-xs font-bold shrink-0 shadow-xs cursor-pointer"
            >
              <ClipboardList size={14} className="mr-1.5" />
              Mulai Penilaian
            </Button>
          </div>
        }
      />

      {/* Personalized Auditor Greeting / Summary Banner */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/[0.02] to-transparent p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarCheck size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-foreground">
              {my5RRoomsTodayCount === rooms.length && myDekorasiRoomsCount === rooms.length && rooms.length > 0
                ? '🎉 Luar biasa! Seluruh ruangan telah selesai kamu nilai hari ini.'
                : `Status Pengisian Kamu: ${my5RRoomsTodayCount}/${rooms.length} ruang 5R telah dinilai hari ini.`}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {me ? `Login sebagai ${me}` : 'Auditor'} &middot; Total {todaySubs.length} form terisi oleh tim hari ini.
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate({ to: '/audit/isi' })}
          className="text-xs font-bold shrink-0 cursor-pointer"
        >
          Lanjut Isi Form
        </Button>
      </div>

      {/* 3 Synchronized Quick Status Cards (Matching /audit/isi) */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {/* Card 1: 5R Kamu */}
        <Card className="border-border/70 bg-card/80 shadow-2xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                5R Kamu Hari Ini
              </span>
              {my5RRoomsTodayCount === rooms.length && rooms.length > 0 ? (
                <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 px-1.5 py-0 text-[9px] font-bold">
                  Lengkap ✓
                </Badge>
              ) : (
                <span className="text-[10px] text-muted-foreground font-medium">
                  {myToday5RSubs.length} form terisi
                </span>
              )}
            </div>
            <p className="text-xl font-extrabold text-foreground tracking-tight">
              {my5RRoomsTodayCount}{' '}
              <span className="text-xs font-normal text-muted-foreground">/ {rooms.length} ruang</span>
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {my5RRoomsTodayCount === rooms.length && rooms.length > 0
                ? 'Semua ruangan sudah kamu nilai hari ini'
                : `Sisa ${rooms.length - my5RRoomsTodayCount} ruang belum kamu nilai hari ini`}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Dekorasi Kamu */}
        <Card className="border-border/70 bg-card/80 shadow-2xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Dekorasi Kamu
              </span>
              {myDekorasiRoomsCount === rooms.length && rooms.length > 0 ? (
                <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 px-1.5 py-0 text-[9px] font-bold">
                  Lengkap ✓
                </Badge>
              ) : (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold inline-flex items-center gap-1">
                  <Sparkles size={11} />
                  1x / ruang
                </span>
              )}
            </div>
            <p className="text-xl font-extrabold text-foreground tracking-tight">
              {myDekorasiRoomsCount}{' '}
              <span className="text-xs font-normal text-muted-foreground">/ {rooms.length} ruang</span>
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {myDekorasiRoomsCount === rooms.length && rooms.length > 0
                ? 'Seluruh dekorasi ruangan selesai kamu nilai'
                : `Sisa ${rooms.length - myDekorasiRoomsCount} ruang dekorasi belum kamu nilai`}
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Aktivitas Global Tim */}
        <Card className="border-border/70 bg-card/80 shadow-2xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Total Tim Hari Ini
              </span>
              <span className="text-[10px] text-primary font-bold">
                {roomsDoneTodayCount} ruang aktif
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xl font-extrabold text-foreground tracking-tight">
                {todaySubs.length}{' '}
                <span className="text-xs font-normal text-muted-foreground">penilaian</span>
              </p>
              {avg5RScore > 0 && (
                <span className="text-xs font-bold text-muted-foreground">
                  Rata-rata 5R: <strong className="text-foreground">{avg5RScore}</strong>
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              Dari seluruh juri & auditor hari ini
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Room Status List (Matching /audit/isi) */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold tracking-tight text-foreground">Status Ruangan Kerja</h2>
            <p className="text-xs text-muted-foreground">Klik kartu ruangan untuk langsung mengisi checklist penilaian.</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: '/audit/isi' })}
            className="text-xs font-bold text-primary cursor-pointer"
          >
            Lihat Semua Ruangan &rarr;
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roomStatus.map(
            ({
              room,
              myTodayRoomSubs,
              otherTodayRoomSubs,
              myDekorasiDone,
              myTodayFormsList,
              hasMyActivityToday,
              hasOtherActivityToday,
              room5RCount,
              final5R,
            }) => {
              return (
                <InteractiveCard
                  key={room.id}
                  onClick={() => navigate({ to: '/audit/isi', search: { room: room.id } })}
                  className={`group relative overflow-hidden transition-all border ${
                    hasMyActivityToday
                      ? 'border-emerald-500/40 bg-emerald-50/20 hover:border-emerald-500/60'
                      : hasOtherActivityToday
                        ? 'border-blue-500/30 bg-blue-50/10 hover:border-blue-500/50'
                        : 'border-border hover:border-primary/40 hover:shadow-xs'
                  }`}
                >
                  <CardContent className="p-3.5 space-y-2.5">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                          hasMyActivityToday
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-muted/70 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                        }`}
                      >
                        <RoomIcon name={room.icon} size={18} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="truncate font-bold text-foreground text-sm">{room.name}</h3>
                          {hasMyActivityToday ? (
                            <Badge
                              variant="outline"
                              className="bg-emerald-100 text-emerald-800 border-emerald-300 px-1.5 py-0 text-[9px] font-extrabold"
                            >
                              <Check size={9} className="mr-0.5 inline" />
                              Kamu ({myTodayRoomSubs.length} form)
                            </Badge>
                          ) : myDekorasiDone ? (
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-700 border-emerald-200 px-1.5 py-0 text-[9px] font-semibold"
                            >
                              Dekorasi ✓
                            </Badge>
                          ) : hasOtherActivityToday ? (
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200 px-1.5 py-0 text-[9px] font-medium"
                            >
                              {otherTodayRoomSubs.length}x Juri Lain
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-muted text-muted-foreground px-1.5 py-0 text-[9px]">
                              Belum dinilai
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground mt-0.5">PIC: {room.pic}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                        {room5RCount > 0 && (
                          <ScoreBadge value={round1(final5R)} showMax={false} className="min-w-8 justify-center font-bold" />
                        )}
                        <ChevronRight
                          size={16}
                          className="shrink-0 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
                        />
                      </div>
                    </div>

                    {/* Detailed Form Activity Summary Tag */}
                    {hasMyActivityToday && (
                      <div className="rounded-lg bg-emerald-100/60 px-2.5 py-1.5 text-[11px] text-emerald-900 flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold">Sudah kamu isi hari ini:</span>
                        <span className="text-emerald-800 truncate">{myTodayFormsList.join(', ')}</span>
                        {hasOtherActivityToday && (
                          <span className="text-[10px] text-emerald-700/80 font-medium">
                            (+ {otherTodayRoomSubs.length} juri lain)
                          </span>
                        )}
                      </div>
                    )}

                    {!hasMyActivityToday && hasOtherActivityToday && (
                      <div className="rounded-lg bg-blue-50/70 px-2.5 py-1 text-[11px] text-blue-800 flex items-center justify-between">
                        <span>Baru dinilai oleh juri lain hari ini</span>
                        <span className="font-bold">{otherTodayRoomSubs.length} form</span>
                      </div>
                    )}
                  </CardContent>
                </InteractiveCard>
              )
            },
          )}
        </div>
      </section>
    </div>
  )
}

function formatLongDate(d: Date): string {
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
