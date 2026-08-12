/**
 * Skeleton shapes untuk komponen-komponen umum dashboard.
 * Gunakan komponen ini untuk menampilkan skeleton loading state
 * sebelum data tersedia dari React Query / useEffect.
 */

import { Card, CardContent } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { cn } from '~/lib/utils';

// ── Stat Cards (SectionCards) ──────────────────────────────────────────────

/** Skeleton untuk satu stat card */
export function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="h-8 w-16 rounded" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </CardContent>
    </Card>
  );
}

/** Skeleton untuk grid SectionCards (default 4 kolom) */
export function SectionCardsSkeleton({
  count = 4,
  gridClass = 'grid-cols-2 lg:grid-cols-4',
}: {
  count?: number;
  gridClass?: string;
}) {
  return (
    <div className={cn('grid gap-3', gridClass)}>
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ── Room / Interactive Card List ───────────────────────────────────────────

/** Skeleton untuk satu InteractiveCard ruangan */
export function RoomCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3.5">
        <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3.5 w-32 rounded" />
          <Skeleton className="h-3 w-24 rounded" />
        </div>
        <Skeleton className="h-6 w-14 rounded-full" />
      </CardContent>
    </Card>
  );
}

/** Skeleton grid untuk daftar ruangan */
export function RoomListSkeleton({
  count = 6,
  gridClass = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
}: {
  count?: number;
  gridClass?: string;
}) {
  return (
    <div className={cn('grid gap-2.5', gridClass)}>
      {Array.from({ length: count }).map((_, i) => (
        <RoomCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Skeleton papan skor live */
export function LiveScoreSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** Skeleton list vertikal untuk ruangan (tanpa grid) */
export function RoomListStackSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <RoomCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ── DataTable Row Skeletons ────────────────────────────────────────────────

/** Skeleton untuk satu baris DataTable */
function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton
            className={cn('h-4 rounded', i === 0 ? 'w-36' : i === cols - 1 ? 'w-16' : 'w-24')}
          />
        </td>
      ))}
    </tr>
  );
}

/** Skeleton DataTable lengkap dengan header + rows, wrapped in card surface */
export function DataTableSkeleton({ rows = 8, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-1">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-40 rounded-lg" />
      </div>

      {/* Table surface */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <table className="w-full">
          <thead className="bg-muted/60">
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-4 py-3 text-left">
                  <Skeleton className="h-3.5 w-20 rounded" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <TableRowSkeleton key={i} cols={cols} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
        </div>
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
    </div>
  );
}

// ── Accordion / List Skeletons ─────────────────────────────────────────────

/** Skeleton untuk satu accordion item */
function AccordionItemSkeleton() {
  return (
    <div className="border-b border-border py-3 px-4 flex items-center gap-3">
      <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-32 rounded" />
        <Skeleton className="h-3 w-20 rounded" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full shrink-0" />
    </div>
  );
}

/** Skeleton untuk daftar accordion (snack team, dll) */
export function AccordionListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-1">
        <Skeleton className="h-3 w-24 rounded mb-3" />
        <div className="rounded-lg overflow-hidden border border-border">
          {Array.from({ length: count }).map((_, i) => (
            <AccordionItemSkeleton key={i} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Generic List Item Skeletons ────────────────────────────────────────────

/** Skeleton untuk satu baris item list aktivitas */
function ActivityItemSkeleton() {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 border-b border-border last:border-0">
      <div className="space-y-1.5 min-w-0 flex-1">
        <Skeleton className="h-3.5 w-48 rounded" />
        <Skeleton className="h-3 w-32 rounded" />
      </div>
      <Skeleton className="h-6 w-14 rounded-full ml-4 shrink-0" />
    </div>
  );
}

/** Skeleton untuk section "Aktivitas Terakhir" */
export function ActivityListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <Card className="overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <ActivityItemSkeleton key={i} />
      ))}
    </Card>
  );
}

// ── Chart Skeletons ────────────────────────────────────────────────────────

/** Skeleton untuk chart area / bar */
export function ChartSkeleton({ height = 180 }: { height?: number }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-6 w-24 rounded-lg" />
        </div>
        <Skeleton className={`w-full rounded-lg`} style={{ height }} />
      </CardContent>
    </Card>
  );
}

