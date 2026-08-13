import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronRight,
  ClipboardList,
  HelpCircle,
  Sparkles,
  Trophy,
  UserCheck,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import RoomIcon from '~/components/5r/RoomIcon';
import ScoreBadge from '~/components/5r/ScoreBadge';
import { AuditDashboardSkeleton } from '~/components/loading/skeletons';
import { Petunjuk5RModal } from '../../components/5r/Petunjuk5RModal';
import RiwayatMingguIni from '../../components/5r/RiwayatMingguIni';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { InteractiveCard } from '../../components/ui/interactive-card';
import { PageHeader } from '../../components/ui/page-header';
import { Progress } from '../../components/ui/progress';
import type { FiveRForm } from '../../data/5r';
import { currentWeekNumber } from '../../lib/dateUtils';
import { useSubmissions } from '../../lib/queries';
import { aggregateRoom, round1, scoreSubmission } from '../../lib/scoring';
import { useTodayLabel } from '../../lib/useTodayLabel';
import { getForms, getRooms, getSettings } from '../../server/functions/5r';
import { getSession } from '../../server/functions/auth';

const searchSchema = z.object({});

export const Route = createFileRoute('/audit/')({
  validateSearch: searchSchema,
  loader: async () => {
    const [rooms, forms, settings] = await Promise.all([getRooms(), getForms(), getSettings()]);
    return { rooms, forms, startDate: settings.startDate };
  },
  component: AuditDashboardPage,
  pendingComponent: AuditDashboardSkeleton,
});

