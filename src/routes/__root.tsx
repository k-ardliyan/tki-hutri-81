import { Suspense, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useLocation,
} from '@tanstack/react-router'
import '../styles.css'
import { gsap, shouldReduceMotion } from '../lib/gsap'
import { AudienceProvider } from '../context/AudienceContext'
import SiteHeader from '../components/layout/Header'
import BottomNav from '../components/layout/BottomNav'
import SiteFooter from '../components/layout/SiteFooter'
import Hero from '../components/hero/Hero'
import PageFallback from '../components/ui/PageFallback'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1.0',
      },
      { name: 'theme-color', content: '#c62828' },
      { title: 'HUT RI ke-81 - PT TKI x PT FTP' },
      // SEO & Indexing Rules (Blocked from Search Engines & AI)
      { name: 'robots', content: 'noindex, nofollow, noarchive' },
      { name: 'googlebot', content: 'noindex, nofollow' },
      {
        name: 'description',
        content: 'Portal Resmi Kegiatan & Panduan Lomba HUT RI ke-81 PT TKI x PT FTP. Semangat Merdeka, Kerja Rapi, Juara Bersama.',
      },
      { name: 'author', content: 'PT TKI x PT FTP' },
      // Open Graph / Social Media Sharing
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'HUT RI ke-81 - PT TKI x PT FTP' },
      { property: 'og:title', content: 'Peringatan HUT RI ke-81 - PT TKI x PT FTP' },
      {
        property: 'og:description',
        content: 'Portal Resmi Kegiatan, Panduan Lomba & Budaya 5R HUT RI ke-81 PT TKI x PT FTP Salatiga. Rayakan kemerdekaan bersama!',
      },
      { property: 'og:image', content: '/og-image.webp' },
      { property: 'og:image:type', content: 'image/webp' },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: 'Banner Peringatan HUT RI ke-81 PT TKI x PT FTP' },
      { property: 'og:locale', content: 'id_ID' },
      // Twitter Card
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'Peringatan HUT RI ke-81 - PT TKI x PT FTP' },
      {
        name: 'twitter:description',
        content: 'Portal Resmi Kegiatan, Panduan Lomba & Budaya 5R HUT RI ke-81 PT TKI x PT FTP Salatiga. Rayakan kemerdekaan bersama!',
      },
      { name: 'twitter:image', content: '/og-image.webp' },
      { name: 'twitter:image:alt', content: 'Banner Peringatan HUT RI ke-81 PT TKI x PT FTP' },
    ],
    links: [
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'apple-touch-icon', href: '/favicon.svg' },
      {
        rel: 'stylesheet',
        href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
      },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Saira+Semi+Condensed:wght@500;600;700;800;900&display=swap',
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <AudienceProvider>
        <AppLayout />
      </AudienceProvider>
    </RootDocument>
  )
}

function AppLayout() {
  const { pathname } = useLocation()
  const panelRef = useRef<HTMLDivElement>(null)
  const didMountRef = useRef(false)

  const isHome = pathname === '/'
  const isAdminArea = pathname.startsWith('/admin') || pathname.startsWith('/audit') || pathname === '/login'

  // GSAP page transition — animate on every route change.
  // Skip di area admin: layout (sidebar) harus tetap, hanya content yang ganti.
  useEffect(() => {
    if (isAdminArea) return
    if (!panelRef.current || shouldReduceMotion()) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        panelRef.current!,
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          ease: 'power2.out',
          clearProps: 'all',
        },
      )
    })
    return () => ctx.revert()
  }, [pathname])

  // Scroll to top on route change (skip first paint)
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-canvas text-slate-800 antialiased">
      {!isAdminArea && <SiteHeader />}

      <main
        className={`mb-auto ${
          isAdminArea
            ? 'pb-0'
            : 'pb-[calc(7rem+env(safe-area-inset-bottom,0px))] lg:pb-0'
        }`}
      >
        {isHome && !isAdminArea && <Hero />}
        <div className={isAdminArea ? '' : 'shell py-6 sm:py-8'}>
          <div ref={panelRef}>
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </div>
      </main>

      {!isAdminArea && <SiteFooter />}
      {!isAdminArea && <BottomNav />}
    </div>
  )
}

function NotFoundComponent() {
  return (
    <RootDocument>
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <h1 className="font-heading text-4xl font-bold text-brand-deep sm:text-5xl">404</h1>
        <p className="mt-3 text-slate-600">Halaman tidak ditemukan.</p>
        <a
          href="/"
          className="mt-6 rounded-full bg-brand-red px-6 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 active:scale-95"
        >
          Kembali ke Beranda
        </a>
      </div>
    </RootDocument>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