// ── Page-level Skeleton Layouts ────────────────────────────────────────────

/** Skeleton full layout halaman Admin Dashboard */
export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-48 rounded" />
          <Skeleton className="h-4 w-72 rounded" />
        </div>
        <Skeleton className="hidden sm:block h-9 w-32 rounded-lg" />
      </div>
      {/* Stat cards */}
      <SectionCardsSkeleton count={4} />
      {/* Charts */}
      <ChartSkeleton height={200} />
      <ChartSkeleton height={160} />
      {/* Room list */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-28 rounded" />
        <RoomListSkeleton count={6} />
      </div>
    </div>
  );
}

/** Skeleton full layout halaman Audit Dashboard */
export function AuditDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <Skeleton className="h-6 w-48 rounded" />
        <Skeleton className="h-4 w-64 rounded" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <SectionCardsSkeleton count={3} gridClass="grid-cols-2 lg:grid-cols-3" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-28 rounded" />
        <RoomListStackSkeleton count={5} />
      </div>
    </div>
  );
}

/** Skeleton full layout halaman Petugas Dashboard */
export function PetugasDashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Skeleton className="h-6 w-40 rounded" />
        <Skeleton className="h-4 w-56 rounded" />
      </div>
      {/* CTA button skeleton */}
      <Skeleton className="h-16 w-full rounded-xl" />
      {/* Stat cards */}
      <SectionCardsSkeleton count={2} gridClass="grid-cols-2" />
      {/* Accordion */}
      <AccordionListSkeleton count={4} />
    </div>
  );
}