function AuditDashboardPage() {
  const { rooms, forms, startDate } = Route.useLoaderData();
  const navigate = useNavigate();
  const { data: submissions = [], isLoading } = useSubmissions();
  const [showGuide, setShowGuide] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'unrated' | 'done'>('all');

  const [me, setMe] = useState<string | null>(null);
  useEffect(() => {
    void getSession().then((s) => setMe(s.username ?? null));
  }, []);

  const formMap = useMemo(() => new Map<string, FiveRForm>(forms.map((f) => [f.id, f])), [forms]);
  const currentWeek = startDate ? currentWeekNumber(new Date(startDate)) : 0;
  // Hydration-safe: new Date() server ≠ client (timezone) → label diisi post-hydration.
  const todayLabel = useTodayLabel(formatLongDate);

  const isCurrentWeek = useCallback(
    (s: { weekNumber?: number }): boolean => currentWeek > 0 && (s.weekNumber ?? 1) === currentWeek,
    [currentWeek]
  );

  // Dekorasi: submission milik SAYA (kapan pun) — sekali per ruangan per auditor.
  const myDekorasiRooms = useMemo(() => {
    const s = new Set<string>();
    for (const sub of submissions) {
      if (sub.formId === 'dekorasi' && sub.createdBy === me) s.add(sub.roomId);
    }
    return s;
  }, [submissions, me]);

  // Global team stats for current week
  const weekSubs = useMemo(
    () => submissions.filter((s) => isCurrentWeek(s)),
    [submissions, isCurrentWeek]
  );

  // Status counts logic (Done vs Unrated)
  const roomStatusCounts = useMemo(() => {
    let done = 0;
    let unrated = 0;
    for (const r of rooms) {
      const has5R = submissions.some(
        (s) =>
          s.roomId === r.id && s.createdBy === me && isCurrentWeek(s) && s.formId !== 'dekorasi'
      );
      const hasDekorasi = myDekorasiRooms.has(r.id);
      if (has5R && hasDekorasi) {
        done++;
      } else {
        unrated++;
      }
    }
    return { done, unrated };
  }, [rooms, submissions, me, isCurrentWeek, myDekorasiRooms]);

  const completionPercentage =
    rooms.length > 0 ? Math.round((roomStatusCounts.done / rooms.length) * 100) : 0;

  // Highest scoring room overall 5R
  const topRoomInfo = useMemo(() => {
    let bestRoomName = '-';
    let maxScore = -1;

    for (const r of rooms) {
      const rSubs = submissions.filter((s) => s.roomId === r.id && s.formId !== 'dekorasi');
      const rScores = rSubs
        .map((s) => {
          const f = formMap.get(s.formId);
          return f ? scoreSubmission(f, s) : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      const final5R = aggregateRoom(rScores);
      if (final5R > maxScore) {
        maxScore = final5R;
        bestRoomName = r.name;
      }
    }

    return { name: bestRoomName, score: maxScore > -1 ? round1(maxScore) : 0 };
  }, [rooms, submissions, formMap]);

  // Per-room detailed calculations for Stage 1 grid
  const roomStatusList = useMemo(() => {
    return rooms.map((room) => {
      const roomSubs = submissions.filter((s) => s.roomId === room.id);
      const myRoomSubs = roomSubs.filter((s) => s.createdBy === me);
      const myWeekRoomSubs = myRoomSubs.filter((s) => isCurrentWeek(s));
      const otherWeekRoomSubs = roomSubs.filter((s) => s.createdBy !== me && isCurrentWeek(s));

      const hasMy5R = myWeekRoomSubs.some((s) => s.formId !== 'dekorasi');
      const hasMyDekorasi = myDekorasiRooms.has(room.id);

      const isDone = hasMy5R && hasMyDekorasi;
      const isWarning = (hasMy5R && !hasMyDekorasi) || (!hasMy5R && hasMyDekorasi);

      const myPeriodFormsList: string[] = [];
      if (hasMy5R) {
        const f5r = myWeekRoomSubs.find((s) => s.formId !== 'dekorasi');
        const formLabel = f5r ? formMap.get(f5r.formId)?.label : '';
        myPeriodFormsList.push(formLabel || '5R');
      }
      if (hasMyDekorasi) {
        myPeriodFormsList.push('Lomba Dekorasi');
      }

      // Overall 5R score for this room
      const room5RScores = roomSubs
        .filter((s) => s.formId !== 'dekorasi')
        .map((s) => {
          const form = formMap.get(s.formId);
          return form ? scoreSubmission(form, s) : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      const final5R = aggregateRoom(room5RScores);

      return {
        room,
        isDone,
        isWarning,
        hasMy5R,
        hasMyDekorasi,
        myPeriodFormsList,
        otherWeekRoomSubsCount: otherWeekRoomSubs.length,
        hasOtherActivityWeek: otherWeekRoomSubs.length > 0,
        room5RCount: room5RScores.length,
        final5R,
      };
    });
  }, [rooms, submissions, me, isCurrentWeek, myDekorasiRooms, formMap]);

  const filteredRoomStatusList = useMemo(() => {
    if (statusFilter === 'done') {
      return roomStatusList.filter((item) => item.isDone);
    }
    if (statusFilter === 'unrated') {
      return roomStatusList.filter((item) => !item.isDone);
    }
    return roomStatusList;
  }, [roomStatusList, statusFilter]);

  if (isLoading) return <AuditDashboardSkeleton />;

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-0">
      <PageHeader
        title="Dashboard Auditor 5R"
        subtitle={todayLabel}
        action={
          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
            <RiwayatMingguIni startDate={startDate} variant="button" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGuide(true)}
              className="text-xs font-bold shrink-0 cursor-pointer shadow-2xs h-9 px-2.5"
            >
              <HelpCircle size={14} className="text-primary sm:mr-1" />
              <span className="hidden sm:inline">Petunjuk</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/audit/hasil' })}
              className="text-xs font-bold shrink-0 cursor-pointer shadow-2xs h-9 px-2.5"
            >
              <Trophy size={14} className="text-amber-500 sm:mr-1" />
              <span className="hidden sm:inline">Papan Hasil</span>
            </Button>
            <Button
              size="sm"
              onClick={() => navigate({ to: '/audit/isi' })}
              className="hidden sm:flex text-xs font-bold shrink-0 shadow-xs cursor-pointer h-9 px-3.5 bg-gradient-to-r from-brand-red to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white"
            >
              <ClipboardList size={14} className="mr-1.5" />
              <span>+ Mulai Penilaian</span>
            </Button>
          </div>
        }
      />

      {/* Hero Auditor Welcome & Progress Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-rose-50/40 to-amber-50/30 p-3.5 sm:p-5 shadow-xs dark:border-primary/30 dark:bg-slate-900/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-red to-rose-600 text-white shadow-sm">
              <UserCheck size={20} className="sm:size-[22px]" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm sm:text-base font-extrabold text-foreground tracking-tight">
                  Halo, {me || 'Auditor'}! 👋
                </h2>
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5"
                >
                  Minggu ke-{currentWeek || 1}
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed max-w-xl">
                {roomStatusCounts.unrated === 0 ? (
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <Sparkles size={13} className="text-amber-500 inline shrink-0" />
                    Luar biasa! Seluruh ({rooms.length}) ruangan telah lengkap kamu nilai minggu
                    ini.
                  </span>
                ) : (
                  <span>
                    Audit lengkap{' '}
                    <strong className="text-foreground">{roomStatusCounts.done}</strong> dari{' '}
                    <strong className="text-foreground">{rooms.length}</strong> ruang. Sisa{' '}
                    <strong className="text-amber-600 dark:text-amber-400">
                      {roomStatusCounts.unrated} ruang
                    </strong>{' '}
                    perlu dilengkapi.
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <div className="bg-card/90 border border-border/80 rounded-xl p-2.5 sm:p-3 shadow-2xs min-w-full sm:min-w-[200px] space-y-1">
              <div className="flex items-center justify-between text-[11px] sm:text-xs">
                <span className="font-bold text-muted-foreground">Progres Audit Kamu</span>
                <span className="font-black text-primary">{completionPercentage}%</span>
              </div>
              <Progress value={completionPercentage} className="h-2 bg-muted" />
            </div>

            <Button
              type="button"
              onClick={() => navigate({ to: '/audit/isi' })}
              className="text-xs font-extrabold shadow-xs cursor-pointer h-9 sm:h-11 px-3.5 sm:px-4 gap-1.5"
            >
              <span>Lanjut Audit</span>
              <ArrowUpRight size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* 4 Auditor KPI Metric Cards */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {/* KPI 1: Ruangan Selesai */}
        <Card className="border-border/70 bg-card shadow-2xs hover:border-emerald-500/40 transition-colors">
          <CardContent className="p-3 sm:p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Audit Selesai
              </span>
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                <Check size={13} className="sm:size-[14px]" />
              </div>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {roomStatusCounts.done}{' '}
                <span className="text-xs font-normal text-muted-foreground">/ {rooms.length}</span>
              </p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate mt-0.5">
                Ruangan lengkap kamu
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Perlu Audit */}
        <Card className="border-border/70 bg-card shadow-2xs hover:border-amber-400/40 transition-colors">
          <CardContent className="p-3 sm:p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Perlu Audit
              </span>
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                <ClipboardList size={13} className="sm:size-[14px]" />
              </div>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-400 tracking-tight">
                {roomStatusCounts.unrated}{' '}
                <span className="text-xs font-normal text-muted-foreground">ruang</span>
              </p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate mt-0.5">
                Belum kamu selesaikan
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Aktivitas Tim */}
        <Card className="border-border/70 bg-card shadow-2xs hover:border-blue-500/40 transition-colors">
          <CardContent className="p-3 sm:p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Audit Tim
              </span>
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                <Users size={13} className="sm:size-[14px]" />
              </div>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {weekSubs.length}{' '}
                <span className="text-xs font-normal text-muted-foreground">form</span>
              </p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate mt-0.5">
                Seluruh juri minggu ini
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Ruangan Tertinggi */}
        <Card className="border-border/70 bg-card shadow-2xs hover:border-purple-500/40 transition-colors">
          <CardContent className="p-3 sm:p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Top 5R
              </span>
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                <Trophy size={13} className="sm:size-[14px]" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-1">
                <p className="text-xs sm:text-sm font-extrabold text-foreground truncate">
                  {topRoomInfo.name}
                </p>
                {topRoomInfo.score > 0 && (
                  <ScoreBadge
                    value={topRoomInfo.score}
                    showMax={false}
                    className="text-[10px] sm:text-[11px] font-black"
                  />
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate mt-0.5">
                Skor 5R tertinggi
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Section: Interactive Room Status Grid */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <BarChart3 size={17} className="text-primary shrink-0" />
              <span>Status Penilaian Ruangan Kerja</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
              Pilih kartu ruangan di bawah untuk membuka form checklist dan memulai penilaian.
            </p>
          </div>

          {/* Touch-Friendly Horizontally Scrollable Filter Chips */}
          <div className="flex overflow-x-auto no-scrollbar py-0.5 gap-1 w-full sm:w-auto shrink-0 border border-border/80 bg-muted/50 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-lg transition shrink-0 cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-card text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Semua ({rooms.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('unrated')}
              className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-lg transition shrink-0 cursor-pointer ${
                statusFilter === 'unrated'
                  ? 'bg-card text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Belum Kamu Isi ({roomStatusCounts.unrated})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('done')}
              className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-lg transition shrink-0 cursor-pointer ${
                statusFilter === 'done'
                  ? 'bg-card text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sudah Kamu Isi ({roomStatusCounts.done}) ✓
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRoomStatusList.map(
            ({
              room,
              isDone,
              isWarning,
              hasMy5R,
              myPeriodFormsList,
              otherWeekRoomSubsCount,
              hasOtherActivityWeek,
              room5RCount,
              final5R,
            }) => {
              return (
                <InteractiveCard
                  key={room.id}
                  onClick={() => navigate({ to: '/audit/isi', search: { room: room.id } })}
                  className={`group relative overflow-hidden transition-all border active:scale-[0.98] ${
                    isDone
                      ? 'border-emerald-500/40 bg-emerald-50/20 hover:border-emerald-500/60'
                      : isWarning
                        ? 'border-amber-400/50 bg-amber-50/15 hover:border-amber-400/70'
                        : 'border-border hover:border-primary/40 hover:shadow-xs'
                  }`}
                >
                  <CardContent className="p-3.5 space-y-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                          isDone
                            ? 'bg-emerald-100/80 border-emerald-300/80 text-emerald-800'
                            : isWarning
                              ? 'bg-amber-100/80 border-amber-300/80 text-amber-800'
                              : 'bg-muted/60 border-border/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                        }`}
                      >
                        <RoomIcon name={room.icon} size={19} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="truncate font-bold text-foreground text-sm">
                            {room.name}
                          </h4>
                          {isDone ? (
                            <Badge
                              variant="outline"
                              className="bg-emerald-100 text-emerald-800 border-emerald-300 px-1.5 py-0 text-[9px] font-extrabold"
                            >
                              <Check size={9} className="mr-0.5 inline" />
                              Lengkap ✓
                            </Badge>
                          ) : isWarning ? (
                            <Badge
                              variant="outline"
                              className="bg-amber-100 text-amber-900 border-amber-300 px-1.5 py-0 text-[9px] font-extrabold"
                            >
                              Belum Lengkap
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-muted/80 text-muted-foreground px-1.5 py-0 text-[9px]"
                            >
                              Belum kamu isi
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground mt-0.5">PIC: {room.pic}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                        {room5RCount > 0 && (
                          <ScoreBadge
                            value={round1(final5R)}
                            showMax={false}
                            className="min-w-8 justify-center font-extrabold text-xs"
                          />
                        )}
                        <ChevronRight
                          size={16}
                          className="shrink-0 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
                        />
                      </div>
                    </div>

                    {/* Clear distinction between KAMU vs JURI LAIN */}
                    <div className="space-y-1.5 pt-1 border-t border-border/40">
                      {/* Block 1: Isian KAMU */}
                      {isDone ? (
                        <div className="rounded-xl bg-emerald-100/70 p-2 text-[11px] text-emerald-950 border border-emerald-200/80">
                          <div className="flex items-center gap-1 font-extrabold text-emerald-900">
                            <UserCheck size={12} className="text-emerald-700 shrink-0" />
                            <span>Sudah Kamu Isi (Lengkap):</span>
                          </div>
                          <p className="text-[11px] font-semibold text-emerald-800 mt-0.5 truncate pl-4">
                            {myPeriodFormsList.join(', ')}
                          </p>
                        </div>
                      ) : isWarning ? (
                        <div className="rounded-xl bg-amber-100/70 p-2 text-[11px] text-amber-950 border border-amber-200/80">
                          <div className="flex items-center gap-1 font-extrabold text-amber-900">
                            <UserCheck size={12} className="text-amber-700 shrink-0" />
                            <span>Sudah Kamu Isi (Sebagian):</span>
                          </div>
                          <p className="text-[11px] font-semibold text-amber-800 mt-0.5 truncate pl-4">
                            {myPeriodFormsList.join(', ')}
                          </p>
                          <p className="text-[10px] text-amber-800 pl-4 mt-0.5 font-medium italic">
                            Belum lengkap (Perlu {!hasMy5R ? '5R' : 'Dekorasi'})
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-xl bg-muted/40 p-2 text-[11px] text-muted-foreground border border-border/40 flex items-center justify-between">
                          <span>Belum kamu isi minggu ini</span>
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            Perlu dinilai
                          </span>
                        </div>
                      )}

                      {/* Block 2: Isian AUDITOR LAIN (Global) */}
                      {hasOtherActivityWeek ? (
                        <div className="rounded-xl bg-blue-50/80 px-2.5 py-1.5 text-[11px] text-blue-900 border border-blue-200/60 flex items-center justify-between">
                          <span className="font-medium text-blue-800 flex items-center gap-1">
                            <Users size={12} className="text-blue-600 shrink-0" />
                            <span>Auditor lain minggu ini:</span>
                          </span>
                          <span className="font-extrabold text-blue-900 bg-white/80 px-1.5 py-0.5 rounded-md border border-blue-200/60 text-[10px]">
                            {otherWeekRoomSubsCount} form
                          </span>
                        </div>
                      ) : (
                        <div className="px-2 py-0.5 text-[10px] text-muted-foreground/60 italic">
                          Belum ada audit dari juri lain minggu ini
                        </div>
                      )}
                    </div>
                  </CardContent>
                </InteractiveCard>
              );
            }
          )}
        </div>
      </section>

      {/* Mobile Floating Sticky CTA Button */}
      <div className="fixed bottom-4 left-4 right-4 z-40 sm:hidden">
        <Button
          type="button"
          onClick={() => navigate({ to: '/audit/isi' })}
          className="w-full h-12 rounded-2xl bg-gradient-to-r from-brand-red to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-black text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <ClipboardList size={16} />
          <span>+ Mulai Audit Ruangan</span>
        </Button>
      </div>

      <Petunjuk5RModal open={showGuide} onOpenChange={setShowGuide} variant="audit" />
    </div>
  );
}

function formatLongDate(d: Date): string {
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
