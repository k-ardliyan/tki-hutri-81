/**
 * Skeleton shapes untuk komponen-komponen umum dashboard.
 * Gunakan komponen ini untuk menampilkan skeleton loading state
 * sebelum data tersedia dari React Query / useEffect.
 */
import { Skeleton } from '~/components/ui/skeleton'
import { Card, CardContent } from '~/components/ui/card'
import { cn } from '~/lib/utils'

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
  )
}

/** Skeleton untuk grid SectionCards (default 4 kolom) */
export function SectionCardsSkeleton({
  count = 4,
  gridClass = 'grid-cols-2 lg:grid-cols-4',
}: {
  count?: number
  gridClass?: string
}) {
  return (
    <div className={cn('grid gap-3', gridClass)}>
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  )
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
  )
}

/** Skeleton grid untuk daftar ruangan */
export function RoomListSkeleton({
  count = 6,
  gridClass = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
}: {
  count?: number
  gridClass?: string
}) {
  return (
    <div className={cn('grid gap-2.5', gridClass)}>
      {Array.from({ length: count }).map((_, i) => (
        <RoomCardSkeleton key={i} />
      ))}
    </div>
  )
}

/** Skeleton list vertikal untuk ruangan (tanpa grid) */
export function RoomListStackSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <RoomCardSkeleton key={i} />
      ))}
    </div>
  )
}

// ── DataTable Row Skeletons ────────────────────────────────────────────────

/** Skeleton untuk satu baris DataTable */
function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className={cn('h-4 rounded', i === 0 ? 'w-36' : i === cols - 1 ? 'w-16' : 'w-24')} />
        </td>
      ))}
    </tr>
  )
}

/** Skeleton DataTable lengkap dengan header + rows, wrapped in card surface */
export function DataTableSkeleton({
  rows = 8,
  cols = 4,
}: {
  rows?: number
  cols?: number
}) {
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
  )
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
  )
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
  )
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
  )
}

/** Skeleton untuk section "Aktivitas Terakhir" */
export function ActivityListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <Card className="overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <ActivityItemSkeleton key={i} />
      ))}
    </Card>
  )
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
  )
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
  )
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
  )
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
  )
}

/** Skeleton full layout halaman Snack Admin Dashboard */
export function SnackDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-44 rounded" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      <SectionCardsSkeleton count={4} />
      <AccordionListSkeleton count={5} />
    </div>
  )
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
  )
}