/** Skeleton presisi untuk halaman /snack/distribution (Operasional Petugas) */
export function SnackDistributionSkeleton() {
  return (
    <div className="space-y-5">
      {/* Session Indicator Card */}
      <Card className="rounded-2xl border border-border/80 bg-gradient-to-br from-card to-muted/20 shadow-xs overflow-hidden">
        <CardContent className="p-3.5 sm:p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Skeleton className="h-11 w-11 rounded-2xl shrink-0" />
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-2.5 w-2.5 rounded-full shrink-0" />
                  <Skeleton className="h-5 w-40 sm:w-56 rounded-lg" />
                </div>
                <Skeleton className="h-3.5 w-28 rounded" />
              </div>
            </div>
            <Skeleton className="h-9 w-28 sm:w-36 rounded-xl shrink-0" />
          </div>

          {/* 3 Metric Pills */}
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col items-center space-y-1">
                <Skeleton className="h-2.5 w-12 rounded" />
                <Skeleton className="h-5 w-8 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Segmented Mode Switcher Tabs */}
      <div className="flex p-1 bg-muted/50 rounded-2xl border border-border/80 gap-1">
        <Skeleton className="h-9 flex-1 rounded-xl" />
        <Skeleton className="h-9 flex-1 rounded-xl" />
      </div>

      {/* Camera Viewfinder Card */}
      <Card className="rounded-2xl border border-border/80 shadow-xs overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="relative aspect-4/3 max-h-72 w-full rounded-2xl bg-muted/60 overflow-hidden flex flex-col items-center justify-center p-6 border border-border/60">
            {/* Viewfinder corner guides simulation */}
            <div className="absolute top-4 left-4 h-6 w-6 border-t-2 border-l-2 border-primary/40 rounded-tl-md" />
            <div className="absolute top-4 right-4 h-6 w-6 border-t-2 border-r-2 border-primary/40 rounded-tr-md" />
            <div className="absolute bottom-4 left-4 h-6 w-6 border-b-2 border-l-2 border-primary/40 rounded-bl-md" />
            <div className="absolute bottom-4 right-4 h-6 w-6 border-b-2 border-r-2 border-primary/40 rounded-br-md" />

            <Skeleton className="h-10 w-10 rounded-2xl mb-2" />
            <Skeleton className="h-4 w-44 rounded" />
            <Skeleton className="h-3 w-32 rounded mt-1" />
          </div>

          {/* Manual Input Card */}
          <div className="rounded-2xl border border-border/70 bg-muted/30 p-3 space-y-2">
            <Skeleton className="h-3 w-36 rounded" />
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1 rounded-xl" />
              <Skeleton className="h-10 w-24 rounded-xl" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Card */}
      <Card className="rounded-2xl border border-border/80 shadow-xs overflow-hidden">
        <CardContent className="p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-32 rounded" />
            </div>
            <Skeleton className="h-3.5 w-16 rounded" />
          </div>
          <div className="divide-y divide-border/60">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                  <div className="space-y-1">
                    <Skeleton className="h-3.5 w-28 rounded" />
                    <Skeleton className="h-2.5 w-20 rounded" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16 rounded-full shrink-0" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Skeleton presisi untuk halaman /snack/dashboard (Monitoring Telemetri) */
export function SnackDashboardSkeleton() {
  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <Card className="rounded-2xl border border-border/80 bg-gradient-to-br from-card to-muted/20 shadow-xs overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-xl shrink-0" />
                <Skeleton className="h-6 w-48 sm:w-60 rounded-lg" />
              </div>
              <Skeleton className="h-3.5 w-52 sm:w-72 rounded ml-10" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-8 w-28 rounded-full" />
              <Skeleton className="h-9 w-36 rounded-xl" />
              <Skeleton className="h-9 w-9 rounded-xl" />
            </div>
          </div>

          {/* Unified Progress Bar */}
          <div className="pt-2 border-t border-border/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-32 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
            <Skeleton className="h-2.5 w-full rounded-full" />
          </div>
        </CardContent>
      </Card>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="rounded-2xl border border-border/80 shadow-xs">
            <CardContent className="p-4 sm:p-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-7 w-7 rounded-xl" />
                <Skeleton className="h-4 w-12 rounded-full" />
              </div>
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stock Capacity Meter */}
      <Card className="rounded-2xl border border-border/80 shadow-xs">
        <CardContent className="p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-36 rounded" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-2.5 w-full rounded-full" />
        </CardContent>
      </Card>

      {/* Team Progress Accordions */}
      <Card className="rounded-2xl border border-border/80 shadow-xs overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-40 rounded" />
            </div>
            <Skeleton className="h-8 w-32 rounded-xl" />
          </div>

          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-border/70 p-3.5 flex items-center justify-between bg-card"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Skeleton className="h-5 w-16 rounded-md shrink-0" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32 sm:w-44 rounded" />
                    <Skeleton className="h-3 w-20 rounded" />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-4 w-4 rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Skeleton presisi untuk halaman /snack/history (Riwayat & Pencarian) */
export function SnackHistorySkeleton() {
  return (
    <div className="space-y-5">
      {/* Top Filter Header Card */}
      <Card className="rounded-2xl border border-border/80 bg-gradient-to-br from-card to-muted/20 shadow-xs overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-xl shrink-0" />
                <Skeleton className="h-6 w-44 sm:w-56 rounded-lg" />
              </div>
              <Skeleton className="h-3.5 w-64 rounded ml-10" />
            </div>
            <Skeleton className="h-9 w-full sm:w-52 rounded-xl shrink-0" />
          </div>

          {/* Search Box */}
          <div className="pt-1">
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </CardContent>
      </Card>

      {/* Feed List Card */}
      <Card className="rounded-2xl border border-border/80 shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <div className="p-3.5 sm:p-4 border-b border-border/60 flex items-center justify-between">
            <Skeleton className="h-4 w-36 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
          <div className="divide-y divide-border/60">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-32 sm:w-48 rounded" />
                      <Skeleton className="h-4 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-40 sm:w-60 rounded" />
                  </div>
                </div>
                <Skeleton className="h-8 w-16 rounded-xl shrink-0" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Skeleton presisi untuk halaman /snack/sessions (Manajemen Sesi) */
export function SnackSessionsSkeleton() {
  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <Card className="rounded-2xl border border-border/80 bg-gradient-to-br from-card to-muted/20 shadow-xs rounded-2xl overflow-hidden">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-xl shrink-0" />
              <Skeleton className="h-6 w-48 sm:w-60 rounded-lg" />
            </div>
            <Skeleton className="h-3.5 w-64 rounded ml-10" />
          </div>
          <Skeleton className="h-10 w-32 rounded-xl shrink-0" />
        </CardContent>
      </Card>

      {/* Mobile Card View (< md) */}
      <div className="space-y-3 block md:hidden">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="rounded-2xl border border-border/80 shadow-xs overflow-hidden">
            <CardContent className="p-3.5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-2 w-2 rounded-full" />
                    <Skeleton className="h-5 w-36 rounded" />
                  </div>
                  <Skeleton className="h-3 w-28 rounded" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex flex-col items-center space-y-1">
                    <Skeleton className="h-2.5 w-10 rounded" />
                    <Skeleton className="h-4 w-8 rounded" />
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-1 border-t border-border/60">
                <Skeleton className="h-8 flex-1 rounded-xl" />
                <Skeleton className="h-8 w-16 rounded-xl" />
                <Skeleton className="h-8 w-8 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop DataTable View (>= md) */}
      <div className="hidden md:block">
        <DataTableSkeleton rows={6} cols={5} />
      </div>
    </div>
  );
}

/** Skeleton presisi untuk halaman /snack/gelang (Generate & Cetak Gelang / Barcode) */
export function SnackGelangSkeleton() {
  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <Card className="border border-border/80 bg-gradient-to-br from-card to-muted/20 shadow-xs rounded-2xl overflow-hidden">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-xl shrink-0" />
              <Skeleton className="h-6 w-48 sm:w-60 rounded-lg" />
            </div>
            <Skeleton className="h-3.5 w-64 rounded ml-10" />
          </div>
          <Skeleton className="h-10 w-full sm:w-64 rounded-xl shrink-0" />
        </CardContent>
      </Card>

      {/* Empty State Card */}
      <Card className="rounded-2xl border-dashed">
        <CardContent className="flex flex-col items-center gap-2.5 py-12 text-center">
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <Skeleton className="h-5 w-56 rounded mt-1" />
          <Skeleton className="h-3.5 w-72 rounded" />
        </CardContent>
      </Card>

      {/* Master Barcode Card */}
      <Card className="rounded-2xl border border-border/80 shadow-xs overflow-hidden">
        <CardContent className="p-4 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-52 rounded" />
              </div>
              <Skeleton className="h-3 w-40 rounded" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-28 rounded-xl" />
              <Skeleton className="h-9 w-28 rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 pt-2 border-t border-border/60">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="flex flex-col items-center rounded-xl border border-border/80 bg-background p-3 space-y-2"
              >
                <Skeleton className="size-20 rounded-lg" />
                <Skeleton className="h-3.5 w-16 rounded" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Skeleton full layout halaman hasil (submissions list) */
export function HasilPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <Skeleton className="h-6 w-40 rounded" />
        <Skeleton className="h-4 w-56 rounded" />
      </div>
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-9 w-36 rounded-lg" />
        ))}
      </div>
      {/* Accordion list */}
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-40 rounded" />
                <Skeleton className="h-3 w-28 rounded" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Public Pages Skeletons ──────────────────────────────────────────────────

