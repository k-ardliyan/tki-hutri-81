/**
 * routeLoader — helper untuk membuat lazy loader + prefetch dari dynamic import.
 * Dipakai oleh Header dan BottomNav untuk preload halaman sebelum navigasi.
 */

export interface RouteLoader {
  load: () => Promise<any>
  prefetch: () => Promise<any>
}

/** Buat loader route yang bisa di-prefetch */
export function makeRouteLoader(
  importer: () => Promise<any>,
): RouteLoader {
  let cached: Promise<any> | null = null
  const run = () => {
    if (!cached) cached = importer()
    return cached
  }
  return {
    load: run,
    prefetch: run,
  }
}

/** Preload route (fire-and-forget) */
export function preloadRoute(loader: RouteLoader): Promise<any> {
  return loader.prefetch()
}
