import { Skeleton } from '~/components/ui/skeleton';

export default function PageFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Memuat halaman"
      className="space-y-5 sm:space-y-6 animate-fade-in"
    >
      <section className="surface-card p-5 sm:p-7 space-y-3.5">
        <Skeleton className="h-3.5 w-28 rounded-full" />
        <Skeleton className="h-7 w-2/3 rounded-xl sm:h-8" />
        <Skeleton className="h-4 w-3/4 rounded-lg" />
      </section>

      <section className="surface-card p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl sm:h-48" />
          ))}
        </div>
      </section>

      <span className="sr-only">Memuat…</span>
    </div>
  );
}
