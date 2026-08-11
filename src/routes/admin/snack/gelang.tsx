import { createFileRoute } from '@tanstack/react-router';
import { Printer } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { DataTableSkeleton } from '~/components/loading/skeletons';
import BarcodeAll from '../../../components/snack/BarcodeAll';
import GelangPrint from '../../../components/snack/GelangPrint';
import { Card, CardContent } from '../../../components/ui/card';
import { Combobox, type ComboboxOption } from '../../../components/ui/combobox';
import { PageHeader } from '../../../components/ui/page-header';
import type { SnackTeam } from '../../../server/functions/snack';
import { getTeamsWithMembers } from '../../../server/functions/snack';

const searchSchema = z.object({
  team: z.string().optional(),
});

export const Route = createFileRoute('/admin/snack/gelang')({
  validateSearch: searchSchema,
  component: GelangPage,
  pendingComponent: DataTableSkeleton,
});

function GelangPage() {
  const { team: teamParam } = Route.useSearch();
  const [teams, setTeams] = useState<SnackTeam[]>([]);
  const [selected, setSelected] = useState<SnackTeam | null>(null);
  const [teamsLoading, setTeamsLoading] = useState(true);

  const teamOptions = useMemo<ComboboxOption[]>(
    () => teams.map((t) => ({ value: t.kode, label: `${t.nama} (${t.members.length} org)` })),
    [teams]
  );

  useEffect(() => {
    void getTeamsWithMembers().then((t) => {
      setTeams(t);
      const found = t.find((x) => x.kode === teamParam) ?? null;
      setSelected(found);
      setTeamsLoading(false);
    });
  }, [teamParam]);

  if (teamsLoading) {
    return <DataTableSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Generate & Cetak Gelang"
        subtitle="QR = kode tim, dicetak per anggota. Ukuran A4 otomatis."
        action={
          <Combobox
            options={teamOptions}
            value={selected?.kode ?? ''}
            onValueChange={(val) => {
              const t = teams.find((x) => x.kode === val);
              setSelected(t ?? null);
            }}
            placeholder="Pilih kelompok..."
            searchPlaceholder="Cari kelompok..."
            triggerClassName="w-full sm:w-64 h-9"
          />
        }
      />

      {!selected && (
        <Card className="p-8 text-center">
          <CardContent className="flex flex-col items-center gap-2">
            <Printer size={24} className="text-muted-foreground/40" />
            <p className="text-sm font-bold text-foreground/80">
              Pilih kelompok untuk generate gelang
            </p>
            <p className="text-xs text-muted-foreground">
              Gelang dicetak per anggota, QR berisi kode tim.
            </p>
          </CardContent>
        </Card>
      )}

      {selected && <GelangPrint team={selected} />}

      {/* Barcode semua tim — download satu PNG */}
      <BarcodeAll />
    </div>
  );
}
