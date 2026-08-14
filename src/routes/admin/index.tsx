import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronRight,
  CircleCheck,
  ClipboardList,
  Cookie,
  GitFork,
  HelpCircle,
  Medal,
  Paintbrush,
  Sparkles,
  SquarePen,
  Trophy,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import RoomIcon from '~/components/5r/RoomIcon';
import EmptyState from '~/components/common/EmptyState';
import SectionHeader from '~/components/common/SectionHeader';
import {
  AdminDashboardSkeleton,
  ChartSkeleton,
  RoomListSkeleton,
  SectionCardsSkeleton,
} from '~/components/loading/skeletons';
import { Petunjuk5RModal } from '../../components/5r/Petunjuk5RModal';
import { ChartAreaInteractive } from '../../components/chart-area-interactive';
import { ChartBarStrength } from '../../components/chart-bar-strength';
import { SectionCards } from '../../components/section-cards';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { InteractiveCard } from '../../components/ui/interactive-card';
import { Progress } from '../../components/ui/progress';
import { Skeleton } from '../../components/ui/skeleton';
import { StatusBadge } from '../../components/ui/status-badge';
import type { FiveRForm, FiveRSubmission } from '../../data/5r';
import { isDekorasiSubmission } from '../../data/5r';
import { buildWeeklySeries, currentWeekNumber } from '../../lib/dateUtils';
import { useSubmissions } from '../../lib/queries';
import type { SubmissionScore } from '../../lib/scoring';
import { aggregateRoom, round1, scoreSubmission } from '../../lib/scoring';
import { useTodayLabel } from '../../lib/useTodayLabel';
import { getForms, getRooms, getSettings } from '../../server/functions/5r';

const searchSchema = z.object({
  room: z.string().optional(),
});

export const Route = createFileRoute('/admin/')({
  validateSearch: searchSchema,
  loader: async () => {
    const [rooms, forms, settings] = await Promise.all([getRooms(), getForms(), getSettings()]);
    return { rooms, forms, startDate: settings.startDate, endDate: settings.endDate };
  },
  component: AdminDashboardPage,
  pendingComponent: AdminDashboardSkeleton,
});