/** Skeleton layout presisi untuk halaman /live (Unified Live Score & Bagan) */
export function UnifiedLiveSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Festive Hero Banner Header Skeleton */}
      <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-rose-50/80 via-white to-rose-50/40 p-6 sm:p-8 shadow-xs space-y-3">
        <Skeleton className="h-5 w-36 rounded-full" />
        <Skeleton className="h-8 w-72 sm:w-96 rounded-xl" />
        <Skeleton className="h-4 w-full max-w-xl rounded-md" />
      </div>

      {/* Main Tab Switcher Skeleton */}
      <div className="flex gap-1.5 rounded-2xl border border-slate-200/90 bg-slate-100/90 p-1.5 shadow-inner">
        <Skeleton className="h-11 flex-1 rounded-xl" />
        <Skeleton className="h-11 flex-1 rounded-xl" />
      </div>

      {/* Leaderboard / Content Cards Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48 rounded" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden border border-slate-200/80">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-7 w-7 rounded-lg" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <Skeleton className="h-3 w-20 rounded" />
                  <Skeleton className="h-5 w-12 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Skeleton layout presisi untuk halaman /tim (Daftar Tim Peserta) */
export function TimPageSkeleton() {
  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Hero Header Card */}
      <div className="surface-card p-5 sm:p-7 space-y-3">
        <Skeleton className="h-4 w-32 rounded-full" />
        <Skeleton className="h-7 w-64 sm:w-80 rounded-xl" />
        <Skeleton className="h-4 w-full max-w-lg rounded-md" />

        {/* Search input skeleton */}
        <div className="pt-2">
          <Skeleton className="h-11 w-full rounded-2xl" />
        </div>
      </div>

      {/* KPI / Summary stats pills */}
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-28 rounded-full" />
        <Skeleton className="h-8 w-28 rounded-full" />
      </div>

      {/* Team cards grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <div key={i} className="surface-card p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-14 rounded-full" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="h-5 w-36 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton layout presisi untuk halaman /rundown (Jadwal Kegiatan) */
export function RundownSkeleton() {
  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="surface-card p-5 sm:p-7 space-y-3">
        <Skeleton className="h-4 w-32 rounded-full" />
        <Skeleton className="h-7 w-64 rounded-xl" />
        <Skeleton className="h-4 w-full max-w-md rounded-md" />
      </div>

      {/* Day tabs switcher */}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-36 rounded-xl" />
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* Timeline items */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="surface-card p-4 flex items-start gap-4">
            <Skeleton className="h-12 w-16 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48 rounded" />
              <Skeleton className="h-3 w-full max-w-sm rounded" />
              <Skeleton className="h-3 w-28 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton layout presisi untuk halaman /lomba (Daftar Cabang Lomba) */
export function LombaPageSkeleton() {
  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="surface-card p-5 sm:p-7 space-y-3">
        <Skeleton className="h-4 w-28 rounded-full" />
        <Skeleton className="h-7 w-60 rounded-xl" />
        <Skeleton className="h-4 w-full max-w-lg rounded-md" />
      </div>

      {/* Category filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-xl shrink-0" />
        ))}
      </div>

      {/* Competition cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="surface-card overflow-hidden">
            <Skeleton className="h-36 w-full" />
            <div className="p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-16 rounded-full" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
              <Skeleton className="h-5 w-40 rounded" />
              <Skeleton className="h-3 w-full rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton layout presisi untuk halaman /admin/bagan */
export function AdminBaganSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-48 rounded" />
          <Skeleton className="h-4 w-72 rounded" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Competition selector pills */}
      <div className="flex gap-2 overflow-x-auto p-1.5 rounded-2xl border border-border bg-card">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-9 w-32 rounded-xl shrink-0" />
        ))}
      </div>

      {/* Tournament brackets grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i} className="overflow-hidden border border-border">
            <div className="border-b border-border p-4 bg-muted/40 flex items-center justify-between">
              <Skeleton className="h-5 w-36 rounded" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-64 w-full rounded-xl" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/** Skeleton layout presisi untuk halaman /admin/teams */
export function AdminTeamsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-48 rounded" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      {/* 4 Stat Cards */}
      <SectionCardsSkeleton count={4} />

      {/* Filter toolbar */}
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-64 rounded-lg" />
        <Skeleton className="h-9 w-40 rounded-lg" />
      </div>

      {/* Grid items */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-6 w-16 rounded" />
              </div>
              <Skeleton className="h-5 w-40 rounded" />
              <Skeleton className="h-3 w-28 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/** Skeleton layout untuk Landing Page (Beranda /) */
export function HomePageSkeleton() {
  return (
    <div className="space-y-8">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="surface-card p-4 space-y-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-7 w-20 rounded" />
            <Skeleton className="h-3.5 w-24 rounded" />
            <Skeleton className="h-2.5 w-16 rounded" />
          </div>
        ))}
      </div>

      {/* Phase Banner */}
      <div className="surface-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40 rounded" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full max-w-md rounded" />
      </div>

      {/* Highlights / Features Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="surface-card p-5 space-y-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-5 w-36 rounded" />
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-3/4 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton layout presisi untuk halaman /login */
export function LoginSkeleton() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100/70 to-rose-50/40 p-4 sm:p-6 md:p-10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="relative z-10 flex w-full max-w-sm flex-col gap-5">
        <div className="flex flex-col items-center text-center space-y-3">
          <Skeleton className="h-10 w-44 rounded-xl" />
          <div className="space-y-1.5 flex flex-col items-center">
            <Skeleton className="h-5 w-48 rounded" />
            <Skeleton className="h-3.5 w-60 rounded" />
          </div>
        </div>
        <Card className="p-6 space-y-4 shadow-sm border border-border">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <Skeleton className="h-10 w-full rounded-xl mt-3" />
        </Card>
      </div>
    </div>
  );
}
