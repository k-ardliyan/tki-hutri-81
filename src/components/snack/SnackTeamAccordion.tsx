/**
 * SnackTeamAccordion — progress kelompok (PRD §28) + detail siapa ambil.
 * Status: NOT_STARTED / PARTIAL / COMPLETE.
 * Detail di-load lazily saat item pertama kali dibuka; menampilkan source & void.
 * Mobile-First UI/UX: trigger tidak terpotong di layar HP, badge status jelas.
 */

import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import {
  getRedemptionsBySession,
  type MemberRedemptionDetail,
  type TeamProgressRow,
} from '../../server/functions/snack';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Badge } from '../ui/badge';

interface Props {
  teams: TeamProgressRow[];
  sessionId: number | null;
}

const STATUS_CONFIG: Record<
  TeamProgressRow['status'],
  { label: string; dotClass: string; badgeClass: string }
> = {
  COMPLETE: {
    label: 'Lengkap',
    dotClass: 'bg-emerald-500',
    badgeClass:
      'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold',
  },
  PARTIAL: {
    label: 'Sebagian',
    dotClass: 'bg-amber-500',
    badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold',
  },
  NOT_STARTED: {
    label: 'Belum',
    dotClass: 'bg-muted-foreground/30',
    badgeClass: 'border-border bg-muted text-muted-foreground font-medium',
  },
};

const SOURCE_LABEL: Record<string, string> = {
  QR_TEAM: 'QR',
  SEARCH: 'Cari',
  ADMIN_CORRECTION: 'Koreksi',
  MIGRATION: 'Migrasi',
};

export default function SnackTeamAccordion({ teams, sessionId }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [details, setDetails] = useState<Map<number, MemberRedemptionDetail[]>>(new Map());
  const [loading, setLoading] = useState<number | null>(null);

  // Lazy load detail saat accordion terbuka
  useEffect(() => {
    if (!openId || !sessionId) return;
    const teamId = Number(openId);
    if (details.has(teamId) || loading === teamId) return;
    setLoading(teamId);
    getRedemptionsBySession({ data: { sessionId, teamId } })
      .then((members) => setDetails((prev) => new Map(prev).set(teamId, members)))
      .finally(() => setLoading(null));
  }, [openId, sessionId, details, loading]);

  return (
    <Accordion
      type="single"
      collapsible
      value={openId ?? undefined}
      onValueChange={(v) => setOpenId(v ?? null)}
      className="divide-y divide-border/60 border border-border/80 rounded-2xl overflow-hidden shadow-xs bg-card"
    >
      {teams.map((t) => {
        const members = details.get(t.id) ?? null;
        const isLoading = loading === t.id;
        const cfg = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.NOT_STARTED;
        const claimedCount = t.claimed;
        const totalCount = t.total;

        return (
          <AccordionItem key={t.id} value={String(t.id)} className="border-0">
            <AccordionTrigger className="px-3.5 py-3 hover:no-underline hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                <span className={cn('size-2.5 shrink-0 rounded-full', cfg.dotClass)} />
                <div className="min-w-0 text-left">
                  <p className="truncate text-xs sm:text-sm font-bold text-foreground">{t.nama}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{t.kode}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono font-bold text-foreground">
                  {claimedCount}/{totalCount}
                </span>
                <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', cfg.badgeClass)}>
                  {cfg.label}
                </Badge>
              </div>
            </AccordionTrigger>

            <AccordionContent className="bg-muted/20 px-3.5 pt-2 pb-3.5 border-t border-border/40">
              {isLoading && (
                <div className="flex items-center justify-center py-4 text-xs text-muted-foreground gap-2">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  <span>Memuat anggota kelompok...</span>
                </div>
              )}

              {!isLoading && members && (
                <div className="space-y-3 pt-1">
                  {/* Sudah Ambil */}
                  {members.filter((m) => m.claimedBy && !m.voidedAt).length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        Sudah Mengambil ({members.filter((m) => m.claimedBy && !m.voidedAt).length})
                      </p>
                      <div className="divide-y divide-border/50 rounded-xl bg-card border border-border/80 overflow-hidden">
                        {members
                          .filter((m) => m.claimedBy && !m.voidedAt)
                          .map((m) => (
                            <div
                              key={m.employeeId}
                              className="flex items-center justify-between gap-2 p-2.5 text-xs"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-foreground">{m.nama}</p>
                                <p className="truncate text-[10px] text-muted-foreground">
                                  {m.divisi ?? 'Umum'}
                                  {m.nip ? ` · ${m.nip}` : ''}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="flex items-center gap-1 justify-end">
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] px-1 py-0 font-medium"
                                  >
                                    {SOURCE_LABEL[m.source as keyof typeof SOURCE_LABEL] ??
                                      m.source}
                                  </Badge>
                                </div>
                                {m.claimedAt && (
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {formatTime(m.claimedAt)}
                                    {m.claimedBy ? ` · ${m.claimedBy}` : ''}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Belum Ambil */}
                  {members.filter((m) => !m.claimedBy || m.voidedAt).length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Circle size={11} className="text-muted-foreground/60" />
                        Belum Mengambil ({members.filter((m) => !m.claimedBy || m.voidedAt).length})
                      </p>
                      <div className="divide-y divide-border/50 rounded-xl bg-card border border-border/80 overflow-hidden">
                        {members
                          .filter((m) => !m.claimedBy || m.voidedAt)
                          .map((m) => (
                            <div
                              key={m.employeeId}
                              className="flex items-center justify-between gap-2 p-2.5 text-xs"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-medium text-muted-foreground">
                                  {m.nama}
                                </p>
                                <p className="truncate text-[10px] text-muted-foreground/70">
                                  {m.divisi ?? 'Umum'}
                                  {m.nip ? ` · ${m.nip}` : ''}
                                </p>
                              </div>
                              {m.voidedAt && (
                                <Badge
                                  variant="destructive"
                                  className="text-[9px] px-1.5 py-0 shrink-0"
                                >
                                  Dibatalkan
                                </Badge>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}
