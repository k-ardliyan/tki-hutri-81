import { useEffect, useRef, useState } from 'react'

/**
 * useLazyImage — IntersectionObserver-based lazy loader for image src.
 *
 * Why this hook exists:
 *   Native `loading="lazy"` is unreliable for images rendered via React
 *   mount/unmount cycles, because the browser may already have decided
 *   "this image is offscreen, skip" before the element gets a chance to
 *   register itself. When that happens the <img> tag is rendered but the
 *   network request never fires, and there is no API to "wake it up"
 *   short of unmount/remount.
 *
 *   To make it deterministic we always keep the <img> in the tree (with
 *   no `src` attribute) until the IntersectionObserver confirms the
 *   element is on/near the screen. Only then do we set the `src`, which
 *   kicks off a clean network fetch. Combined with `loading="eager"`
 *   (see LazyImage) this eliminates the mount-vs-lazy race.
 *
 * Behavior:
 *   - Observes the *target element* (the <img> itself, not a wrapper).
 *   - Default rootMargin: 200px so images start loading just before the
 *     user reaches them. Use a larger value (e.g. 600px) for big hero
 *     banners that sit far down the page on mobile.
 *   - SSR-safe: no observer access until the effect runs in the browser.
 *   - Respects `prefers-reduced-motion` only insofar as it doesn't
 *     animate — it still loads images.
 *
 * @param {Object} [opts]
 * @param {string} [opts.rootMargin='200px']
 * @param {number}  [opts.threshold=0.01]
 * @returns {{ ref: React.RefObject, shouldLoad: boolean }}
 */
export function useLazyImage(opts: { rootMargin?: string; threshold?: number } = {}) {
  const { rootMargin = '200px', threshold = 0.01 } = opts
  const ref = useRef<HTMLDivElement>(null)
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined

    // No IntersectionObserver → fall back to immediate load.
    if (typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true)
      return undefined
    }

    // If the element is already in the viewport at mount (e.g. above-the-fold
    // hero), the observer callback will fire synchronously after `observe()`.
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry && entry.isIntersecting) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      { root: null, rootMargin, threshold },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [rootMargin, threshold])

  return { ref, shouldLoad }
}