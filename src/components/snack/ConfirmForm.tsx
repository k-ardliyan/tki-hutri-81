/**
 * ConfirmForm — checklist anggota tim, petugas centang manual siapa yang ambil.
 * Refactored for:
 * 1. Full-width desktop container (w-full lg:grid lg:grid-cols-12)
 * 2. Tight compact member list (py-2.5 px-3.5 divide-y divide-border)
 * 3. Unified left column card for Team Info & Portion Counter
 * 4. Refined desktop & mobile submit bar
 */

import { ArrowLeft, CheckCircle2, Loader2, Users } from 'lucide-react';
import { useState } from 'react';
import type { SnackTeam } from '../../server/functions/snack';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Progress } from '../ui/progress';

interface ConfirmFormProps {
  team: SnackTeam;
  sessionName: string;
  submitting: boolean;
  onSubmit: (employeeIds: number[]) => void;
  onBack: () => void;
}

export default function ConfirmForm({
  team,
  sessionName,
  submitting,
  onSubmit,
  onBack,
}: ConfirmFormProps) {
  // Default: kosong semua — petugas centang manual
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirming, setConfirming] = useState(false);

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      if (prev.size === team.members.length) return new Set();
      return new Set(team.members.map((m) => m.employeeId));
    });
  };

  const allChecked = team.members.length > 0 && selected.size === team.members.length;
  const pct = team.members.length > 0 ? Math.round((selected.size / team.members.length) * 100) : 0;

  return (
    <div className="w-full space-y-3 lg:grid lg:grid-cols-12 lg:gap-5 lg:space-y-0 lg:items-start">
      {/* Left Column (Sticky on Desktop): Unified Team Info & Portion Counter Card */}
      <div className="space-y-3 lg:col-span-5 lg:sticky lg:top-20">
        <Card className="overflow-hidden border border-border divide-y divide-border shadow-xs">
          {/* Header Team Info */}
          <CardContent className="p-3.5 flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <Badge
                variant="outline"
                className="text-[10px] uppercase font-bold text-primary border-primary/30 bg-primary/10"
              >
                {sessionName}
              </Badge>
              <h1 className="truncate text-base font-extrabold text-foreground tracking-tight sm:text-lg">
                {team.nama}
              </h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Users size={13} className="text-muted-foreground shrink-0" />
                <span>{team.members.length} Anggota</span>
                <span>·</span>
                <span>
                  Kode: <strong className="font-mono text-foreground">{team.kode}</strong>
                </span>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="shrink-0 text-xs font-bold"
            >
              <ArrowLeft size={13} className="mr-1" /> Ganti
            </Button>
          </CardContent>

          {/* Portion Counter */}
          <CardContent className="p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Jumlah Snack Diambil
                </p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl font-extrabold tabular-nums text-foreground">
                    {selected.size}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    / {team.members.length} Porsi
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAll}
                className="text-xs font-bold shrink-0"
              >
                {allChecked ? 'Kosongkan Semua' : 'Centang Semua'}
              </Button>
            </div>
            <Progress value={pct} className="h-1.5" />
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Tight Member Checklist & Submit Action */}
      <div className="space-y-3 lg:col-span-7">
        {/* Tight Member Checklist Card */}
        <Card className="overflow-hidden border border-border divide-y divide-border shadow-xs">
          {team.members.map((m, idx) => {
            const checked = selected.has(m.employeeId);
            return (
              <label
                key={m.employeeId}
                onClick={() => toggle(m.employeeId)}
                className={`flex cursor-pointer items-center gap-3 px-3.5 py-2.5 transition select-none ${
                  checked ? 'bg-success/[0.08]' : 'bg-card hover:bg-muted/40'
                }`}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggle(m.employeeId)}
                  className="shrink-0"
                />
                <span className="w-5 shrink-0 text-xs font-bold text-muted-foreground/70">
                  {idx + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground leading-snug">
                    {m.nama}
                  </span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {m.divisi ?? '—'}
                    {m.nip ? ` · ${m.nip}` : ''}
                  </span>
                </span>
                <CheckCircle2
                  size={18}
                  className={`shrink-0 transition-colors ${
                    checked ? 'text-success' : 'text-muted-foreground/20'
                  }`}
                />
              </label>
            );
          })}
        </Card>

        {/* Submit Action */}
        <div className="sticky bottom-0 z-40 -mx-4 -mb-4 border-t border-border bg-background/95 px-4 py-3 shadow-lg backdrop-blur-md sm:-mx-6 sm:-mb-6 lg:static lg:mx-0 lg:mb-0 lg:p-0 lg:bg-transparent lg:shadow-none lg:border-t-0">
          <Button
            disabled={selected.size === 0}
            loading={submitting}
            onClick={() => {
              setConfirming(true);
              onSubmit([...selected]);
            }}
            size="lg"
            className="w-full text-sm font-bold shadow-md shadow-primary/20"
          >
            {submitting ? 'Menyimpan...' : `Konfirmasi ${selected.size} Porsi`}
          </Button>
          {confirming && (
            <p className="text-center text-[10px] font-medium text-muted-foreground mt-1.5">
              Pastikan centang sesuai jumlah snack yang diserahkan.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
