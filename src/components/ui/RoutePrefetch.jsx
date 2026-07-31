import { useEffect, useRef } from 'react'
import { preloadRoute } from './routeLoader'

/**
 * RoutePrefetch — prefetches a lazy-loaded route chunk when its target becomes
 * visible in the viewport (or on hover/focus, whichever fires first).
 *
 * Usage:
 *   <RoutePrefetch loader={loadLombaPage}>
 *     <NavButton to="/lomba">Lomba</NavButton>
 *   </RoutePrefetch>
 *
 * Fires once: subsequent re-renders do not re-trigger. Visibility is checked
 * with an IntersectionObserver at 300px rootMargin so a tab in the bottom-nav
 * warms up the moment it appears on-screen.
 */
export default function RoutePrefetch({
  loader,
  rootMargin = '300px',
  children,
  ...rest
}) {
  const ref = useRef(null)
  const triggeredRef = useRef(false)

  useEffect(() => {
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') return undefined

    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries[0]
        if (e && e.isIntersecting && !triggeredRef.current) {
          triggeredRef.current = true
          preloadRoute(loader).catch(() => {})
          obs.disconnect()
        }
      },
      { root: null, rootMargin, threshold: 0.01 },
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [loader, rootMargin])

  const handleHover = () => {
    if (triggeredRef.current) return
    triggeredRef.current = true
    preloadRoute(loader).catch(() => {})
  }

  return (
    <span
      ref={ref}
      onMouseEnter={handleHover}
      onFocus={handleHover}
      onTouchStart={handleHover}
      {...rest}
    >
      {children}
    </span>
  )
}