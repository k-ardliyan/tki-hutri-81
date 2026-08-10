/**
 * DuplicateWarning — layar merah anti-duplikasi.
 * Muncul saat team/employee sudah pernah ambil snack di sesi ini.
 */
import { Clock, TriangleAlert, User } from 'lucide-react';
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
    <div className="space-y-3">
      <Card className="border-destructive/40 bg-destructive/[0.03]">
        <CardContent className="flex flex-col items-center gap-2 py-5 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <TriangleAlert size={24} />
          </div>
          <h1 className="mt-1 text-lg font-extrabold text-destructive">Sudah Pernah Ambil!</h1>
          <p className="text-sm text-muted-foreground">
            {team.nama} — {sessionName}
          </p>
          <p className="mt-2 rounded-md bg-background/70 px-3 py-2 text-xs text-muted-foreground">
            Kelompok ini sudah mengambil snack pada sesi yang sama. Pengambilan ganda ditolak.
          </p>
        </CardContent>
      </Card>

      {/* Metadata pengambilan sebelumnya */}
      {skipped.length > 0 && (
        <Card>
          <CardContent>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Pengambilan sebelumnya
            </p>
            <div className="mt-2 space-y-2">
              {skipped.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-xs"
                >
                  <span className="inline-flex items-center gap-1 font-semibold text-foreground/70">
                    <Clock size={12} className="text-muted-foreground/60" />
                    {formatDate(r.claimedAt)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <User size={12} className="text-muted-foreground/60" />
                    {r.claimedBy}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Button variant="outline" onClick={onReset} className="w-full py-3 text-sm font-bold">
        Scan Kelompok Lain
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
