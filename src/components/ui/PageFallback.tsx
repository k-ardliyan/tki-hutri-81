/**
 * PageFallback — Suspense fallback for lazy route loads.
 *
 * Lightweight skeleton that matches the typical layout of TKI pages (rounded
 * surface cards with horizontal header lines). No images, no animation, no
 * network — just a static skeleton that paints instantly.
 */
export default function PageFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Memuat halaman"
      className="space-y-5 sm:space-y-6"
    >
      <section className="surface-card px-4 py-5 sm:px-7 sm:py-7">
        <div className="h-3 w-24 rounded-full bg-slate-200/80" />
        <div className="mt-3 h-6 w-2/3 rounded-full bg-slate-200/80 sm:h-7" />
        <div className="mt-2 h-3 w-3/4 rounded-full bg-slate-100" />
      </section>

      <section className="surface-card p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-44 rounded-2xl bg-slate-100/80 sm:h-48"
            />
          ))}
        </div>
      </section>

      <span className="sr-only">Memuat…</span>
    </div>
  )
}