function AdminDashboardPage() {
  const { rooms, forms, startDate, endDate } = Route.useLoaderData();
  const navigate = useNavigate();
  const { data: submissions = [], isLoading } = useSubmissions();
  const [showGuide, setShowGuide] = useState(false);

  // Filter tab ruangan
  const [roomFilter, setRoomFilter] = useState<'all' | 'done' | 'attention'>('all');

  // Hydration-safe clock
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const formMap = useMemo(() => new Map<string, FiveRForm>(forms.map((f) => [f.id, f])), [forms]);
  const currentWeek = startDate ? currentWeekNumber(new Date(startDate)) : 0;
  const todayLabel = useTodayLabel(formatLongDate);
  const isCurrentWeek = (s: FiveRSubmission): boolean =>
    currentWeek > 0 && (s.weekNumber ?? 1) === currentWeek;

  // ── Hitung semua skor 5R (dekorasi TIDAK dicampur ke statistik 5R) ──
  const scored = useMemo(() => {
    const list: SubmissionScore[] = [];
    for (const s of submissions) {
      if (isDekorasiSubmission(s.formId)) continue;
      const form = formMap.get(s.formId);
      if (!form) continue;
      try {
        list.push(scoreSubmission(form, s));
      } catch {
        /* skip corrupt */
      }
    }
    return list;
  }, [submissions, formMap]);

  // ── Statistik utama ──
  const totalSubs = submissions.length;
  const avgScore =
    scored.length > 0 ? round1(scored.reduce((s, x) => s + x.final, 0) / scored.length) : 0;
  const roomsDone = new Set(
    submissions.filter((s) => !isDekorasiSubmission(s.formId)).map((s) => s.roomId)
  ).size;
  const coveragePct = rooms.length > 0 ? Math.round((roomsDone / rooms.length) * 100) : 0;
  const weekCount = submissions.filter((s) => isCurrentWeek(s)).length;

  // ── Room status (hanya 5R) ──
  const roomStatus = useMemo(() => {
    return rooms.map((room) => {
      const subs = submissions.filter(
        (s) => s.roomId === room.id && !isDekorasiSubmission(s.formId)
      );
      const scores = subs
        .map((s) => {
          const form = formMap.get(s.formId);
          return form ? scoreSubmission(form, s) : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);
      const final = aggregateRoom(scores);
      const last =
        subs.length > 0 ? subs.reduce((a, b) => (a.createdAt > b.createdAt ? a : b)) : null;
      return { room, count: subs.length, final, last };
    });
  }, [rooms, submissions, formMap]);

  // ── Top 3 Ruangan (Leaderboard Mini) ──
  const top3Rooms = useMemo(() => {
    return [...roomStatus]
      .filter((r) => r.count > 0)
      .sort((a, b) => b.final - a.final)
      .slice(0, 3);
  }, [roomStatus]);

  // ── Butuh perhatian ──
  const notRated = roomStatus.filter((r) => r.count === 0).length;
  const lowScore = roomStatus.filter((r) => r.count > 0 && r.final < 60).length;
  const attention = notRated + lowScore;

  const attentionRooms = useMemo(() => {
    return roomStatus.filter((r) => r.count === 0 || r.final < 60);
  }, [roomStatus]);

  // ── Filtered rooms ──
  const filteredRooms = useMemo(() => {
    if (roomFilter === 'done') return roomStatus.filter((r) => r.count > 0);
    if (roomFilter === 'attention') return roomStatus.filter((r) => r.count === 0 || r.final < 60);
    return roomStatus;
  }, [roomStatus, roomFilter]);

  // ── Kekuatan 5R per kategori ──
  const catStrength = useMemo(() => {
    const map = new Map<string, { label: string; total: number; count: number }>();
    for (const score of scored) {
      for (const c of score.categories) {
        const e = map.get(c.categoryId);
        if (e) {
          e.total += c.percent;
          e.count++;
        } else {
          map.set(c.categoryId, { label: c.label, total: c.percent, count: 1 });
        }
      }
    }
    return [...map.entries()]
      .map(([id, v]) => ({
        id,
        label: v.label.replace(/^[A-E]\.\s*/, ''),
        avg: v.count > 0 ? round1(v.total / v.count) : 0,
      }))
      .sort((a, b) => a.avg - b.avg);
  }, [scored]);

  // ── Aktivitas 5 terbaru ──
  const recent = [...submissions]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
    .map((s) => {
      const form = formMap.get(s.formId);
      const room = rooms.find((r) => r.id === s.roomId);
      const score = form ? scoreSubmission(form, s) : null;
      return { sub: s, form, room, score };
    });

  const calendar = useMemo(
    () =>
      buildWeeklySeries(
        submissions.filter((s) => !isDekorasiSubmission(s.formId)),
        startDate
      ),
    [submissions, startDate]
  );

  const avgLabel = avgScore >= 80 ? 'Baik' : avgScore >= 60 ? 'Cukup' : 'Perlu Perbaikan';

  const stats = [
    {
      label: 'Total Submisi Audit',
      value: String(totalSubs),
      action: (
        <Badge variant="outline" className="text-[11px] font-bold">
          <CircleCheck className="mr-1 size-3 text-emerald-500" />
          {weekCount > 0 ? `${weekCount} minggu ini` : 'Belum ada'}
        </Badge>
      ),
      footer: (
        <span className="text-muted-foreground">
          {weekCount > 0 ? 'Aktif dalam minggu ini' : 'Belum ada audit minggu ini'}
        </span>
      ),
    },
    {
      label: 'Rata-rata Skor 5R',
      value: totalSubs > 0 ? String(avgScore) : '--',
      action: totalSubs > 0 ? <StatusBadge score={avgScore}>{avgLabel}</StatusBadge> : undefined,
      footer: (
        <span className="text-muted-foreground">
          {totalSubs > 0 ? `Dari ${scored.length} audit 5R` : 'Belum ada data'}
        </span>
      ),
    },
    {
      label: 'Cakupan Audit Ruangan',
      value: `${roomsDone}/${rooms.length}`,
      action: (
        <Badge variant="outline" className="text-[11px] font-bold">
          <ClipboardList className="mr-1 size-3 text-primary" />
          {coveragePct}%
        </Badge>
      ),
      footer: (
        <Progress
          value={coveragePct}
          className="mt-1 h-1.5 [&_[data-slot=progress-indicator]]:bg-success"
        />
      ),
    },
    {
      label: 'Butuh Perhatian',
      value: String(attention),
      action: (
        <StatusBadge status={lowScore > 0 ? 'destructive' : notRated > 0 ? 'warning' : 'success'}>
          <AlertTriangle className="mr-1 size-3.5 inline" />
          {attention}
        </StatusBadge>
      ),
      footer: (
        <span className="text-muted-foreground">
          {attention === 0
            ? 'Semua ruangan aman'
            : notRated > 0 && lowScore > 0
              ? `${notRated} belum dinilai · ${lowScore} skor < 60`
              : notRated > 0
                ? `${notRated} ruangan belum dinilai`
                : `${lowScore} ruangan skor di bawah 60`}
        </span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-44 w-full rounded-3xl" />
        <SectionCardsSkeleton count={4} />
        <ChartSkeleton height={200} />
        <ChartSkeleton height={160} />
        <div className="space-y-2">
          <Skeleton className="h-4 w-28 rounded" />
          <RoomListSkeleton count={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── 1. Hero Executive Banner ── */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/10 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between relative z-10">
          <div className="space-y-2 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/10 text-primary font-bold text-xs px-2.5 py-0.5"
              >
                <Sparkles size={12} className="mr-1 animate-pulse" />
                HUT RI KE-81
              </Badge>
              <span className="text-xs text-muted-foreground font-medium">{todayLabel}</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-heading font-black tracking-tight text-foreground">
              Dashboard Audit &amp; Kinerja 5R
            </h1>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {periodLabel(startDate, endDate)}. Pantau skor kebersihan, keteraturan, dan kesiapan
              lomba ruangan kantor secara terpusat.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGuide(true)}
              className="text-xs font-bold rounded-xl cursor-pointer bg-background/80"
            >
              <HelpCircle size={14} className="mr-1 text-primary" />
              Petunjuk 5R
            </Button>
            <Button
              onClick={() => navigate({ to: '/admin/isi' })}
              variant="outline"
              size="sm"
              className="text-xs font-bold rounded-xl bg-background/80 cursor-pointer"
            >
              <SquarePen size={14} className="mr-1.5 text-primary" />
              Isi Audit 5R
            </Button>
            <Button
              onClick={() => navigate({ to: '/admin/isi', search: { form: 'dekorasi' } })}
              size="sm"
              className="text-xs font-bold rounded-xl shadow-xs cursor-pointer"
            >
              <Paintbrush size={14} className="mr-1.5" />
              Nilai Dekorasi
            </Button>
          </div>
        </div>

        {/* Decorative subtle background glow */}
        <div className="pointer-events-none absolute -right-10 -bottom-10 size-48 rounded-full bg-primary/10 blur-3xl" />
      </div>

      {/* ── 2. Quick Navigation Shortcut Cards ── */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        <button
          type="button"
          onClick={() => navigate({ to: '/admin/hasil' })}
          className="flex items-center gap-3 p-3.5 rounded-2xl border border-border/80 bg-card hover:bg-muted/40 transition text-left group cursor-pointer shadow-2xs"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
            <Trophy size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-bold text-foreground truncate">
              Hasil &amp; Ranking
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Papan Peringkat</p>
          </div>
          <ChevronRight
            size={14}
            className="text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0"
          />
        </button>

        <button
          type="button"
          onClick={() => navigate({ to: '/admin/isi' })}
          className="flex items-center gap-3 p-3.5 rounded-2xl border border-border/80 bg-card hover:bg-muted/40 transition text-left group cursor-pointer shadow-2xs"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
            <SquarePen size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-bold text-foreground truncate">Form Audit 5R</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Penilaian Baru</p>
          </div>
          <ChevronRight
            size={14}
            className="text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0"
          />
        </button>

        <button
          type="button"
          onClick={() => navigate({ to: '/admin/bagan' })}
          className="flex items-center gap-3 p-3.5 rounded-2xl border border-border/80 bg-card hover:bg-muted/40 transition text-left group cursor-pointer shadow-2xs"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
            <GitFork size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-bold text-foreground truncate">Bagan Lomba</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Pertandingan</p>
          </div>
          <ChevronRight
            size={14}
            className="text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0"
          />
        </button>

        <button
          type="button"
          onClick={() => navigate({ to: '/snack/distribution' })}
          className="flex items-center gap-3 p-3.5 rounded-2xl border border-border/80 bg-card hover:bg-muted/40 transition text-left group cursor-pointer shadow-2xs"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
            <Cookie size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-bold text-foreground truncate">
              Distribusi Snack
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              Scan &amp; Pengambilan
            </p>
          </div>
          <ChevronRight
            size={14}
            className="text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0"
          />
        </button>
      </div>

      {/* ── 3. High-level Metric Section Cards ── */}
      <SectionCards stats={stats} />

      {/* ── 4. Mini Leaderboard (Top 3 Ruangan 5R) ── */}
      <Card className="rounded-2xl border border-border/80 shadow-2xs overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold font-heading text-foreground flex items-center gap-2">
                <Trophy size={18} className="text-amber-500" />
                <span>Leaderboard Ruangan Terbaik 5R</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                3 Ruangan dengan nilai audit tertinggi saat ini
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: '/admin/hasil' })}
              className="text-xs font-bold text-primary hover:text-primary cursor-pointer"
            >
              Lihat Semua <ArrowRight size={13} className="ml-1" />
            </Button>
          </div>

          {top3Rooms.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border/60">
              Belum ada penilaian 5R tercatat. Lakukan audit pertama untuk menampilkan peringkat
              terbaik!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {top3Rooms.map((r, idx) => {
                const medalCfg =
                  idx === 0
                    ? {
                        bg: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
                        badge: '🥇 Juara 1',
                        icon: Medal,
                      }
                    : idx === 1
                      ? {
                          bg: 'bg-slate-400/15 text-slate-700 dark:text-slate-300 border-slate-400/30',
                          badge: '🥈 Juara 2',
                          icon: Award,
                        }
                      : {
                          bg: 'bg-amber-700/10 text-amber-800 dark:text-amber-400 border-amber-700/30',
                          badge: '🥉 Juara 3',
                          icon: Award,
                        };

                return (
                  <div
                    key={r.room.id}
                    onClick={() => navigate({ to: '/admin/isi', search: { room: r.room.id } })}
                    className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border ${medalCfg.bg} transition hover:scale-[1.01] cursor-pointer`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background shadow-2xs font-extrabold text-sm">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black truncate text-foreground">{r.room.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{r.room.pic}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-base font-black font-heading tabular-nums text-foreground">
                        {round1(r.final)}
                      </p>
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {medalCfg.badge}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 5. Split Section: 5R Strength & Attention List ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Kekuatan 5R per Kategori */}
        {catStrength.length === 0 ? (
          <Card className="rounded-2xl border border-border/80">
            <CardContent className="p-4 sm:p-5">
              <SectionHeader
                title="Kekuatan 5R per Kategori"
                subtext="Rata-rata skor semua kriteria"
              />
              <EmptyState
                title="Belum ada data evaluasi."
                hint="Isi penilaian pertama untuk melihat analisa kekuatan 5R."
                action={
                  <Button
                    size="sm"
                    onClick={() => navigate({ to: '/admin/isi' })}
                    className="rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Mulai Audit 5R
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <ChartBarStrength data={catStrength} />
        )}

        {/* Right: Daftar Ruangan Butuh Perhatian */}
        <Card className="rounded-2xl border border-border/80 shadow-2xs flex flex-col">
          <CardContent className="p-4 sm:p-5 flex-1 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-extrabold font-heading text-foreground flex items-center gap-2">
                  <AlertTriangle size={17} className="text-amber-500" />
                  <span>Ruangan Perlu Tindakan</span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Ruangan belum dinilai atau skor &lt; 60
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-bold">
                {attentionRooms.length} ruangan
              </Badge>
            </div>

            {attentionRooms.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                <CheckCircle2 size={24} className="text-emerald-500" />
                <p className="font-bold text-foreground text-sm">
                  Semua Ruangan Ter-audit dengan Baik!
                </p>
                <p>
                  Seluruh ruangan kantor telah dinilai dan memiliki skor di atas standar minimum
                  (60).
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[310px] overflow-y-auto pr-1">
                {attentionRooms.map(({ room, count, final }) => {
                  const isUnrated = count === 0;
                  return (
                    <div
                      key={room.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/40 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isUnrated ? 'bg-amber-500/10 text-amber-600' : 'bg-destructive/10 text-destructive'}`}
                        >
                          <RoomIcon name={room.icon} size={15} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold truncate text-foreground">
                            {room.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {room.pic} ·{' '}
                            {isUnrated
                              ? 'Belum pernah dinilai'
                              : `Skor: ${round1(final)} (Perlu perbaikan)`}
                          </p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate({ to: '/admin/isi', search: { room: room.id } })}
                        className="shrink-0 h-8 text-xs font-bold rounded-xl cursor-pointer"
                      >
                        Audit
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 6. Weekly Trend Chart ── */}
      <ChartAreaInteractive
        data={calendar}
        subtitle="Jumlah penilaian per minggu"
        showRange={false}
      />

      {/* ── 7. Status Ruangan (Filterable Grid) ── */}
      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SectionHeader
            title="Status &amp; Daftar Ruangan"
            subtext="Klik pada kartu ruangan untuk mengisi audit"
          />

          {/* Filter Tab Segment */}
          <div className="inline-flex items-center p-1 bg-muted/60 rounded-xl border border-border/80 text-xs font-bold shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setRoomFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${roomFilter === 'all' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Semua ({rooms.length})
            </button>
            <button
              type="button"
              onClick={() => setRoomFilter('done')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${roomFilter === 'done' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Dinilai ({roomsDone})
            </button>
            <button
              type="button"
              onClick={() => setRoomFilter('attention')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${roomFilter === 'attention' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Perhatian ({attention})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRooms.map(({ room, count, final, last }) => {
            const done = count > 0;
            return (
              <InteractiveCard
                key={room.id}
                onClick={() => navigate({ to: '/admin/isi', search: { room: room.id } })}
              >
                <CardContent className="flex items-center gap-3 p-3.5 sm:p-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      done ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground/60'
                    }`}
                  >
                    <RoomIcon name={room.icon} size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-foreground text-xs sm:text-sm">
                      {room.name}
                    </p>
                    <p className="truncate text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                      {room.pic}
                      {done && last ? ` · ${timeAgo(last.createdAt, now)}` : ' · Belum dinilai'}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge score={done ? round1(final) : null} />
                  </div>
                </CardContent>
              </InteractiveCard>
            );
          })}
        </div>
      </section>

      {/* ── 8. Recent Audit Log Activity ── */}
      {recent.length > 0 && (
        <section className="space-y-3">
          <SectionHeader
            title="Log Aktivitas Audit Terakhir"
            subtext="5 penilaian terbaru oleh tim audit"
          />
          <Card className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/80 shadow-2xs">
            {recent.map(({ sub, form, room, score }) => {
              return (
                <div
                  key={sub.id}
                  className="flex items-center justify-between gap-3 px-3.5 sm:px-4 py-3 hover:bg-muted/20 transition"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                      {room?.name}
                      <span className="mx-1 text-muted-foreground/40">/</span>
                      <span className="text-muted-foreground font-normal">{form?.label}</span>
                    </p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground truncate mt-0.5">
                      Auditor: <strong className="text-foreground">{sub.auditor}</strong> ·{' '}
                      {timeAgo(sub.createdAt, now)}
                    </p>
                  </div>
                  {score && (
                    <div className="shrink-0">
                      <StatusBadge score={round1(score.final)} showScoreMax />
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        </section>
      )}

      {/* ── 9. Forms Reference ── */}
      <Card className="rounded-2xl border border-border/80 shadow-2xs">
        <CardContent className="p-3.5 sm:p-4">
          <SectionHeader
            title="Daftar Form &amp; Checklist 5R"
            subtext="Jumlah kriteria per form penilaian aktif"
          />
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {forms
              .filter((f) => f.enabled !== false)
              .map((f) => {
                const total = f.categories.reduce((s, c) => s + c.criteria.length, 0);
                return (
                  <div
                    key={f.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-border/60 bg-muted/20 text-xs"
                  >
                    <span className="text-foreground font-semibold truncate flex-1 min-w-0">
                      {f.label}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-bold shrink-0">
                      {total} kriteria
                    </Badge>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      <Petunjuk5RModal open={showGuide} onOpenChange={setShowGuide} />
    </div>
  );
}

// ── helpers ──

function formatLongDate(d: Date): string {
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function periodLabel(startDate: string | null, endDate: string | null): string {
  if (startDate && endDate) {
    const fmt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `Masa penilaian ${new Date(startDate).toLocaleDateString('id-ID', fmt)} - ${new Date(endDate).toLocaleDateString('id-ID', fmt)}`;
  }
  return 'Periode penilaian belum diatur';
}

function timeAgo(iso: string, now: number | null): string {
  if (now === null) return '';
  const diff = now - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'Baru saja';
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  return `${day} hari lalu`;
}
