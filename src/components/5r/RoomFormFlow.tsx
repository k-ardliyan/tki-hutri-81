import { useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Cigarette,
  CigaretteOff,
  Factory,
  HelpCircle,
  History,
  Layers,
  Lock,
  Paintbrush,
  Search,
  Sparkles,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SearchInput } from '~/components/common/SearchInput';
import { RoomListSkeleton } from '~/components/loading/skeletons';
import {
  type FiveRForm,
  type FiveRRoom,
  type FiveRSubmission,
  getRecommendedFormId,
  isRecommendedForm,
} from '../../data/5r';
import { useDebounce } from '../../hooks/use-debounce';
import { currentWeekNumber, formatWeekRange, todayPrefix, totalWeeks } from '../../lib/dateUtils';
import { useSubmissions } from '../../lib/queries';
import { round1, scoreSubmission } from '../../lib/scoring';
import { getSession } from '../../server/functions/auth';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../ui/breadcrumb';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { InteractiveCard } from '../ui/interactive-card';
import { PageHeader } from '../ui/page-header';
import { ResponsiveDialog } from '../ui/responsive-dialog';
import { DeadlineBanner } from './DeadlineBanner';
import { Petunjuk5RModal } from './Petunjuk5RModal';
import RiwayatMingguIni from './RiwayatMingguIni';
import RoomIcon from './RoomIcon';
import ScoreBadge from './ScoreBadge';
import ScoringForm from './ScoringForm';

interface RoomFormFlowProps {
  rooms: FiveRRoom[];
  forms: FiveRForm[];
  startDate: string | null;
  endDate: string | null;
  basePath: '/audit/isi' | '/admin/isi';
  room?: string;
  form?: string;
}

