/**
 * RiwayatMingguIni — submission 5R minggu aktif dengan skor + detail.
 * Di-render sebagai Action Button / Card yang membuka ResponsiveDialog (Drawer di mobile, Dialog di desktop).
 */

import { Clock3, History, Search, UserCheck, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { currentWeekNumber } from '../../lib/dateUtils';
import { useForms, useRooms, useSubmissions } from '../../lib/queries';
import { round1, scoreSubmission } from '../../lib/scoring';
import { getSession } from '../../server/functions/auth';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { ResponsiveDialog } from '../ui/responsive-dialog';
import RoomIcon from './RoomIcon';
import ScoreBadge from './ScoreBadge';

export default function RiwayatMingguIni({
  startDate,
  variant = 'card',
}: {
  startDate: string | null;
  variant?: 'card' | 'button';
}) {
  const { data: subs = [] } = useSubmissions();
  const { data: rooms = [] } = useRooms();
  const { data: forms = [] } = useForms();
  const [currentUser, setCurrentUser] = useState('');
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    void getSession().then((session) => setCurrentUser(session.username ?? ''));
  }, []);

  const currentWeek = startDate ? currentWeekNumber(new Date(startDate)) : 0;
  const weekSubs = useMemo(
    () => (currentWeek > 0 ? subs.filter((s) => (s.weekNumber ?? 1) === currentWeek) : []),
    [subs, currentWeek]
  );
  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);
  const formMap = useMemo(() => new Map(forms.map((f) => [f.id, f])), [forms]);

  const myCount = useMemo(
    () => weekSubs.filter((s) => s.createdBy === currentUser).length,
    [weekSubs, currentUser]
  );

  const filteredSubs = useMemo(() => {
    let list = filter === 'mine' ? weekSubs.filter((s) => s.createdBy === currentUser) : weekSubs;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s) => {
        const roomName = (roomMap.get(s.roomId)?.name ?? s.roomId).toLowerCase();
        const formLabel = (formMap.get(s.formId)?.label ?? s.formId).toLowerCase();
        const auditor = s.auditor.toLowerCase();
        return roomName.includes(q) || formLabel.includes(q) || auditor.includes(q);
      });
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [weekSubs, filter, currentUser, searchQuery, roomMap, formMap]);

  const subsWithScore = useMemo(
    () =>
      filteredSubs.map((s) => {
        const form = formMap.get(s.formId);
        const score = form ? scoreSubmission(form, s) : null;
        return { sub: s, score };
      }),
    [filteredSubs, formMap]
  );

  if (weekSubs.length === 0) return null;

  return (
    <>
      {variant === 'button' ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setFilter(myCount > 0 ? 'mine' : 'all');
            setModalOpen(true);
          }}
          className="text-xs font-bold shrink-0 cursor-pointer h-9 px-3 shadow-2xs gap-1.5"
        >
          <History size={14} className="text-primary" />
          <span>Riwayat Log ({weekSubs.length})</span>
        </Button>
      ) : (
        /* Compact Mobile-First Trigger Card */
        <Card className="border-border/80 bg-gradient-to-r from-muted/50 via-muted/20 to-transparent hover:border-primary/40 transition-colors shadow-2xs">
          <CardContent className="p-3 sm:p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <History size={17} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-extrabold text-foreground truncate">
                    Riwayat Penilaian Minggu Ini
                  </p>
                  <Badge
                    variant="outline"
                    className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold px-1.5 py-0 shrink-0"
                  >
                    {weekSubs.length} form
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {myCount > 0
                    ? `Kamu telah mengisi ${myCount} form minggu ini.`
                    : 'Belum ada form yang kamu isi minggu ini.'}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setFilter(myCount > 0 ? 'mine' : 'all');
                setModalOpen(true);
              }}
              className="text-xs font-bold shrink-0 cursor-pointer h-8 px-3"
            >
              <Clock3 size={13} className="mr-1.5 text-primary" />
              <span>Buka Log</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Responsive Dialog Modal */}
      <ResponsiveDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <History size={15} />
            </div>
            <span>Riwayat Penilaian Minggu Ini</span>
          </div>
        }
        description={`Menampilkan form penilaian yang tersimpan pada minggu aktif (Minggu ke-${currentWeek}).`}
        footer={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setModalOpen(false)}
            className="w-full text-xs font-bold"
          >
            Tutup Riwayat
          </Button>
        }
      >
        <div className="space-y-3 pb-1">
          {/* Sub-Tabs: Punyaku vs Semua */}
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-border/80 bg-muted/60 p-1">
            <button
              type="button"
              onClick={() => setFilter('mine')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition cursor-pointer ${
                filter === 'mine'
                  ? 'bg-card text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserCheck size={13} />
              <span>Punyaku</span>
              <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-extrabold text-primary">
                {myCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition cursor-pointer ${
                filter === 'all'
                  ? 'bg-card text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Clock3 size={13} />
              <span>Semua Juri / Auditor</span>
              <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] font-extrabold text-muted-foreground">
                {weekSubs.length}
              </span>
            </button>
          </div>

          {/* Search bar inside modal */}
          <div className="relative">
            <Search
              size={13}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground/60"
            />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ruangan atau auditor..."
              className="h-8.5 pl-8.5 pr-8 text-xs bg-muted/30"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* List of submissions */}
          <div className="divide-y divide-border/60 rounded-xl border border-border/70 overflow-hidden bg-card max-h-[50vh] sm:max-h-[360px] overflow-y-auto">
            {subsWithScore.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
                <p className="font-semibold">Tidak ada riwayat penilaian yang sesuai.</p>
                {filter === 'mine' && weekSubs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilter('all')}
                    className="text-primary font-bold hover:underline cursor-pointer"
                  >
                    Lihat semua penilaian tim ({weekSubs.length})
                  </button>
                )}
              </div>
            ) : (
              subsWithScore.map(({ sub: s, score }) => {
                const room = roomMap.get(s.roomId);
                const form = formMap.get(s.formId);
                const isMine = s.createdBy === currentUser;
                const noteList = Object.values(s.notes || {}).filter(Boolean);

                return (
                  <div
                    key={s.id}
                    className="flex items-start gap-3 p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground mt-0.5">
                      <RoomIcon name={room?.icon ?? 'fa-cube'} size={16} />
                    </div>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-foreground text-xs">
                          {room?.name ?? s.roomId}
                        </span>
                        <span className="text-muted-foreground/40 text-[10px]">&middot;</span>
                        <span className="text-[11px] text-muted-foreground font-medium truncate">
                          {form?.label ?? s.formId}
                        </span>
                        {isMine && (
                          <Badge
                            variant="outline"
                            className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] px-1 py-0 font-bold"
                          >
                            Kamu
                          </Badge>
                        )}
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        Oleh <strong className="text-foreground/80">{s.auditor}</strong> &middot;{' '}
                        {new Date(s.createdAt).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>

                      {noteList.length > 0 && (
                        <p className="text-[10px] text-muted-foreground/90 italic bg-muted/40 rounded px-2 py-0.5 mt-1 line-clamp-2">
                          "{noteList.join(' · ')}"
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      {score ? (
                        <ScoreBadge
                          value={round1(score.final)}
                          showMax={false}
                          className="min-w-8 justify-center font-black"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground font-mono">--</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </ResponsiveDialog>
    </>
  );
}
