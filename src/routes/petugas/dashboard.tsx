/**
 * PetugasDashboard — dashboard petugas, mobile-first.
 * CTA "Ambil Tanpa QR" prominent di atas → buka Drawer search (bottom sheet).
 * Detail per tim: accordion siapa sudah ambil.
 */

import { createFileRoute } from '@tanstack/react-router';
import { ChevronRight, Loader2, Search, UserPlus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PetugasDashboardSkeleton } from '~/components/loading/skeletons';
import { SectionCards } from '../../components/section-cards';
import SnackTeamAccordion from '../../components/snack/SnackTeamAccordion';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { PageHeader } from '../../components/ui/page-header';
import { ResponsiveDialog } from '../../components/ui/responsive-dialog';
import { StatusBadge } from '../../components/ui/status-badge';
import { useDebounce } from '../../hooks/use-debounce';
import { getRedemptionSummary, redeemSnack, searchEmployees } from '../../server/functions/snack';

export const Route = createFileRoute('/petugas/dashboard')({
  component: PetugasDashboardPage,
  pendingComponent: PetugasDashboardSkeleton,
});

interface SearchResult {
  id: number;
  nama: string;
  nip: string | null;
  divisi: string | null;
}

type Summary = {
  active: { id: number; name: string; quota: number; isActive: boolean; createdAt: Date } | null;
  teams: Array<{
    id: number;
    nama: string;
    kode: string;
    kategori: string;
    total: number;
    redeemed: number;
    done: boolean;
    full: boolean;
  }>;
  totalRedeemed: number;
  totalQuota: number;
  sessions: Array<{ id: number; name: string; quota: number; isActive: boolean; createdAt: Date }>;
};

function PetugasDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [sessionId, setSessionId] = useState<number | null>(null);

  // Drawer "Ambil Tanpa QR"
  const [showSearch, setShowSearch] = useState(false);
  const [q, setQ] = useState('');
  const debouncedQ = useDebounce(q, 300);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const s = await getRedemptionSummary({ data: {} });
        setSummary(s);
        setSessionId(s.active?.id ?? null);
      } finally {
        setSummaryLoading(false);
      }
    };
    void init();
  }, []);

  useEffect(() => {
    if (!debouncedQ.trim()) {
      setResults([]);
      return;
    }
    const doSearchDebounced = async () => {
      setErr(null);
      setSearching(true);
      try {
        const res = await searchEmployees({ data: { q: debouncedQ.trim(), limit: 8 } });
        setResults(res);
      } catch {
        setErr('Gagal mencari karyawan');
      } finally {
        setSearching(false);
      }
    };
    void doSearchDebounced();
  }, [debouncedQ]);

  const openSearch = () => {
    setQ('');
    setResults([]);
    setErr(null);
    setShowSearch(true);
  };

  const doSearch = async () => {
    setErr(null);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await searchEmployees({ data: { q, limit: 8 } });
      setResults(res);
    } catch {
      setErr('Gagal mencari karyawan');
    } finally {
      setSearching(false);
    }
  };

  const [redeemingId, setRedeemingId] = useState<number | null>(null);

  const redeemOne = async (id: number) => {
    if (!sessionId) {
      setErr('Tidak ada sesi aktif');
      return;
    }
    setErr(null);
    setRedeemingId(id);
    try {
      const res = await redeemSnack({ data: { sessionId, employeeIds: [id] } });
      if (!res.ok) {
        setErr(res.error ?? 'Gagal');
        return;
      }
      if (res.skipped.length > 0) {
        const r = res.skipped[0];
        setErr(`${r.claimedBy} sudah ambil pada ${new Date(r.claimedAt).toLocaleString('id-ID')}`);
      } else {
        toast.success('1 porsi dicatat!');
        setResults([]);
        setQ('');
        const s = await getRedemptionSummary({ data: {} });
        setSummary(s);
      }
    } catch {
      setErr('Terjadi kesalahan saat mencatat snack');
    } finally {
      setRedeemingId(null);
    }
  };

  const active = summary?.active;
  const teams = summary?.teams ?? [];

  // Show full-page skeleton while data loads
  if (summaryLoading) return <PetugasDashboardSkeleton />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <PageHeader
        title="Dashboard Snack"
        subtitle={`Sesi: ${active?.name ?? '—'} · ${active?.quota ?? 0} kuota`}
      />

      {/* CTA prominent — Ambil Tanpa QR (mobile-first, di atas) */}
      <button
        type="button"
        onClick={openSearch}
        className="flex w-full items-center gap-3 rounded-xl bg-primary p-4 text-left shadow-md shadow-primary/10 transition hover:brightness-105 active:scale-[0.99] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
          <UserPlus size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold text-white">Ambil Snack Tanpa QR</span>
          <span className="block text-xs text-white/80">
            Cari karyawan, catat pengambilan langsung
          </span>
        </span>
        <ChevronRight size={18} className="text-white/70" />
      </button>

      {/* Summary cards */}
      <SectionCards
        gridClass="grid-cols-2"
        stats={[
          {
            label: 'Kelompok Ambil',
            value: `${active ? teams.filter((t) => t.done).length : 0}/${teams.length}`,
            action: (
              <Badge variant="outline">
                <Users className="mr-1 size-3.5" />
                {teams.length}
              </Badge>
            ),
          },
          {
            label: 'Porsi Terambil',
            value: `${active ? (summary?.totalRedeemed ?? 0) : 0}/${active?.quota ?? 0}`,
            action: (
              <StatusBadge status="warning">
                {active
                  ? Math.round(((summary?.totalRedeemed ?? 0) / Math.max(1, active.quota)) * 100)
                  : 0}
                %
              </StatusBadge>
            ),
          },
        ]}
      />

      {/* Accordion detail per tim */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-bold text-muted-foreground mb-2">Detail Kelompok</p>
          {teams.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">Belum ada data.</p>
          ) : (
            <SnackTeamAccordion teams={teams} sessionId={active?.id ?? null} />
          )}
        </CardContent>
      </Card>

      {/* Responsive Modal — Ambil Tanpa QR */}
      <ResponsiveDialog
        open={showSearch}
        onOpenChange={setShowSearch}
        title="Ambil Tanpa QR"
        description="Cari karyawan, lalu catat pengambilan."
      >
        <div className="space-y-3">
          {/* Search input */}
          <div className="space-y-1.5">
            <Label>Cari Karyawan</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground/60"
                />
                <Input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                  placeholder="Nama / NIP"
                  autoFocus
                  className="pl-9"
                />
              </div>
              <Button onClick={doSearch} disabled={!q.trim() || searching}>
                {searching ? <Loader2 size={14} className="animate-spin" /> : 'Cari'}
              </Button>
            </div>
          </div>

          {/* Feedback */}
          {err && (
            <Alert variant="destructive">
              <AlertDescription>{err}</AlertDescription>
            </Alert>
          )}

          {/* Empty state */}
          {!searching && results.length === 0 && !err && (
            <div className="rounded-xl bg-muted/50 px-4 py-6 text-center">
              <Users size={20} className="mx-auto text-muted-foreground/40" />
              <p className="mt-2 text-xs font-semibold text-muted-foreground">
                Ketik nama atau NIP untuk mencari
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                Karyawan PKL tidak tampil (tidak eligible)
              </p>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="divide-y divide-border rounded-lg border border-border max-h-60 overflow-y-auto">
              {results.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                    {r.nama.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground/90">{r.nama}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {r.divisi ?? '—'}
                      {r.nip ? ` · ${r.nip}` : ''}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    loading={redeemingId === r.id}
                    onClick={() => redeemOne(r.id)}
                    className="shrink-0 rounded-full px-3.5"
                  >
                    Ambil
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </ResponsiveDialog>
    </div>
  );
}
