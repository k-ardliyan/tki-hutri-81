/**
 * SnackTeamAccordion — status tim (shadcn Accordion) + detail siapa ambil.
 * Detail di-load lazily saat item pertama kali dibuka.
 */

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getRedemptionsBySession } from '../../server/functions/snack';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Badge } from '../ui/badge';

interface TeamDetail {
  id: number;
  nama: string;
  kode: string;
  kategori: string;
  total: number;
  redeemed: number;
  done: boolean;
  full: boolean;
}

interface RedeemedMember {
  employeeId: number;
  nama: string;
  nip: string | null;
  divisi: string | null;
  claimedBy: string | null;
  claimedAt: string | null;
}

interface Props {
  teams: TeamDetail[];
  sessionId: number | null;
}

export default function SnackTeamAccordion({ teams, sessionId }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [details, setDetails] = useState<Map<number, RedeemedMember[]>>(new Map());
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
    >
      {teams.map((t) => {
        const members = details.get(t.id) ?? null;
        const isLoading = loading === t.id;

        return (
          <AccordionItem key={t.id} value={String(t.id)} className="border-border">
            <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/40">
              <span className="flex min-w-0 items-center gap-2.5">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${t.done ? 'bg-success' : t.redeemed > 0 ? 'bg-warning' : 'bg-muted-foreground/30'}`}
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground/90">
                    {t.nama}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">{t.kode}</span>
                </span>
              </span>
              <Badge
                className={`mr-5 shrink-0 ${
                  t.full
                    ? 'bg-success/10 text-success'
                    : t.done
                      ? 'bg-warning/10 text-warning'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {t.redeemed}/{t.total}
              </Badge>
            </AccordionTrigger>
            <AccordionContent className="bg-muted/40 px-4 pb-3">
              {isLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="size-4 animate-spin text-muted-foreground/50" />
                </div>
              )}
              {!isLoading && members && (
                <div className="space-y-1">
                  {members.filter((m) => m.claimedBy).length > 0 && (
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-success">
                        Sudah Ambil
                      </p>
                      {members
                        .filter((m) => m.claimedBy)
                        .map((m) => (
                          <div
                            key={m.employeeId}
                            className="flex items-center justify-between py-1.5"
                          >
                            <div>
                              <p className="text-xs font-semibold text-foreground/80">{m.nama}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {m.divisi ?? ''}
                                {m.nip ? ` · ${m.nip}` : ''}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-semibold text-muted-foreground">
                                {m.claimedBy}
                              </p>
                              {m.claimedAt && (
                                <p className="text-[9px] text-muted-foreground/60">
                                  {new Date(m.claimedAt).toLocaleTimeString('id-ID', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                  {members.filter((m) => !m.claimedBy).length > 0 && (
                    <div
                      className={
                        members.filter((m) => m.claimedBy).length > 0
                          ? 'mt-2 border-t border-border pt-2'
                          : ''
                      }
                    >
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Belum
                      </p>
                      {members
                        .filter((m) => !m.claimedBy)
                        .map((m) => (
                          <p key={m.employeeId} className="py-1 text-xs text-muted-foreground">
                            {m.nama}
                          </p>
                        ))}
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
