import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useLocation,
  useRouterState,
} from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Suspense, useEffect, useRef, useState } from 'react';
import '../styles.css';
import Hero from '../components/hero/Hero';
import BottomNav from '../components/layout/BottomNav';
import SiteHeader from '../components/layout/Header';
import SiteFooter from '../components/layout/SiteFooter';
import PageFallback from '../components/ui/PageFallback';
import { Toaster } from '../components/ui/sonner';
import { AudienceProvider } from '../context/AudienceContext';
import { gsap, shouldReduceMotion } from '../lib/gsap';

function NavigationProgressBar() {
  const isPending = useRouterState({ select: (s) => s.status === 'pending' || s.isLoading });
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPending) {
      setVisible(true);
      setProgress(30);
      timer = setTimeout(() => {
        setProgress(75);
      }, 120);
    } else {
      setProgress(100);
      timer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 200);
    }
    return () => clearTimeout(timer);
  }, [isPending]);

  if (!visible && !isPending) return null;

  return (
    <div
      role="progressbar"
      aria-label="Memuat halaman..."
      className="fixed top-0 left-0 right-0 z-50 h-[3px] overflow-hidden bg-transparent pointer-events-none"
    >
      <div
        className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 transition-all duration-200 ease-out shadow-[0_0_10px_rgba(225,29,72,0.9)]"
        style={{
          width: `${progress}%`,
          opacity: isPending ? 1 : 0,
        }}
      />
    </div>
  );
}

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
        content:
          'Portal Resmi Kegiatan & Panduan Lomba HUT RI ke-81 PT TKI x PT FTP. Semangat Merdeka, Kerja Rapi, Juara Bersama.',
      },
      { name: 'author', content: 'PT TKI x PT FTP' },
      // Open Graph / Social Media Sharing
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'HUT RI ke-81 - PT TKI x PT FTP' },
      { property: 'og:title', content: 'Peringatan HUT RI ke-81 - PT TKI x PT FTP' },
      {
        property: 'og:description',
        content:
          'Portal Resmi Kegiatan, Panduan Lomba & Budaya 5R HUT RI ke-81 PT TKI x PT FTP Salatiga. Rayakan kemerdekaan bersama!',
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
        content:
          'Portal Resmi Kegiatan, Panduan Lomba & Budaya 5R HUT RI ke-81 PT TKI x PT FTP Salatiga. Rayakan kemerdekaan bersama!',
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
});

function RootComponent() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
      })
  );
  return (
    <RootDocument>
      <QueryClientProvider client={queryClient}>
        <AudienceProvider>
          <NavigationProgressBar />
          <AppLayout />
        </AudienceProvider>
      </QueryClientProvider>
    </RootDocument>
  );
}

function AppLayout() {
  const routerPath = useRouterState({
    select: (s) =>
      s.status === 'pending' || s.isLoading
        ? s.location.pathname
        : (s.resolvedLocation?.pathname ?? s.location.pathname),
  });
  const panelRef = useRef<HTMLDivElement>(null);
  const didMountRef = useRef(false);

  const isHome = routerPath === '/';
  const isAdminArea =
    routerPath.startsWith('/admin') ||
    routerPath.startsWith('/audit') ||
    routerPath.startsWith('/petugas') ||
    routerPath === '/login';

  // GSAP page transition — animate on route change.
  useEffect(() => {
    if (isAdminArea) return;
    if (!panelRef.current || shouldReduceMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        panelRef.current!,
        { opacity: 0.2, y: 8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.25,
          ease: 'power2.out',
          clearProps: 'all',
        }
      );
    });
    return () => ctx.revert();
  }, [routerPath, isAdminArea]);

  // Scroll to top instantly on route change
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    window.scrollTo(0, 0);
  }, [routerPath]);

  return (
    <div
      className={`flex min-h-screen flex-col overflow-x-clip text-foreground antialiased ${
        isAdminArea ? 'bg-background' : 'bg-canvas landing-gradient'
      }`}
    >
      {!isAdminArea && <SiteHeader />}

      {isAdminArea ? (
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      ) : (
        <main className={`mb-auto ${'pb-[calc(7rem+env(safe-area-inset-bottom,0px))] lg:pb-0'}`}>
          {isHome && <Hero />}
          <div className="shell py-6 sm:py-8">
            <div ref={panelRef}>
              <Suspense fallback={<PageFallback />}>
                <Outlet />
              </Suspense>
            </div>
          </div>
        </main>
      )}

      {!isAdminArea && <SiteFooter />}
      {!isAdminArea && <BottomNav />}
    </div>
  );
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
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Toaster position="top-center" richColors />
        <Scripts />
      </body>
    </html>
  );
}
