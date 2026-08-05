import { ComponentPropsWithRef, forwardRef, ImgHTMLAttributes, ReactNode, useState } from 'react'
import { useLazyImage } from '../../hooks/useLazyImage'

/** Props for the lazy-loading image wrapper. */
interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'loading'> {
  src?: string
  alt?: string
  wrapperClassName?: string
  placeholder?: ReactNode
  eager?: boolean
  rootMargin?: string
  threshold?: number
  fetchPriority?: ComponentPropsWithRef<'img'>['fetchPriority']
}

/**
 * LazyImage — drop-in replacement for `<img>` that defers the network request
 * until the element enters the viewport.
 *
 * Implementation notes:
 *   - The underlying <img> is ALWAYS rendered. When `shouldLoad` is false the
 *     `src` attribute is omitted (so no network request fires). When it
 *     becomes true we set `src` and the browser fetches immediately. This
 *     sidesteps the well-known race condition where native `loading="lazy"`
 *     skips an image that React mounts into the DOM after the lazy-tracking
 *     pass has already run.
 *   - `loading="eager"` is set unconditionally — we control fetch timing via
 *     `src`, so the native lazy hint is redundant and only causes the race.
 *   - The image is wrapped in a `<span>` so consumers can position the wrapper
 *     (e.g. `absolute inset-0`) without affecting the `<img>`'s own sizing.
 *
 * Props:
 *   - All standard `<img>` props (alt, className, decoding, onLoad, …)
 *   - rootMargin: IO rootMargin, default 200px (use 600px for big banners)
 *   - threshold: IO threshold, default 0.01
 *   - eager: bypass lazy — set src immediately
 *   - wrapperClassName: classes applied to the wrapping <span>
 *   - placeholder: ReactNode to render instead of the skeleton
 */
export const LazyImage = forwardRef<HTMLDivElement, LazyImageProps>(
  function LazyImage(
    {
      src,
      alt = '',
      className = '',
      wrapperClassName = '',
      placeholder = null,
      eager = false,
      rootMargin = '200px',
      threshold = 0.01,
      onLoad,
      decoding = 'async',
      fetchPriority,
      ...rest
    },
    forwardedRef,
  ) {
  const { ref, shouldLoad } = useLazyImage({ rootMargin, threshold })
  const [loaded, setLoaded] = useState(false)

  // Merge internal ref + forwarded ref so consumers can also grab the wrapper.
  const setRefs = (node: HTMLDivElement | null) => {
    ref.current = node
    if (typeof forwardedRef === 'function') forwardedRef(node)
    else if (forwardedRef) forwardedRef.current = node
  }

  const showImage = eager || shouldLoad

  // Ensure wrapper span stretches to full width & height by default so child <img> height doesn't collapse
  const finalWrapperClass = wrapperClassName || 'w-full h-full block'

  return (
    <div
      ref={setRefs}
      className={`${finalWrapperClass}`}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt}
          loading="eager"
          decoding={decoding}
          // fetchPriority is valid as a React 19 prop name (case sensitive)
          fetchPriority={fetchPriority}
          onLoad={(e) => {
            setLoaded(true)
            if (onLoad) onLoad(e)
          }}
          className={`${className} transition-opacity duration-500 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          {...rest}
        />
      ) : (
        placeholder ?? (
          <span
            aria-hidden="true"
            className={`${className} block animate-pulse bg-slate-200/70`}
          />
        )
      )}
    </div>
  )
})