import { useEffect, useRef, useState } from 'react'
import SiteHeader from './components/layout/Header'
import BottomNav from './components/layout/BottomNav'
import SiteFooter from './components/layout/SiteFooter'
import Hero from './components/hero/Hero'
import HomePage from './components/pages/HomePage'
import LombaPage from './components/pages/LombaPage'
import RundownPage from './components/pages/RundownPage'
import TimPage from './components/pages/TimPage'
import { gsap, shouldReduceMotion } from './lib/gsap'

const PAGES = {
  beranda: HomePage,
  lomba: LombaPage,
  rundown: RundownPage,
  tim: TimPage,
}

const TAB_IDS = Object.keys(PAGES)

function readTabFromLocation() {
  if (typeof window === 'undefined') return 'beranda'
  const raw = window.location.hash.replace(/^#\/?/, '').split(/[/?#]/)[0].trim()
  return TAB_IDS.includes(raw) ? raw : 'beranda'
}

function writeTabToLocation(tab, { replace = false } = {}) {
  const next = TAB_IDS.includes(tab) ? tab : 'beranda'
  const hash = `#${next}`
  if (window.location.hash === hash) return
  if (replace) {
    window.history.replaceState({ tab: next }, '', hash)
  } else {
    window.history.pushState({ tab: next }, '', hash)
  }
}

export default function App() {
  const [tab, setTabState] = useState(() => readTabFromLocation())
  const [selectedLombaId, setSelectedLombaId] = useState(null)
  const panelRef = useRef(null)
  // Skip scroll-to-top on first paint / hash restore
  const didMountRef = useRef(false)

  const setTab = (next, subId = null) => {
    const id = TAB_IDS.includes(next) ? next : 'beranda'
    setTabState(id)
    if (subId) {
      setSelectedLombaId(subId)
    }
    writeTabToLocation(id)
  }

  // Sync tab from browser back/forward & manual hash edits
  useEffect(() => {
    if (!window.location.hash || !TAB_IDS.includes(readTabFromLocation())) {
      writeTabToLocation(tab, { replace: true })
    }

    const syncFromLocation = () => {
      setTabState(readTabFromLocation())
    }
    window.addEventListener('popstate', syncFromLocation)
    window.addEventListener('hashchange', syncFromLocation)
    return () => {
      window.removeEventListener('popstate', syncFromLocation)
      window.removeEventListener('hashchange', syncFromLocation)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount
  }, [])

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
  }, [tab])

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [tab])

  const Page = PAGES[tab] || HomePage

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-slate-50 text-slate-800 antialiased">
      <SiteHeader activeTab={tab} onTabChange={setTab} />

      <main className="mb-auto pb-16 lg:pb-0">
        {tab === 'beranda' && <Hero onExplore={setTab} />}
        <div className="shell py-6 sm:py-8">
          <div ref={panelRef}>
            {tab === 'lomba' ? (
              <LombaPage initialId={selectedLombaId} onNavigate={setTab} />
            ) : (
              <Page onNavigate={setTab} />
            )}
          </div>
        </div>
      </main>

      <SiteFooter />

      <BottomNav activeTab={tab} onTabChange={setTab} />
    </div>
  )
}
