import { useEffect, useState, type RefObject } from 'react'

interface UseInViewOptions {
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
}

export function useInView(
  ref: RefObject<HTMLElement | null>,
  options: UseInViewOptions = {},
) {
  const { threshold = 0.1, rootMargin = '0px', triggerOnce = true } = options
  const [isInView, setIsInView] = useState(false)
  const [hasBeenInView, setHasBeenInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof window === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting
        setIsInView(visible)
        if (visible && !hasBeenInView) {
          setHasBeenInView(true)
          if (triggerOnce) observer.disconnect()
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, threshold, rootMargin, triggerOnce, hasBeenInView])

  return { isInView, hasBeenInView }
}
