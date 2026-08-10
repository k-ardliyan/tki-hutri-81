import { useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  History,
  Layers,
  Lock,
  Paintbrush,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FiveRForm, FiveRRoom } from '../../data/5r';
import { useDebounce } from '../../hooks/use-debounce';
import { todayPrefix } from '../../lib/dateUtils';
import { useSubmissions } from '../../lib/queries';
import { round1, scoreSubmission } from '../../lib/scoring';
import { getSession } from '../../server/functions/auth';
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
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { InteractiveCard } from '../ui/interactive-card';
import { PageHeader } from '../ui/page-header';
import RoomIcon from '../ui/RoomIcon';
import ScoreBadge from '../ui/ScoreBadge';
import { RoomListSkeleton } from '../ui/skeletons';
import { DeadlineBanner, deadlineInfo } from './DeadlineBanner';
import RiwayatHariIni from './RiwayatHariIni';
import ScoringForm from './ScoringForm';

interface RoomFormFlowProps {
  rooms: FiveRRoom[];
  forms: FiveRForm[];
  deadline: string | null;
  basePath: '/audit/isi' | '/admin/isi';
  room?: string;
  form?: string;
}

export default function RoomFormFlow({
  rooms,
  forms,
  deadline,
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
  const { closed } = deadlineInfo(deadline);

  // Room search filter in Stage 1
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 200);

  // Stage 2 Log Modal state
  const [logCategory, setLogCategory] = useState<'dekorasi' | 'fiveR' | null>(null);
  const [logFilter, setLogFilter] = useState<'mine' | 'all'>('mine');

  const formMap = useMemo(() => new Map<string, FiveRForm>(forms.map((f) => [f.id, f])), [forms]);

  const filteredRooms = useMemo(() => {
    if (!debouncedSearch.trim()) return rooms;
    const q = debouncedSearch.toLowerCase().trim();
    return rooms.filter((r) => r.name.toLowerCase().includes(q) || r.pic.toLowerCase().includes(q));
  }, [rooms, debouncedSearch]);

  // Stage 1: No room selected — Room Picker
  if (!room || !roomObj) {
    const myTodaySubs = allSubs.filter((s) => s.createdBy === me && s.createdAt.startsWith(today));
    const myToday5RSubs = myTodaySubs.filter((s) => s.formId !== 'dekorasi');
    const my5RRoomsTodayCount = new Set(myToday5RSubs.map((s) => s.roomId)).size;
    const myDekorasiCount = myDekorasiRooms.size;

    const todaySubCount = allSubs.filter((s) => s.createdAt.startsWith(today)).length;
    const roomsDoneTodayCount = new Set(
      allSubs
        .filter((s) => s.createdAt.startsWith(today) && s.formId !== 'dekorasi')
        .map((s) => s.roomId)
    ).size;

    return (
      <div className="space-y-4">
        <PageHeader
          title="Isi Penilaian 5R & Dekorasi"
          subtitle="Pilih ruangan kerja untuk memulai pengisian checklist penilaian."
        />

        <DeadlineBanner deadline={deadline} />

        {/* Quick status cards */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {/* Card 1: 5R Kamu */}
          <Card className="border-border/70 bg-card/80 shadow-2xs">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  5R Kamu Hari Ini
                </span>
                {my5RRoomsTodayCount === rooms.length && rooms.length > 0 ? (
                  <Badge
                    variant="outline"
                    className="bg-emerald-100 text-emerald-800 border-emerald-300 px-1.5 py-0 text-[9px] font-bold"
                  >
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
                <span className="text-xs font-normal text-muted-foreground">
                  / {rooms.length} ruang
                </span>
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
                {myDekorasiCount === rooms.length && rooms.length > 0 ? (
                  <Badge
                    variant="outline"
                    className="bg-emerald-100 text-emerald-800 border-emerald-300 px-1.5 py-0 text-[9px] font-bold"
                  >
                    Lengkap ✓
                  </Badge>
                ) : (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                    Dinilai 1x / ruang
                  </span>
                )}
              </div>
              <p className="text-xl font-extrabold text-foreground tracking-tight">
                {myDekorasiCount}{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  / {rooms.length} ruang
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {myDekorasiCount === rooms.length && rooms.length > 0
                  ? 'Seluruh dekorasi ruangan selesai kamu nilai'
                  : `Sisa ${rooms.length - myDekorasiCount} ruang dekorasi belum kamu nilai`}
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
              <p className="text-xl font-extrabold text-foreground tracking-tight">
                {todaySubCount}{' '}
                <span className="text-xs font-normal text-muted-foreground">penilaian</span>
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                Dari seluruh juri & auditor hari ini
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search
            size={14}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground/60"
          />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama ruangan atau PIC..."
            className="h-10 pl-9 pr-9 text-xs sm:text-sm bg-card"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <RiwayatHariIni />

        {isLoading ? (
          <RoomListSkeleton count={6} />
        ) : filteredRooms.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <p className="text-sm font-semibold text-muted-foreground">
              Tidak ada ruangan yang cocok dengan "{searchQuery}"
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="mt-3 text-xs"
            >
              Reset Pencarian
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRooms.map((r) => {
              const roomSubs = allSubs.filter((s) => s.roomId === r.id);
              const myRoomSubs = roomSubs.filter((s) => s.createdBy === me);
              const myTodaySubs = myRoomSubs.filter((s) => s.createdAt.startsWith(today));
              const otherTodaySubs = roomSubs.filter(
                (s) => s.createdBy !== me && s.createdAt.startsWith(today)
              );
              const myDekorasiDone = myRoomSubs.some((s) => s.formId === 'dekorasi');

              const myTodayFormsList = myTodaySubs.map((s) => {
                const f = formMap.get(s.formId);
                return f ? f.label.replace('Checklist 5R ', '') : s.formId;
              });

              const hasMyActivityToday = myTodaySubs.length > 0;
              const hasOtherActivityToday = otherTodaySubs.length > 0;

              return (
                <InteractiveCard
                  key={r.id}
                  onClick={() => navigate({ to: basePath, search: { room: r.id } })}
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
                        <RoomIcon name={r.icon} size={18} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="truncate font-bold text-foreground text-sm">{r.name}</h3>
                          {hasMyActivityToday ? (
                            <Badge
                              variant="outline"
                              className="bg-emerald-100 text-emerald-800 border-emerald-300 px-1.5 py-0 text-[9px] font-extrabold"
                            >
                              <Check size={9} className="mr-0.5 inline" />
                              Kamu ({myTodaySubs.length} form)
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
                              {otherTodaySubs.length}x Juri Lain
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-muted text-muted-foreground px-1.5 py-0 text-[9px]"
                            >
                              Belum dinilai
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

                    {/* Detailed Form Activity Summary Tag */}
                    {hasMyActivityToday && (
                      <div className="rounded-lg bg-emerald-100/60 px-2.5 py-1.5 text-[11px] text-emerald-900 flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold">Sudah kamu isi hari ini:</span>
                        <span className="text-emerald-800 truncate">
                          {myTodayFormsList.join(', ')}
                        </span>
                        {hasOtherActivityToday && (
                          <span className="text-[10px] text-emerald-700/80 font-medium">
                            (+ {otherTodaySubs.length} juri lain)
                          </span>
                        )}
                      </div>
                    )}

                    {!hasMyActivityToday && hasOtherActivityToday && (
                      <div className="rounded-lg bg-blue-50/70 px-2.5 py-1 text-[11px] text-blue-800 flex items-center justify-between">
                        <span>Baru dinilai oleh juri lain hari ini</span>
                        <span className="font-bold">{otherTodaySubs.length} form</span>
                      </div>
                    )}
                  </CardContent>
                </InteractiveCard>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Stage 2: Room selected, no form — Form Picker
  if (!form) {
    const dekorasiForms = activeForms.filter((f) => f.id === 'dekorasi');
    const fiveRForms = activeForms.filter((f) => f.id !== 'dekorasi');

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

    const FormCardButton = ({
      f,
      disabled: btnDisabled,
      icon,
    }: {
      f: { id: string; label: string; categories: unknown[] };
      disabled?: boolean;
      icon?: React.ReactNode;
    }) => {
      const total = (f.categories as { criteria: unknown[] }[]).reduce(
        (s, c) => s + c.criteria.length,
        0
      );
      const formMeta = forms.find((formItem) => formItem.id === f.id);
      const subsForF = allSubs.filter((s) => s.roomId === room && s.formId === f.id);
      const mySubsForF = subsForF.filter((s) => s.createdBy === me);
      const mySubsToday = mySubsForF.filter((s) => s.createdAt.startsWith(today));
      const allSubsToday = subsForF.filter((s) => s.createdAt.startsWith(today));

      const myLastSub = mySubsForF[mySubsForF.length - 1];
      const lastSubOverall = subsForF[subsForF.length - 1];
      const activeSubForScore = myLastSub || lastSubOverall;
      const lastScore =
        activeSubForScore && formMeta ? scoreSubmission(formMeta, activeSubForScore) : null;

      const isDekorasi = f.id === 'dekorasi';
      const hasSubmittedMyself = mySubsForF.length > 0;
      const hasSubmittedTodayMyself = mySubsToday.length > 0;
      const hasSubmittedTodayGlobal = allSubsToday.length > 0;

      return (
        <button
          key={f.id}
          type="button"
          disabled={btnDisabled || (isDekorasi && hasSubmittedMyself)}
          onClick={() => navigate({ to: basePath, search: { room, form: f.id } })}
          className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left transition cursor-pointer ${
            btnDisabled || (isDekorasi && hasSubmittedMyself)
              ? 'opacity-80 bg-muted/20 border-border'
              : 'bg-card border-border hover:border-primary/50 hover:bg-muted/30 hover:shadow-xs active:scale-[0.99]'
          }`}
        >
          <div className="flex items-start gap-3 min-w-0">
            {icon && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground mt-0.5">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-foreground">{f.label}</p>

                {/* Status Badges */}
                {isDekorasi ? (
                  hasSubmittedMyself ? (
                    <Badge
                      variant="outline"
                      className="bg-success/10 text-success border-success/30 text-[10px] font-bold"
                    >
                      <Check size={10} className="mr-0.5 inline" />
                      Sudah Kamu Nilai
                    </Badge>
                  ) : subsForF.length > 0 ? (
                    <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">
                      {subsForF.length}x Juri Lain
                    </Badge>
                  ) : null
                ) : hasSubmittedTodayMyself ? (
                  <Badge
                    variant="outline"
                    className="bg-success/10 text-success border-success/30 text-[10px] font-bold"
                  >
                    <Check size={10} className="mr-0.5 inline" />
                    Kamu ({mySubsToday.length}x Hari Ini)
                  </Badge>
                ) : hasSubmittedTodayGlobal ? (
                  <Badge
                    variant="outline"
                    className="bg-primary/10 text-primary border-primary/30 text-[10px] font-semibold"
                  >
                    {allSubsToday.length}x Auditor Lain Hari Ini
                  </Badge>
                ) : null}

                {btnDisabled && !hasSubmittedMyself && !hasSubmittedTodayGlobal && (
                  <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">
                    Nonaktif
                  </Badge>
                )}
              </div>

              {/* Subtitle / Timestamp */}
              {myLastSub ? (
                <div className="mt-1 flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    Olehmu: {formatSubDate(myLastSub.createdAt)}
                  </span>
                  {allSubsToday.length > mySubsToday.length && (
                    <>
                      <span className="text-muted-foreground/40">&middot;</span>
                      <span className="text-[11px] text-muted-foreground">
                        Total {allSubsToday.length}x hari ini (ada juri lain)
                      </span>
                    </>
                  )}
                </div>
              ) : lastSubOverall ? (
                <div className="mt-1 flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/80">
                    Terakhir: {formatSubDate(lastSubOverall.createdAt)}
                  </span>
                  <span className="text-muted-foreground/40">&middot;</span>
                  <span>oleh {lastSubOverall.auditor}</span>
                </div>
              ) : (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {total} kriteria penilaian · Skala nilai 1–5
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-2">
            {lastScore && (
              <ScoreBadge
                value={round1(lastScore.final)}
                showMax={false}
                className="min-w-8 justify-center font-black"
              />
            )}
            <ChevronRight size={16} className="text-muted-foreground/50" />
          </div>
        </button>
      );
    };

    return (
      <div className="space-y-4">
        <DeadlineBanner deadline={deadline} />

        {/* Selected Room Header */}
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <RoomIcon name={roomObj.icon} size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Ruangan Terpilih
                </p>
                <h1 className="truncate text-lg font-extrabold text-foreground">{roomObj.name}</h1>
                <p className="text-xs text-muted-foreground">PIC: {roomObj.pic}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: basePath })}
              className="text-xs font-semibold shrink-0 cursor-pointer"
            >
              <ArrowLeft size={13} className="mr-1" />
              Ganti Ruangan
            </Button>
          </CardContent>
        </Card>

        {/* Group 1: Lomba Dekorasi */}
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
                    Dinilai 1x per juri/auditor untuk setiap ruangan.
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
              {dekorasiForms.map((f) => (
                <FormCardButton
                  key={f.id}
                  f={f}
                  disabled={closed}
                  icon={<Paintbrush size={16} />}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Group 2: Audit Budaya 5R */}
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
                    Penilaian harian berkala selama periode perlombaan.
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
            <div className="space-y-2">
              {fiveRForms.map((f) => (
                <FormCardButton key={f.id} f={f} disabled={closed} icon={<Layers size={16} />} />
              ))}
              {disabledForms.map((f) => (
                <FormCardButton key={f.id} f={f} disabled icon={<Layers size={16} />} />
              ))}
            </div>
            {closed && (
              <p className="mt-2 text-xs font-medium text-destructive">
                <Lock size={12} className="mr-1 inline" />
                Penilaian telah ditutup karena melewati tenggat waktu.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Log Dialog Modal */}
        <Dialog open={logCategory !== null} onOpenChange={(open) => !open && setLogCategory(null)}>
          <DialogContent className="sm:max-w-md p-0 gap-0 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            {/* Modal Header */}
            <div className="p-4 bg-muted/30 border-b border-border/60 space-y-3">
              <div className="flex items-center gap-2.5 pr-8">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <History size={16} />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-sm font-extrabold text-foreground leading-tight truncate">
                    {logCategory === 'dekorasi' ? 'Log Penilaian Dekorasi' : 'Log Penilaian 5R'}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    Ruangan: <span className="font-bold text-foreground">{roomObj.name}</span>
                  </p>
                </div>
              </div>

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
            </div>

            {/* Modal Scrollable Body */}
            <div className="divide-y divide-border/50 max-h-[60vh] sm:max-h-[380px] overflow-y-auto overscroll-contain">
              {displayedLogSubs.length === 0 ? (
                <div className="py-12 px-4 text-center text-xs text-muted-foreground space-y-1.5">
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
                      className="p-3.5 hover:bg-muted/20 transition flex items-center justify-between gap-3"
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
                          <p className="text-[10px] text-muted-foreground/90 italic line-clamp-2 bg-muted/40 rounded-md px-2 py-1">
                            &quot;{noteList.join(' · ')}&quot;
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

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20 border-t border-border/50 text-xs">
              <span className="text-[11px] text-muted-foreground font-medium">
                Menampilkan <strong>{displayedLogSubs.length}</strong> dari{' '}
                <strong>{allCategorySubs.length}</strong> riwayat
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setLogCategory(null)}
                className="h-7 px-3 text-xs font-bold cursor-pointer"
              >
                Tutup
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
                  className="text-xs font-bold text-muted-foreground transition hover:text-foreground inline-flex items-center gap-1"
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
              className="text-xs"
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
            Melewati tenggat penilaian ({deadline ? new Date(deadline).toLocaleString('id-ID') : ''}
            ). Form tidak bisa diisi lagi.
          </AlertDescription>
          <div className="mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate({ to: basePath })}
              className="text-xs"
            >
              Kembali ke Daftar Ruangan
            </Button>
          </div>
        </Alert>
      ) : (
        <ScoringForm
          roomId={room}
          formId={form}
          onSuccess={() => navigate({ to: basePath, search: { room } })}
        />
      )}
    </div>
  );
}
