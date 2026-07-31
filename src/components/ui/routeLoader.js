/**
 * routeLoader — module-level cache for dynamic `import()` functions.
 *
 * Why: when a chunk is split by `React.lazy()` the browser fetches it the
 * first time the component renders. We don't want that fetch to happen *after*
 * the user has tapped a tab — we want it to start as soon as a nav control
 * enters the viewport or receives hover/focus.
 *
 * `makeRouteLoader(importFn)` wraps an import so it can be called many times
 * (once per nav control) but only triggers one fetch. The result is a
 * `() => Promise<{default: Component}>` you can pass to `RoutePrefetch` or
 * `preloadRoute`.
 *
 * `preloadRoute(importFn)` is the lower-level helper that just kicks off the
 * fetch and returns the promise (so callers can `.catch(() => {})` if they
 * want fire-and-forget).
 *
 * Both are kept out of `RoutePrefetch.jsx` so that file exports *only* a
 * React component — that's what oxlint's `react/only-export-components`
 * rule needs to keep fast-refresh working in dev.
 */

export function makeRouteLoader(importFn) {
  let cached = null
  return () => {
    if (!cached) cached = importFn()
    return cached
  }
}

export function preloadRoute(importFn) {
  return importFn()
}