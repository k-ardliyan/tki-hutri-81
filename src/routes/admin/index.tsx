import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { CircleCheck, ClipboardList, Paintbrush, SquarePen, TriangleAlert } from 'lucide-react';
import { useMemo } from 'react';
import { z } from 'zod';
import { ChartAreaInteractive } from '../../components/chart-area-interactive';
import { ChartBarStrength } from '../../components/chart-bar-strength';
import { SectionCards } from '../../components/section-cards';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import EmptyState from '../../components/ui/EmptyState';
import { InteractiveCard } from '../../components/ui/interactive-card';
import { PageHeader } from '../../components/ui/page-header';
import { Progress } from '../../components/ui/progress';
import RoomIcon from '../../components/ui/RoomIcon';
import SectionHeader from '../../components/ui/SectionHeader';
import { Skeleton } from '../../components/ui/skeleton';
import {
  ActivityListSkeleton,
  ChartSkeleton,
  RoomListSkeleton,
  SectionCardsSkeleton,
} from '../../components/ui/skeletons';
import { StatusBadge } from '../../components/ui/status-badge';
import type { FiveRForm, FiveRSubmission } from '../../data/5r';
import { isDekorasiSubmission } from '../../data/5r';
import { useSubmissions } from '../../lib/queries';
import type { SubmissionScore } from '../../lib/scoring';
import { aggregateRoom, round1, scoreSubmission } from '../../lib/scoring';
import { getForms, getRooms } from '../../server/functions/5r';

const searchSchema = z.object({
  room: z.string().optional(),
});

