/**
 * DuplicateWarning — layar merah anti-duplikasi.
 * Muncul saat team/employee sudah pernah ambil snack di sesi ini.
 */
import { Clock, QrCode, TriangleAlert, User } from 'lucide-react';
import type { RedemptionInfo, SnackTeam } from '../../server/functions/snack';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

interface DuplicateWarningProps {
  team: SnackTeam;
  sessionName: string;
  skipped: RedemptionInfo[];
  onReset: () => void;
}

export default function DuplicateWarning({
  team,
  sessionName,
  skipped,
  onReset,
}: DuplicateWarningProps) {
  return (
    <div className="space-y-3 max-w-lg mx-auto">
      <Card className="border-destructive/40 bg-destructive/[0.04] rounded-2xl shadow-sm overflow-hidden">
        <CardContent className="flex flex-col items-center gap-2.5 py-6 sm:py-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-destructive/15 text-destructive shadow-sm animate-in zoom-in-50 duration-200">
            <TriangleAlert size={30} />
          </div>
          <h1 className="text-lg sm:text-xl font-black text-destructive tracking-tight">
            Sudah Pernah Mengambil!
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-foreground">
            {team.nama} · <span className="text-muted-foreground">{sessionName}</span>
          </p>
          <p className="mt-1 rounded-xl bg-background/80 border border-border/80 px-3.5 py-2 text-xs text-muted-foreground leading-relaxed max-w-xs">
            Anggota kelompok ini sudah tercatat mengambil snack pada sesi yang sama. Pengambilan
            ganda otomatis ditolak.
          </p>
        </CardContent>
      </Card>

      {/* Metadata pengambilan sebelumnya */}
      {skipped.length > 0 && (
        <Card className="rounded-2xl border border-border/80 shadow-xs">
          <CardContent className="p-3.5 space-y-2">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Catatan Pengambilan Sebelumnya
            </p>
            <div className="space-y-1.5">
              {skipped.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl bg-muted/50 border border-border/60 px-3 py-2 text-xs"
                >
                  <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                    <Clock size={13} className="text-primary shrink-0" />
                    {formatDate(r.claimedAt)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <User size={13} className="text-muted-foreground shrink-0" />
                    {r.claimedBy ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        onClick={onReset}
        size="lg"
        className="w-full h-11 text-sm font-bold rounded-xl shadow-md"
      >
        <QrCode size={16} className="mr-2" /> Scan Kelompok Lain
      </Button>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
