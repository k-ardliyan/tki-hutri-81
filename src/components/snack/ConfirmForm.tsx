/**
 * ConfirmForm — checklist anggota tim saat scan QR kelompok.
 * PRD §14-15: anggota yang sudah ambil = disabled + tampil waktu & petugas pencatat;
 * tombol besar "Pilih Semua Belum Ambil" untuk distribusi kelompok cepat.
 * Mobile-First UI/UX dengan safe-area bar & touch-friendly ergonomics.
 */

import { ArrowLeft, Check, CheckCircle2, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '../../lib/utils';
import type { SnackTeam } from '../../server/functions/snack';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Progress } from '../ui/progress';

export interface ConfirmMemberClaim {
  claimedBy: string | null;
  claimedAt: string | null;
  voidedAt?: string | null;
}

interface ConfirmFormProps {
  team: SnackTeam;
  sessionName: string;
  submitting: boolean;
  /** Status klaim per employee (session-aware). Anggota yang claimed → disabled. */
  claimed?: Map<number, ConfirmMemberClaim>;
  onSubmit: (employeeIds: number[]) => void;
  onBack: () => void;
}

export default function ConfirmForm({
  team,
  sessionName,
  submitting,
  claimed,
  onSubmit,
  onBack,
}: ConfirmFormProps) {
  // Default: kosong semua — petugas centang manual siapa yang benar-benar ambil.
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const claimedMap = claimed ?? new Map<number, ConfirmMemberClaim>();
  const claimedIds = useMemo(
    () =>
      new Set(
        [...claimedMap.entries()].filter(([, c]) => c.claimedBy && !c.voidedAt).map(([id]) => id)
      ),
    [claimedMap]
  );
  const selectable = team.members.filter((m) => !claimedIds.has(m.employeeId));
  const selectedClaimed = [...selected].filter((id) => claimedIds.has(id));

  const toggle = (id: number) => {
    if (claimedIds.has(id)) return; // sudah ambil — tidak bisa dipilih ulang
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      if (prev.size === selectable.length) return new Set();
      return new Set(selectable.map((m) => m.employeeId));
    });
  };

  const allChecked = selectable.length > 0 && selected.size === selectable.length;
  const pct = team.members.length > 0 ? Math.round((selected.size / team.members.length) * 100) : 0;

  return (
    <div className="w-full space-y-3 lg:grid lg:grid-cols-12 lg:gap-5 lg:space-y-0 lg:items-start pb-20 lg:pb-0">
      {/* Left Column (Sticky on Desktop): Unified Team Info & Portion Counter Card */}
      <div className="space-y-3 lg:col-span-5 lg:sticky lg:top-20">
        <Card className="overflow-hidden border border-border/80 divide-y divide-border/60 shadow-sm rounded-2xl bg-card">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <Badge
                variant="outline"
                className="text-[10px] uppercase font-extrabold text-primary border-primary/30 bg-primary/10 px-2 py-0.5 rounded-md"
              >
                {sessionName}
              </Badge>
              <h1 className="truncate text-base sm:text-lg font-black text-foreground tracking-tight">
                {team.nama}
              </h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                <Users size={13} className="text-primary shrink-0" />
                <span>{team.members.length} Anggota</span>
                <span>·</span>
                <span>
                  Kode: <strong className="font-mono text-foreground font-bold">{team.kode}</strong>
                </span>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="shrink-0 text-xs font-bold rounded-xl h-9 px-3"
            >
              <ArrowLeft size={14} className="mr-1" /> Ganti
            </Button>
          </CardContent>

          <CardContent className="p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Snack Yang Diambil
                </p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-3xl font-black tabular-nums text-primary">
                    {selected.size}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    / {selectable.length} Belum Ambil
                  </span>
                </div>
                {claimedIds.size > 0 && (
                  <p className="mt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check size={12} /> {claimedIds.size} sudah mengambil sebelumnya
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAll}
                disabled={selectable.length === 0}
                className={cn(
                  'text-xs font-bold shrink-0 rounded-xl h-9 px-3',
                  allChecked ? 'border-primary text-primary' : ''
                )}
              >
                {allChecked ? 'Kosongkan' : 'Pilih Semua'}
              </Button>
            </div>
            <Progress value={pct} className="h-2 rounded-full" />
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Member Checklist & Submit Action */}
      <div className="space-y-3 lg:col-span-7">
        <Card className="overflow-hidden border border-border/80 divide-y divide-border/60 shadow-sm rounded-2xl bg-card">
          <div className="p-3 bg-muted/40 text-xs font-bold text-muted-foreground flex items-center justify-between">
            <span>Daftar Anggota Kelompok</span>
            <span>
              {selected.size} dari {team.members.length} dipilih
            </span>
          </div>

          {team.members.map((m, idx) => {
            const claim = claimedMap.get(m.employeeId);
            const isClaimed = claimedIds.has(m.employeeId);
            const checked = selected.has(m.employeeId);
            const inputId = `member-${m.employeeId}`;
            return (
              <label
                key={m.employeeId}
                htmlFor={inputId}
                className={cn(
                  'flex cursor-pointer items-center gap-3.5 p-3.5 transition-colors select-none',
                  isClaimed
                    ? 'bg-muted/30 opacity-75 cursor-not-allowed'
                    : checked
                      ? 'bg-primary/[0.07]'
                      : 'bg-card hover:bg-muted/40'
                )}
              >
                <Checkbox
                  id={inputId}
                  checked={checked}
                  disabled={isClaimed}
                  onCheckedChange={() => toggle(m.employeeId)}
                  className="size-5 rounded-md shrink-0 border-2"
                />
                <span className="w-5 shrink-0 text-xs font-bold text-muted-foreground/60 text-center">
                  {idx + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block text-sm font-bold leading-snug',
                      isClaimed ? 'text-muted-foreground line-through' : 'text-foreground'
                    )}
                  >
                    {m.nama}
                  </span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {m.divisi ?? 'Umum'}
                    {m.nip ? ` · ${m.nip}` : ''}
                  </span>
                  {isClaimed && claim?.claimedAt && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      <Check size={11} />
                      Sudah {formatTime(claim.claimedAt)}
                      {claim.claimedBy ? ` · oleh ${claim.claimedBy}` : ''}
                    </span>
                  )}
                </span>
                <CheckCircle2
                  size={20}
                  className={cn(
                    'shrink-0 transition-colors',
                    isClaimed
                      ? 'text-emerald-600/50'
                      : checked
                        ? 'text-primary'
                        : 'text-muted-foreground/20'
                  )}
                />
              </label>
            );
          })}
        </Card>

        {/* Submit Action — Safe Area Friendly Sticky Bottom */}
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 p-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] shadow-xl backdrop-blur-md lg:static lg:p-0 lg:bg-transparent lg:shadow-none lg:border-t-0">
          <div className="max-w-7xl mx-auto px-0 sm:px-2 space-y-1.5">
            <Button
              disabled={selected.size === 0 || selectedClaimed.length > 0}
              loading={submitting}
              onClick={() => onSubmit([...selected])}
              size="lg"
              className="w-full h-12 text-sm sm:text-base font-extrabold shadow-lg rounded-xl shadow-primary/25"
            >
              {submitting ? 'Menyimpan Pengambilan...' : `Konfirmasi ${selected.size} Porsi Snack`}
            </Button>
            <p className="text-center text-[11px] font-medium text-muted-foreground">
              Pastikan centang sesuai jumlah porsi snack yang diserahkan fisik.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}
