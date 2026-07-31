import { useEffect, useRef } from 'react'
import { Routes, Route, Navigate, useLocation, useSearchParams } from 'react-router-dom'
import SiteHeader from './components/layout/Header'
import BottomNav from './components/layout/BottomNav'
import SiteFooter from './components/layout/SiteFooter'
import Hero from './components/hero/Hero'
import HomePage from './components/pages/HomePage'
import LombaPage from './components/pages/LombaPage'
import RundownPage from './components/pages/RundownPage'
import TimPage from './components/pages/TimPage'
import { gsap, shouldReduceMotion } from './lib/gsap'

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

      <main className="mb-auto pb-16 lg:pb-0">
        {isHome && <Hero />}
        <div className="shell py-6 sm:py-8">
          <div ref={panelRef}>
            <Routes>
              <Route index element={<HomeRedirect />} />
              <Route path="/beranda" element={<HomePage />} />
              <Route path="/lomba" element={<LombaPage />} />
              <Route path="/lomba/:id" element={<LombaPage />} />
              <Route path="/rundown" element={<RundownPage />} />
              <Route path="/tim" element={<TimPage />} />
              <Route path="*" element={<HomeRedirect />} />
            </Routes>
          </div>
        </div>
      </main>

      <SiteFooter />

      <BottomNav />
    </div>
  )
}