export const Route = createFileRoute('/admin/')({
  validateSearch: searchSchema,
  loader: async () => {
    const [rooms, forms] = await Promise.all([getRooms(), getForms()]);
    return { rooms, forms };
  },
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const { rooms, forms } = Route.useLoaderData();
  const navigate = useNavigate();
  const { data: submissions = [], isLoading } = useSubmissions();

  const formMap = useMemo(() => new Map<string, FiveRForm>(forms.map((f) => [f.id, f])), [forms]);

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
        // data korup — skip
      }
    }
    return list;
  }, [submissions, formMap]);

  // ── Statistik utama ──
  const totalSubs = submissions.length;
  const avgScore =
    scored.length > 0 ? round1(scored.reduce((s, x) => s + x.final, 0) / scored.length) : 0;
  const roomsDone = new Set(submissions.map((s) => s.roomId)).size;
  const coveragePct = rooms.length > 0 ? Math.round((roomsDone / rooms.length) * 100) : 0;

  const todayKey = new Date().toDateString();
  const todayCount = submissions.filter(
    (s) => new Date(s.createdAt).toDateString() === todayKey
  ).length;

  // ── Room status (hanya 5R — dekorasi tidak dicampur) ──
  const roomStatus = rooms.map((room) => {
    const subs = submissions.filter((s) => s.roomId === room.id && !isDekorasiSubmission(s.formId));
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

  // ── Butuh perhatian ──
  const notRated = roomStatus.filter((r) => r.count === 0).length;
  const lowScore = roomStatus.filter((r) => r.count > 0 && r.final < 60).length;
  const attention = notRated + lowScore;

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
      .sort((a, b) => a.avg - b.avg); // terlemah dulu
  }, [scored]);

  // ── Aktivitas (5 terakhir) ──
  const recent = [...submissions]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
    .map((s) => {
      const form = formMap.get(s.formId);
      const room = rooms.find((r) => r.id === s.roomId);
      const score = form ? scoreSubmission(form, s) : null;
      return { sub: s, form, room, score };
    });

  const calendar = useMemo(() => buildDailySeries(submissions), [submissions]);

  const avgLabel = avgScore >= 80 ? 'Baik' : avgScore >= 60 ? 'Cukup' : 'Perlu Perbaikan';

  const stats = [
    {
      label: 'Total Penilaian',
      value: String(totalSubs),
      action: (
        <Badge variant="outline">
          <CircleCheck className="mr-1 size-3.5" />
          {todayCount > 0 ? `${todayCount} hari ini` : 'Belum ada'}
        </Badge>
      ),
      footer: (
        <div className="text-muted-foreground">
          {todayCount > 0 ? 'Hari ini aktif' : 'Belum ada penilaian hari ini'}
        </div>
      ),
    },
    {
      label: 'Rata-rata Skor',
      value: totalSubs > 0 ? String(avgScore) : '--',
      action: totalSubs > 0 ? <StatusBadge score={avgScore}>{avgLabel}</StatusBadge> : undefined,
      footer: (
        <div className="text-muted-foreground">
          {totalSubs > 0 ? 'Semua penilaian' : 'Belum ada data'}
        </div>
      ),
    },
    {
      label: 'Cakupan Ruangan',
      value: `${roomsDone}/${rooms.length}`,
      action: (
        <Badge variant="outline">
          <ClipboardList className="mr-1 size-3.5" />
          {coveragePct}%
        </Badge>
      ),
      footer: (
        <Progress
          value={coveragePct}
          className="h-1.5 [&_[data-slot=progress-indicator]]:bg-success"
        />
      ),
    },
    {
      label: 'Butuh Perhatian',
      value: String(attention),
      action: (
        <StatusBadge status={lowScore > 0 ? 'destructive' : notRated > 0 ? 'warning' : 'success'}>
          <TriangleAlert className="mr-1 size-3.5 inline" />
          {attention}
        </StatusBadge>
      ),
      footer: (
        <div className="text-muted-foreground">
          {attention > 0
            ? `Belum dinilai ${notRated} · Skor <60 ${lowScore}`
            : 'Semua ruangan aman'}
        </div>
      ),
    },
  ];

  // Full-page skeleton when submissions are loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard Audit 5R"
          subtitle={`${formatLongDate(new Date())} · Masa penilaian 10–27 Agustus`}
          action={
            <div className="flex items-center gap-2">
              <Button
                onClick={() => navigate({ to: '/admin/isi' })}
                variant="outline"
                className="hidden shrink-0 sm:inline-flex"
              >
                <SquarePen size={14} className="mr-1.5" />
                Isi 5R
              </Button>
              <Button
                onClick={() => navigate({ to: '/admin/isi', search: { form: 'dekorasi' } })}
                className="hidden shrink-0 sm:inline-flex"
              >
                <Paintbrush size={14} className="mr-1.5" />
                Isi Dekorasi
              </Button>
            </div>
          }
        />
        <SectionCardsSkeleton count={4} />
        <ChartSkeleton height={200} />
        <ChartSkeleton height={160} />
        <div className="space-y-2">
          <Skeleton className="h-4 w-28 rounded" />
          <RoomListSkeleton count={6} />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 rounded" />
          <ActivityListSkeleton count={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Dashboard Audit 5R"
        subtitle={`${formatLongDate(new Date())} · Masa penilaian 10–27 Agustus`}
        action={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate({ to: '/admin/isi' })}
              variant="outline"
              className="hidden shrink-0 sm:inline-flex"
            >
              <SquarePen size={14} className="mr-1.5" />
              Isi 5R
            </Button>
            <Button
              onClick={() => navigate({ to: '/admin/isi', search: { form: 'dekorasi' } })}
              className="hidden shrink-0 sm:inline-flex"
            >
              <Paintbrush size={14} className="mr-1.5" />
              Isi Dekorasi
            </Button>
          </div>
        }
      />

      {/* Stat cards */}
      <SectionCards stats={stats} />

      {/* Kekuatan 5R */}
      {catStrength.length === 0 ? (
        <Card>
          <CardContent>
            <SectionHeader title="Kekuatan 5R" subtext="Rata-rata semua penilaian" />
            <EmptyState
              title="Belum ada data."
              hint="Isi penilaian pertama untuk melihat kekuatan 5R."
              action={
                <Button size="sm" onClick={() => navigate({ to: '/admin/isi' })}>
                  Mulai Audit
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <ChartBarStrength data={catStrength} />
      )}

      {/* Aktivitas */}
      <ChartAreaInteractive data={calendar} />

      {/* Room status */}
      <section>
        <SectionHeader title="Status Ruangan" subtext="Klik untuk isi" />
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {roomStatus.map(({ room, count, final, last }) => {
            const done = count > 0;
            return (
              <InteractiveCard
                key={room.id}
                onClick={() => navigate({ to: '/admin/isi', search: { room: room.id } })}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      done ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground/60'
                    }`}
                  >
                    <RoomIcon name={room.icon} size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-foreground text-sm">{room.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {room.pic}
                      {done && last ? ` / ${timeAgo(last.createdAt)}` : ' / Belum dinilai'}
                    </p>
                  </div>
                  <StatusBadge score={done ? round1(final) : null} />
                </CardContent>
              </InteractiveCard>
            );
          })}
        </div>
      </section>

      {/* Recent activity */}
      {recent.length > 0 && (
        <section>
          <SectionHeader title="Aktivitas Terakhir" subtext="5 penilaian terbaru" />
          <Card className="divide-y divide-border overflow-hidden">
            {recent.map(({ sub, form, room, score }) => {
              return (
                <div key={sub.id} className="flex items-center justify-between px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground/90">
                      {room?.name}
                      <span className="mx-1.5 text-muted-foreground/40">/</span>
                      <span className="text-muted-foreground">{form?.label}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sub.auditor} / {timeAgo(sub.createdAt)}
                    </p>
                  </div>
                  {score && <StatusBadge score={round1(score.final)} showScoreMax />}
                </div>
              );
            })}
          </Card>
        </section>
      )}

      {/* Forms info */}
      <Card>
        <CardContent className="p-4">
          <SectionHeader title="Form Tersedia" subtext="Jumlah kriteria per checklist" />
          <div className="mt-3 space-y-2">
            {forms
              .filter((f) => f.enabled !== false)
              .map((f) => {
                const total = f.categories.reduce((s, c) => s + c.criteria.length, 0);
                return (
                  <div key={f.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className="text-xs font-bold text-muted-foreground/80">
                      {total} kriteria
                    </span>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Chart helpers ──

/** Seri harian penilaian untuk 90 hari terakhir (termasuk hari tanpa data). */
function buildDailySeries(submissions: FiveRSubmission[]): { date: string; count: number }[] {
  const days: { date: string; count: number }[] = [];
  const now = new Date();
  const countMap = new Map<string, number>();
  for (const s of submissions) {
    const key = s.createdAt.slice(0, 10);
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({ date: key, count: countMap.get(key) ?? 0 });
  }
  return days;
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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'Baru saja';
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  return `${day} hari lalu`;
}
