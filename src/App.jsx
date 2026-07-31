import { lazy, Suspense, useEffect, useRef } from 'react'
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useSearchParams,
} from 'react-router-dom'
import SiteHeader from './components/layout/Header'
import BottomNav from './components/layout/BottomNav'
import SiteFooter from './components/layout/SiteFooter'
import Hero from './components/hero/Hero'
import PageFallback from './components/ui/PageFallback'
import { preloadRoute } from './components/ui/routeLoader'
import { gsap, shouldReduceMotion } from './lib/gsap'

// ─── Route-level code splitting ────────────────────────────────────────────
// Each page becomes its own chunk. The bundler emits one JS file per page; the
// browser only downloads it once the user navigates there (or when our
// `RoutePrefetch` wrapper warms the cache on hover/visibility).
const loadHomePage = () => import('./components/pages/HomePage.jsx')
const loadLombaPage = () => import('./components/pages/LombaPage.jsx')
const loadRundownPage = () => import('./components/pages/RundownPage.jsx')
const loadTimPage = () => import('./components/pages/TimPage.jsx')

const HomePage = lazy(loadHomePage)
const LombaPage = lazy(loadLombaPage)
const RundownPage = lazy(loadRundownPage)
const TimPage = lazy(loadTimPage)

// ─── Warm the network cache for the most-likely next routes ────────────────
// After first paint, kick off a low-priority prefetch of the other page
// chunks so navigating between Beranda / Lomba / Rundown / Tim feels instant.
// We never await these — they're fire-and-forget.
if (typeof window !== 'undefined') {
  const idle =
    window.requestIdleCallback ||
    ((cb) => setTimeout(cb, 1500))
  idle(() => {
    preloadRoute(loadLombaPage).catch(() => {})
    preloadRoute(loadRundownPage).catch(() => {})
    preloadRoute(loadTimPage).catch(() => {})
  })
}

/** Redirect ke /beranda sambil preserve ?u= dan query params lainnya */
function HomeRedirect() {
  const [searchParams] = useSearchParams()
  const qs = searchParams.toString()
  return <Navigate to={qs ? `/beranda?${qs}` : '/beranda'} replace />
}

export default function App() {
  const location = useLocation()
  const panelRef = useRef(null)
  const didMountRef = useRef(false)

  // GSAP page transition — animate on every route change
  useEffect(() => {
    if (!panelRef.current || shouldReduceMotion()) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        panelRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', clearProps: 'all' },
      )
    })
    return () => ctx.revert()
  }, [location.pathname])

  // Scroll to top on route change (skip first paint)
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location.pathname])

  const isHome = location.pathname === '/beranda' || location.pathname === '/'

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-slate-50 text-slate-800 antialiased">
      <SiteHeader />

      <main className="mb-auto pb-[calc(7rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
        {isHome && <Hero />}
        <div className="shell py-6 sm:py-8">
          <div ref={panelRef}>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route index element={<HomeRedirect />} />
                <Route path="/beranda" element={<HomePage />} />
                <Route path="/lomba" element={<LombaPage />} />
                <Route path="/lomba/:id" element={<LombaPage />} />
                <Route path="/rundown" element={<RundownPage />} />
                <Route path="/tim" element={<TimPage />} />
                <Route path="*" element={<HomeRedirect />} />
              </Routes>
            </Suspense>
          </div>
        </div>
      </main>

      <SiteFooter />

      <BottomNav />
    </div>
  )
}