export default function RoomFormFlow({
  rooms,
  forms,
  startDate,
  endDate,
  basePath,
  room,
  form,
}: RoomFormFlowProps) {
  const navigate = useNavigate();
  const roomObj = rooms.find((r) => r.id === room);

  const [me, setMe] = useState<string | null>(null);
  useEffect(() => {
    void getSession().then((s) => setMe(s.username ?? null));
  }, []);

  const { data: allSubs = [], isLoading } = useSubmissions();
  const today = todayPrefix();

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  const total = start && end ? totalWeeks(start, end) : 0;
  const current = start ? currentWeekNumber(start) : 0;
  const closed = end ? new Date() > end : false;

  /** True bila submission ada di minggu aktif. Tanpa periode → false (server tolak submit). */
  const isCurrentPeriod = useCallback(
    (s: FiveRSubmission): boolean => (start ? (s.weekNumber ?? 1) === current : false),
    [start, current]
  );

  // Dekorasi: submission milik SAYA (kapan pun) — sekali per ruangan per auditor.
  const myDekorasiRooms = useMemo(() => {
    const s = new Set<string>();
    for (const sub of allSubs) {
      if (sub.formId === 'dekorasi' && sub.createdBy === me) s.add(sub.roomId);
    }
    return s;
  }, [allSubs, me]);

  const activeForms = useMemo(() => forms.filter((f) => f.enabled !== false), [forms]);
  const disabledForms = useMemo(() => forms.filter((f) => f.enabled === false), [forms]);

  // Stage 1 Room search & status filter
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 200);
  const [statusFilter, setStatusFilter] = useState<'all' | 'unrated' | 'done'>('all');

  // Stage 2 Log Modal state
  const [logCategory, setLogCategory] = useState<'dekorasi' | 'fiveR' | null>(null);
  const [logFilter, setLogFilter] = useState<'mine' | 'all'>('mine');

  // Petunjuk modal state
  const [showGuide, setShowGuide] = useState(false);

  const formMap = useMemo(() => new Map<string, FiveRForm>(forms.map((f) => [f.id, f])), [forms]);

  const roomStatusCounts = useMemo(() => {
    let done = 0;
    let unrated = 0;
    for (const r of rooms) {
      const has5R = allSubs.some(
        (s) =>
          s.roomId === r.id && s.createdBy === me && isCurrentPeriod(s) && s.formId !== 'dekorasi'
      );
      const hasDekorasi = myDekorasiRooms.has(r.id);
      if (has5R && hasDekorasi) {
        done++;
      } else {
        unrated++;
      }
    }
    return { done, unrated };
  }, [rooms, allSubs, me, isCurrentPeriod, myDekorasiRooms]);

  const filteredRooms = useMemo(() => {
    let list = rooms;

    // Search query filter
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      list = list.filter(
        (r) => r.name.toLowerCase().includes(q) || r.pic.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter === 'unrated') {
      list = list.filter((r) => {
        const has5R = allSubs.some(
          (s) =>
            s.roomId === r.id && s.createdBy === me && isCurrentPeriod(s) && s.formId !== 'dekorasi'
        );
        const hasDekorasi = myDekorasiRooms.has(r.id);
        return !(has5R && hasDekorasi);
      });
    } else if (statusFilter === 'done') {
      list = list.filter((r) => {
        const has5R = allSubs.some(
          (s) =>
            s.roomId === r.id && s.createdBy === me && isCurrentPeriod(s) && s.formId !== 'dekorasi'
        );
        const hasDekorasi = myDekorasiRooms.has(r.id);
        return has5R && hasDekorasi;
      });
    }

    return list;
  }, [rooms, debouncedSearch, statusFilter, allSubs, me, isCurrentPeriod, myDekorasiRooms]);

  // Stage 1: No room selected — Room Picker
  if (!room || !roomObj) {
    const myPeriodSubs = allSubs.filter((s) => s.createdBy === me && isCurrentPeriod(s));
    const myPeriod5RSubs = myPeriodSubs.filter((s) => s.formId !== 'dekorasi');
    const my5RRoomsPeriodCount = new Set(myPeriod5RSubs.map((s) => s.roomId)).size;
    const myDekorasiCount = myDekorasiRooms.size;

    const periodSubCount = allSubs.filter((s) => isCurrentPeriod(s)).length;

    return (
      <div className="space-y-4">
        <PageHeader
          title="Isi Penilaian 5R & Dekorasi"
          subtitle="Pilih ruangan kerja untuk memulai pengisian checklist penilaian."
          action={
            <div className="flex items-center gap-2 flex-wrap">
              <RiwayatMingguIni startDate={startDate} variant="button" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGuide(true)}
                className="text-xs font-bold gap-1.5 cursor-pointer shadow-2xs h-9 px-3"
              >
                <HelpCircle size={14} className="text-primary" />
                <span>Petunjuk Penilaian</span>
              </Button>
            </div>
          }
        />

        <DeadlineBanner startDate={startDate} endDate={endDate} />

        {/* Compact Progress Summary Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-2xl border border-border/70 bg-card p-3 shadow-2xs text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-foreground">Progres Penilaianmu:</span>
            <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 text-[11px] font-extrabold">
              5R: {my5RRoomsPeriodCount}/{rooms.length} Ruangan
            </span>
            <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 text-[11px] font-extrabold">
              Dekorasi: {myDekorasiCount}/{rooms.length} Ruangan
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground font-medium">
            Total Tim Minggu Ini:{' '}
            <strong className="text-foreground font-bold">{periodSubCount}</strong> form
          </div>
        </div>

        {/* Search & Quick Filter Pills */}
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
                loading={searchQuery !== debouncedSearch}
                placeholder="Cari nama ruangan atau PIC..."
                className="h-9.5 text-xs sm:text-sm bg-card"
              />
            </div>

            {/* Quick Status Filter Chips */}
            <div className="inline-flex rounded-xl border border-border/80 bg-muted/50 p-1 shrink-0">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
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
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
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
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  statusFilter === 'done'
                    ? 'bg-card text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sudah Kamu Isi ({roomStatusCounts.done}) ✓
              </button>
            </div>
          </div>
        </div>

        {/* Room Card Grid */}
        {isLoading ? (
          <RoomListSkeleton count={6} />
        ) : filteredRooms.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <p className="text-sm font-semibold text-muted-foreground">
              Tidak ada ruangan yang cocok dengan filter yang dipilih.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="mt-3 text-xs font-bold"
            >
              Reset Filter
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRooms.map((r) => {
              const roomSubs = allSubs.filter((s) => s.roomId === r.id);
              const myRoomSubs = roomSubs.filter((s) => s.createdBy === me);
              const myPeriodSubs = myRoomSubs.filter((s) => isCurrentPeriod(s));
              const otherPeriodSubs = roomSubs.filter(
                (s) => s.createdBy !== me && isCurrentPeriod(s)
              );

              const hasMy5R = myPeriodSubs.some((s) => s.formId !== 'dekorasi');
              const hasMyDekorasi = myDekorasiRooms.has(r.id);

              const myPeriodFormsList = [];
              if (hasMy5R) {
                const f5r = myPeriodSubs.find((s) => s.formId !== 'dekorasi');
                const formLabel = f5r ? formMap.get(f5r.formId)?.label : '';
                myPeriodFormsList.push(formLabel || '5R');
              }
              if (hasMyDekorasi) {
                myPeriodFormsList.push('Lomba Dekorasi');
              }

              const isDone = hasMy5R && hasMyDekorasi;
              const isWarning = (hasMy5R && !hasMyDekorasi) || (!hasMy5R && hasMyDekorasi);

              const hasOtherActivityPeriod = otherPeriodSubs.length > 0;

              return (
                <InteractiveCard
                  key={r.id}
                  onClick={() => navigate({ to: basePath, search: { room: r.id } })}
                  className={`group relative overflow-hidden transition-all border ${
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
                        <RoomIcon name={r.icon} size={19} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="truncate font-bold text-foreground text-sm">{r.name}</h3>
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

                        <p className="text-xs text-muted-foreground mt-0.5">PIC: {r.pic}</p>
                      </div>

                      <ChevronRight
                        size={16}
                        className="shrink-0 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all mt-1"
                      />
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
                          <p className="text-[11px] font-semibold text-amber-900 mt-0.5 truncate pl-4">
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
                      {hasOtherActivityPeriod ? (
                        <div className="rounded-xl bg-blue-50/80 px-2.5 py-1.5 text-[11px] text-blue-900 border border-blue-200/60 flex items-center justify-between">
                          <span className="font-medium text-blue-800 flex items-center gap-1">
                            <Users size={12} className="text-blue-600 shrink-0" />
                            <span>Auditor lain minggu ini:</span>
                          </span>
                          <span className="font-extrabold text-blue-900 bg-white/80 px-1.5 py-0.5 rounded-md border border-blue-200/60 text-[10px]">
                            {otherPeriodSubs.length} form
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
            })}
          </div>
        )}
        <Petunjuk5RModal open={showGuide} onOpenChange={setShowGuide} />
      </div>
    );
  }

  // Stage 2: Room selected, no form — Form Picker (accordion per minggu)
  if (!form) {
    const roomSubsDekorasi = allSubs.filter((s) => s.roomId === room && s.formId === 'dekorasi');
    const roomSubs5R = allSubs.filter((s) => s.roomId === room && s.formId !== 'dekorasi');

    const allCategorySubs = (logCategory === 'dekorasi' ? roomSubsDekorasi : roomSubs5R).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const myCategorySubs = allCategorySubs.filter((s) => s.createdBy === me);

    const displayedLogSubs = logFilter === 'mine' ? myCategorySubs : allCategorySubs;

    const formatSubDate = (isoString: string) => {
      try {
        const d = new Date(isoString);
        if (isoString.startsWith(today)) {
          return `Hari ini, ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
        }
        return d.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch {
        return isoString;
      }
    };

    const weeks = total > 0 ? Array.from({ length: total }, (_, i) => i + 1) : [];

    const FormCardButton = ({
      f,
      week,
      disabled: btnDisabled,
      icon,
    }: {
      f: { id: string; label: string; categories: unknown[] };
      /** Wajib utk form 5R (filter per minggu). Dekorasi: sekali total — tanpa week. */
      week?: number;
      disabled?: boolean;
      icon?: React.ReactNode;
    }) => {
      const total = (f.categories as { criteria: unknown[] }[]).reduce(
        (s, c) => s + c.criteria.length,
        0
      );
      const isDekorasi = f.id === 'dekorasi';
      // Untuk 5R: hanya submission di minggu ini; dekorasi: sekali total.
      const subsForF = isDekorasi
        ? allSubs.filter((s) => s.roomId === room && s.formId === f.id)
        : allSubs.filter(
            (s) => s.roomId === room && s.formId === f.id && s.weekNumber === (week ?? current)
          );
      const mySubsForF = subsForF.filter((s) => s.createdBy === me);

      // getSubmissions DESC (terbaru index 0) — ambil [0] = submission TERAKHIR
      const myLastSub = mySubsForF[0];
      const lastSubOverall = subsForF[0];

      const hasSubmittedMyself = mySubsForF.length > 0;
      const hasSubmittedGlobal = subsForF.length > 0;
      // Dekorasi sekali total (bebas minggu); 5R terkunci di luar minggu aktif.
      const isFutureWeek = !isDekorasi && (week ?? current) > current;
      const isPastWeek = !isDekorasi && (week ?? current) < current;
      const isLocked = closed || isFutureWeek || isPastWeek || btnDisabled;

      const statusText = isDekorasi
        ? hasSubmittedMyself
          ? 'Sudah Kamu Nilai'
          : hasSubmittedGlobal
            ? `${subsForF.length}x Juri Lain`
            : '1x per auditor selama periode'
        : btnDisabled
          ? 'Form tidak aktif periode ini'
          : hasSubmittedMyself
            ? `Kamu (Minggu ke-${week})`
            : hasSubmittedGlobal
              ? `${subsForF.length}x Auditor Lain Minggu ke-${week}`
              : isFutureWeek
                ? 'Belum waktunya'
                : isPastWeek
                  ? 'Minggu sudah lewat'
                  : 'Belum dinilai minggu ini';

      const isRecommended = !isDekorasi && isRecommendedForm(roomObj, f.id);
      const showShimmer = isRecommended && !isLocked && !hasSubmittedMyself;

      return (
        <button
          key={f.id}
          type="button"
          disabled={isLocked || hasSubmittedMyself}
          onClick={() => navigate({ to: basePath, search: { room, form: f.id } })}
          className={`flex w-full items-center justify-between rounded-xl p-3.5 text-left transition cursor-pointer ${
            isLocked || hasSubmittedMyself
              ? 'opacity-70 bg-muted/25 border border-border/80 cursor-not-allowed'
              : showShimmer
                ? 'shimmer-border-recommended bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08] hover:bg-emerald-500/[0.08] hover:shadow-xs active:scale-[0.99]'
                : 'bg-card border border-border hover:border-primary/40 hover:bg-muted/30 hover:shadow-xs active:scale-[0.99]'
          }`}
        >
          <div className="flex items-start gap-3 min-w-0">
            {icon && (
              <div className="mt-0.5 shrink-0">
                {isLocked && !hasSubmittedMyself ? (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/70 text-muted-foreground/60 border border-border/60">
                    <Lock size={15} />
                  </div>
                ) : (
                  icon
                )}
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-sm font-bold truncate ${
                    isLocked || hasSubmittedMyself ? 'text-muted-foreground' : 'text-foreground'
                  }`}
                >
                  {f.label}
                </span>

                {/* Status Badges */}
                {hasSubmittedMyself ? (
                  <Badge
                    variant="outline"
                    className="shrink-0 bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold"
                  >
                    <Check size={10} className="mr-0.5 inline" />
                    Sudah Kamu Nilai
                  </Badge>
                ) : btnDisabled ? (
                  <Badge
                    variant="outline"
                    className="shrink-0 bg-muted text-muted-foreground text-[10px] font-bold"
                  >
                    <Lock size={9} className="mr-0.5 inline" />
                    Nonaktif
                  </Badge>
                ) : isFutureWeek ? (
                  <Badge
                    variant="outline"
                    className="shrink-0 bg-muted text-muted-foreground text-[10px] font-bold"
                  >
                    <Lock size={9} className="mr-0.5 inline" />
                    Minggu Depan
                  </Badge>
                ) : isPastWeek ? (
                  <Badge
                    variant="outline"
                    className="shrink-0 bg-muted text-muted-foreground text-[10px] font-bold"
                  >
                    <Lock size={9} className="mr-0.5 inline" />
                    Minggu Lewat
                  </Badge>
                ) : (
                  <>
                    {isRecommended && (
                      <Badge
                        variant="outline"
                        className="shrink-0 bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300/70 text-[10px] font-extrabold gap-1"
                      >
                        <Sparkles
                          size={10}
                          className="inline text-emerald-600 dark:text-emerald-400"
                        />
                        Direkomendasikan
                      </Badge>
                    )}
                    {hasSubmittedGlobal && (
                      <Badge
                        variant="outline"
                        className="shrink-0 bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-semibold"
                      >
                        {isDekorasi
                          ? `${subsForF.length}x Juri Lain`
                          : `${subsForF.length}x Auditor Lain`}
                      </Badge>
                    )}
                  </>
                )}
              </div>

              {/* Subtitle / Timestamp */}
              {myLastSub ? (
                <p className="text-[11px] font-medium text-muted-foreground leading-tight">
                  Olehmu: {formatSubDate(myLastSub.createdAt)}
                  {subsForF.length > mySubsForF.length && (
                    <span className="ml-1 text-muted-foreground/60">
                      · Total {subsForF.length}x (ada juri lain)
                    </span>
                  )}
                </p>
              ) : lastSubOverall ? (
                <p className="text-[11px] font-medium text-muted-foreground leading-tight">
                  Terakhir: {formatSubDate(lastSubOverall.createdAt)} · oleh{' '}
                  {lastSubOverall.auditor}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {total} kriteria penilaian · {statusText}
                  {isLocked && !hasSubmittedMyself && !btnDisabled && ' · terkunci'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-2">
            <ChevronRight size={16} className="text-muted-foreground/50" />
          </div>
        </button>
      );
    };

    return (
      <div className="space-y-4">
        <DeadlineBanner startDate={startDate} endDate={endDate} />

        {/* Selected Room Header */}
        <Card className="border-primary/20 bg-primary/[0.02] shadow-2xs">
          <CardContent className="p-3.5 sm:p-4 space-y-3">
            {/* Top Control Bar: Label & Action Buttons */}
            <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">
                Ruangan Terpilih
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGuide(true)}
                  className="text-xs font-bold gap-1 cursor-pointer h-8 px-2.5"
                >
                  <HelpCircle size={13} className="text-primary" />
                  <span className="hidden sm:inline">Petunjuk</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate({ to: basePath })}
                  className="text-xs font-bold gap-1 cursor-pointer h-8 px-2.5"
                >
                  <ArrowLeft size={13} />
                  <span>Ganti Ruangan</span>
                </Button>
              </div>
            </div>

            {/* Room Main Info: Icon, Full Room Name, PIC */}
            <div className="flex items-start sm:items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-2xs">
                <RoomIcon name={roomObj.icon} size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-xl font-black text-foreground leading-tight break-words">
                  {roomObj.name}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                  PIC: {roomObj.pic}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Group 1: Lomba Dekorasi — SEKALI per auditor per ruangan */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-foreground">
                    Lomba Dekorasi Ruangan
                  </h2>
                  <p className="text-[11px] text-muted-foreground truncate">
                    Dinilai 1x per auditor selama periode penilaian (Bobot 30%).
                  </p>
                </div>
              </div>
              {roomSubsDekorasi.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLogFilter(myCategorySubs.length > 0 ? 'mine' : 'all');
                    setLogCategory('dekorasi');
                  }}
                  className="h-7 px-2.5 text-[11px] font-bold text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                >
                  <History size={12} className="mr-1 text-amber-500" />
                  <span>Log ({roomSubsDekorasi.length})</span>
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {activeForms
                .filter((f) => f.id === 'dekorasi')
                .map((f) => (
                  <FormCardButton
                    key={f.id}
                    f={f}
                    icon={
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-brand-red dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/80 shadow-2xs">
                        <Paintbrush size={17} />
                      </div>
                    }
                  />
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Group 2: Audit Budaya 5R — accordion per minggu */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Layers size={15} className="text-primary shrink-0" />
                <div className="min-w-0">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-foreground">
                    Audit Budaya 5R
                  </h2>
                  <p className="text-[11px] text-muted-foreground truncate">
                    Penilaian mingguan selama periode perlombaan (Bobot 70%).
                  </p>
                </div>
              </div>
              {roomSubs5R.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLogFilter(myCategorySubs.length > 0 ? 'mine' : 'all');
                    setLogCategory('fiveR');
                  }}
                  className="h-7 px-2.5 text-[11px] font-bold text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                >
                  <History size={12} className="mr-1 text-primary" />
                  <span>Log ({roomSubs5R.length})</span>
                </Button>
              )}
            </div>

            {!start || !end || weeks.length === 0 ? (
              <Alert>
                <Lock size={16} />
                <AlertTitle>Periode belum diatur</AlertTitle>
                <AlertDescription className="text-xs mt-1">
                  Admin belum mengatur tanggal mulai dan selesai penilaian. Hubungi admin untuk
                  mengatur periode penilaian.
                </AlertDescription>
              </Alert>
            ) : (
              <Accordion type="multiple" defaultValue={current > 0 ? [`week-${current}`] : []}>
                {weeks.map((week) => {
                  const range = formatWeekRange(week, start);
                  const isCurrent = week === current;
                  const isPast = week < current;
                  const myWeek5RSubs = allSubs.filter(
                    (s) =>
                      s.roomId === room &&
                      s.formId !== 'dekorasi' &&
                      s.weekNumber === week &&
                      s.createdBy === me
                  );
                  const hasMy5RThisWeek = myWeek5RSubs.length > 0;
                  const otherWeek5RCount = allSubs.filter(
                    (s) =>
                      s.roomId === room &&
                      s.formId !== 'dekorasi' &&
                      s.weekNumber === week &&
                      s.createdBy !== me
                  ).length;
                  return (
                    <AccordionItem key={week} value={`week-${week}`}>
                      <AccordionTrigger className="px-4 py-3 hover:no-underline data-open:bg-muted/40 rounded-xl">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                              isCurrent
                                ? 'bg-primary/15 text-primary'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            <Layers size={15} />
                          </div>
                          <div className="min-w-0">
                            <p
                              className={`text-sm font-extrabold ${isCurrent ? 'text-primary' : 'text-foreground'}`}
                            >
                              Minggu ke-{week}
                              {isCurrent && (
                                <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                                  Minggu Ini
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-muted-foreground">{range}</p>
                          </div>
                        </div>
                        {hasMy5RThisWeek ? (
                          <Badge
                            variant="outline"
                            className="ml-auto mr-2 shrink-0 bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-extrabold"
                          >
                            <Check size={10} className="mr-0.5 inline" />
                            Sudah Kamu Nilai
                          </Badge>
                        ) : isCurrent ? (
                          <div className="ml-auto mr-2 shrink-0 flex items-center gap-1.5">
                            {otherWeek5RCount > 0 && (
                              <span className="text-[10px] text-muted-foreground/80 hidden sm:inline font-medium">
                                ({otherWeek5RCount}x juri lain)
                              </span>
                            )}
                            <Badge
                              variant="outline"
                              className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold"
                            >
                              Belum Kamu Nilai
                            </Badge>
                          </div>
                        ) : isPast ? (
                          <Badge
                            variant="outline"
                            className="ml-auto mr-2 shrink-0 bg-muted text-muted-foreground text-[10px] font-medium"
                          >
                            Minggu Lewat
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="ml-auto mr-2 shrink-0 bg-muted text-muted-foreground text-[10px] font-medium"
                          >
                            Terkunci
                          </Badge>
                        )}
                      </AccordionTrigger>
                      <AccordionContent className="px-0 pt-1 pb-2">
                        <div className="ml-3 sm:ml-4 pl-3 sm:pl-4.5 border-l-2 border-primary/20 dark:border-primary/30 space-y-2.5 pt-1">
                          {activeForms
                            .filter((f) => f.id !== 'dekorasi')
                            .sort((a, b) => {
                              const recId = getRecommendedFormId(roomObj);
                              if (a.id === recId) return -1;
                              if (b.id === recId) return 1;
                              return 0;
                            })
                            .map((f) => {
                              const formIcon =
                                f.id === 'office-non-smoking' ? (
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 shadow-2xs">
                                    <CigaretteOff size={17} />
                                  </div>
                                ) : f.id === 'office-smoking' ? (
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 shadow-2xs">
                                    <Cigarette size={17} />
                                  </div>
                                ) : f.id === 'produksi' ? (
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/80 shadow-2xs">
                                    <Factory size={17} />
                                  </div>
                                ) : (
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 shadow-2xs">
                                    <Layers size={17} />
                                  </div>
                                );
                              return (
                                <FormCardButton key={f.id} f={f} week={week} icon={formIcon} />
                              );
                            })}
                          {disabledForms.map((f) => (
                            <FormCardButton
                              key={f.id}
                              f={f}
                              week={week}
                              disabled
                              icon={
                                f.id === 'office-non-smoking' ? (
                                  <CigaretteOff size={16} />
                                ) : f.id === 'office-smoking' ? (
                                  <Cigarette size={16} />
                                ) : f.id === 'produksi' ? (
                                  <Factory size={16} />
                                ) : (
                                  <Layers size={16} />
                                )
                              }
                            />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </CardContent>
        </Card>

        {closed && (
          <Alert variant="destructive">
            <Lock size={16} />
            <AlertTitle>Penilaian ditutup</AlertTitle>
            <AlertDescription className="text-xs mt-1">
              Periode penilaian sudah berakhir (
              {endDate ? new Date(endDate).toLocaleString('id-ID') : ''}). Form tidak bisa diisi
              lagi.
            </AlertDescription>
          </Alert>
        )}

        {/* Log Modal using ResponsiveDialog */}
        <ResponsiveDialog
          open={logCategory !== null}
          onOpenChange={(open) => !open && setLogCategory(null)}
          title={
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <History size={15} />
              </div>
              <span>
                {logCategory === 'dekorasi' ? 'Log Penilaian Dekorasi' : 'Log Penilaian 5R'}
              </span>
            </div>
          }
          description={`Ruangan: ${roomObj.name} (PIC: ${roomObj.pic})`}
          footer={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLogCategory(null)}
              className="w-full text-xs font-bold"
            >
              Tutup Log
            </Button>
          }
        >
          <div className="space-y-3 pb-1">
            {/* Sub-Tabs: Punyaku vs Semua Auditor */}
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-border/80 bg-muted/60 p-1">
              <button
                type="button"
                onClick={() => setLogFilter('mine')}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition cursor-pointer ${
                  logFilter === 'mine'
                    ? 'bg-card text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <UserCheck size={13} />
                <span>Punyaku</span>
                <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-extrabold text-primary">
                  {myCategorySubs.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setLogFilter('all')}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition cursor-pointer ${
                  logFilter === 'all'
                    ? 'bg-card text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>Semua Auditor</span>
                <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] font-extrabold text-muted-foreground">
                  {allCategorySubs.length}
                </span>
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="divide-y divide-border/60 rounded-xl border border-border/70 overflow-hidden bg-card max-h-[50vh] sm:max-h-[360px] overflow-y-auto">
              {displayedLogSubs.length === 0 ? (
                <div className="py-10 px-4 text-center text-xs text-muted-foreground space-y-1.5">
                  <p className="font-medium">
                    {logFilter === 'mine'
                      ? 'Kamu belum pernah mengisi penilaian untuk kategori ini di ruangan ini.'
                      : 'Belum ada penilaian tersimpan untuk kategori ini.'}
                  </p>
                  {logFilter === 'mine' && allCategorySubs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setLogFilter('all')}
                      className="text-primary font-bold hover:underline cursor-pointer text-xs"
                    >
                      Lihat penilaian dari auditor lain ({allCategorySubs.length})
                    </button>
                  )}
                </div>
              ) : (
                displayedLogSubs.map((s, idx) => {
                  const formMeta = forms.find((formItem) => formItem.id === s.formId);
                  const score = formMeta ? scoreSubmission(formMeta, s) : null;
                  const noteList = Object.values(s.notes || {}).filter(Boolean);
                  const isMine = s.createdBy === me;

                  return (
                    <div
                      key={s.id}
                      className="p-3.5 hover:bg-muted/20 transition flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] font-bold text-muted-foreground">
                            #{displayedLogSubs.length - idx}
                          </span>
                          <p className="text-xs font-bold text-foreground truncate">
                            {formMeta?.label ?? s.formId}
                          </p>
                          {isMine && (
                            <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[9px] font-bold text-primary">
                              Kamu
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
                          <span>
                            Oleh <strong className="text-foreground/80">{s.auditor}</strong>
                          </span>
                          <span>&middot;</span>
                          <span>{formatSubDate(s.createdAt)}</span>
                        </div>
                        {noteList.length > 0 && (
                          <p className="text-[10px] text-muted-foreground/90 italic bg-muted/40 rounded px-2 py-1 mt-1 line-clamp-2">
                            "{noteList.join(' · ')}"
                          </p>
                        )}
                      </div>
                      {score && (
                        <div className="text-right shrink-0">
                          <ScoreBadge
                            value={round1(score.final)}
                            showMax={false}
                            className="min-w-8 justify-center font-black"
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </ResponsiveDialog>

        <Petunjuk5RModal open={showGuide} onOpenChange={setShowGuide} />
      </div>
    );
  }

  // Stage 3: Room + Form selected — Scoring Form
  const selectedForm = activeForms.find((f) => f.id === form);
  const alreadyScoredDekorasi = form === 'dekorasi' && myDekorasiRooms.has(room);
  const showClosed = closed && !alreadyScoredDekorasi;

  return (
    <div className="space-y-4">
      {/* Navigation Breadcrumbs */}
      <Card className="border-border/60">
        <CardContent className="py-2.5 px-4 flex items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <button
                  type="button"
                  onClick={() => navigate({ to: basePath, search: { room } })}
                  className="text-xs font-bold text-muted-foreground transition hover:text-foreground inline-flex items-center gap-1 cursor-pointer"
                >
                  <RoomIcon name={roomObj.icon} size={13} />
                  <span>{roomObj.name}</span>
                </button>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-xs font-bold text-foreground">
                  {selectedForm?.label ?? forms.find((f) => f.id === form)?.label}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowGuide(true)}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              <HelpCircle size={12} className="mr-1 text-primary" />
              Petunjuk
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: basePath, search: { room } })}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft size={12} className="mr-1" />
              Ganti Form
            </Button>
          </div>
        </CardContent>
      </Card>

      {alreadyScoredDekorasi ? (
        <Alert className="border-success/30 bg-success/[0.05]">
          <Check size={16} className="text-success" />
          <AlertTitle className="text-success font-bold">Ruangan ini sudah dinilai</AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground mt-1">
            Penilaian lomba dekorasi untuk <strong>{roomObj.name}</strong> sudah dikirim oleh akun
            Anda. Satu ruangan hanya bisa dinilai sekali per auditor.
          </AlertDescription>
          <div className="mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate({ to: basePath, search: { room } })}
              className="text-xs font-bold"
            >
              Kembali ke Pilih Form
            </Button>
          </div>
        </Alert>
      ) : showClosed ? (
        <Alert variant="destructive">
          <Lock size={16} />
          <AlertTitle>Penilaian ditutup</AlertTitle>
          <AlertDescription className="text-xs mt-1">
            Melewati periode penilaian ({endDate ? new Date(endDate).toLocaleString('id-ID') : ''}).
            Form tidak bisa diisi lagi.
          </AlertDescription>
          <div className="mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate({ to: basePath })}
              className="text-xs font-bold"
            >
              Kembali ke Daftar Ruangan
            </Button>
          </div>
        </Alert>
      ) : (
        <ScoringForm
          roomId={room}
          formId={form}
          week={selectedForm?.id === 'dekorasi' ? undefined : current}
          onSuccess={() => navigate({ to: basePath, search: { room } })}
        />
      )}

      <Petunjuk5RModal open={showGuide} onOpenChange={setShowGuide} />
    </div>
  );
}
