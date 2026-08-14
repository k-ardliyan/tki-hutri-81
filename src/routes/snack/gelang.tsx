import { createFileRoute } from '@tanstack/react-router';
import { Layers, Printer } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { SnackGelangSkeleton } from '~/components/loading/skeletons';
import BarcodeAll from '~/components/snack/BarcodeAll';
import GelangPrint from '~/components/snack/GelangPrint';
import { Card, CardContent } from '~/components/ui/card';
import { Combobox, type ComboboxOption } from '~/components/ui/combobox';
import { requireRole } from '~/lib/routeGuard';
import type { SnackTeam } from '~/server/functions/snack';
import { getTeamsWithMembers } from '~/server/functions/snack';

const searchSchema = z.object({
  team: z.string().optional(),
});

export const Route = createFileRoute('/snack/gelang')({
  beforeLoad: async () => {
    await requireRole(['superadmin', 'admin']);
  },
  validateSearch: searchSchema,
  component: GelangPage,
  pendingComponent: SnackGelangSkeleton,
});

function GelangPage() {
  const { team: teamParam } = Route.useSearch();
  const [teams, setTeams] = useState<SnackTeam[]>([]);
  const [selected, setSelected] = useState<SnackTeam | null>(null);
  const [viewAll, setViewAll] = useState<boolean>(!teamParam);
  const [teamsLoading, setTeamsLoading] = useState(true);

  const teamOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: '__all__', label: `Semua Kelompok (${teams.length} Tim - Sheet A4)` },
      ...teams.map((t) => ({
        value: t.kode,
        label: `${t.nama} (${t.members.length} org)`,
      })),
    ],
    [teams]
  );

  useEffect(() => {
    void getTeamsWithMembers().then((t) => {
      setTeams(t);
      if (teamParam) {
        const found = t.find((x) => x.kode === teamParam) ?? null;
        setSelected(found);
        setViewAll(false);
      } else {
        setViewAll(true);
      }
      setTeamsLoading(false);
    });
  }, [teamParam]);

  if (teamsLoading) {
    return <SnackGelangSkeleton />;
  }

  return (
    <div className="space-y-5">
      {/* Header & Controls (Hidden when printing) */}
      <Card className="border border-border/80 bg-gradient-to-br from-card to-muted/20 shadow-xs rounded-2xl overflow-hidden print:hidden">
        <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                <Printer size={17} />
              </div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-foreground">
                Generate & Cetak Gelang Snack
              </h1>
            </div>
            <p className="text-xs text-muted-foreground pl-10">
              Desain gelang vektor pita A4 (190 × 25 mm) dengan QR Code di kiri, Nama Tim di tengah,
              dan ornamen HUT RI di kanan.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 min-w-[260px]">
            {/* Toggle view all button */}
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setViewAll(true);
              }}
              className={`flex items-center gap-1.5 h-10 px-3.5 rounded-xl text-xs font-bold transition-all ${
                viewAll
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Layers size={14} />
              Semua Tim
            </button>

            {/* Combobox for specific team */}
            <div className="flex-1 min-w-[200px]">
              <Combobox
                options={teamOptions}
                value={viewAll ? '__all__' : (selected?.kode ?? '')}
                onValueChange={(val) => {
                  if (val === '__all__' || !val) {
                    setSelected(null);
                    setViewAll(true);
                  } else {
                    const t = teams.find((x) => x.kode === val);
                    setSelected(t ?? null);
                    setViewAll(false);
                  }
                }}
                placeholder="Pilih kelompok..."
                searchPlaceholder="Cari kelompok..."
                triggerClassName="w-full h-10 rounded-xl text-xs sm:text-sm font-semibold"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Gelang Print Component */}
      <GelangPrint selectedTeam={viewAll ? null : selected} allTeams={teams} />

      {/* Barcode Master QR Grid (Collapsible/Optional) */}
      <div className="print:hidden">
        <details className="group rounded-2xl border border-border/70 bg-card overflow-hidden transition-all">
          <summary className="flex items-center justify-between p-4 cursor-pointer select-none text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary" />
              Kelola & Download File QR Code Standalone (.PNG / .ZIP)
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground group-open:rotate-180 transition-transform">
              ▼
            </span>
          </summary>
          <div className="p-4 pt-0 border-t border-border/50">
            <BarcodeAll />
          </div>
        </details>
      </div>
    </div>
  );
}
