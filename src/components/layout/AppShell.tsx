/**
 * AppShell — shell generik area internal (admin/audit/petugas).
 * Layout block sidebar-07: SidebarProvider + AppSidebar (desktop collapse /
 * mobile Sheet) + SiteHeader. Logika guard form, dark mode, logout di sini.
 */

import { useLocation, useNavigate, useRouter } from '@tanstack/react-router';
import { AlertTriangle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ROLE_LABELS } from '../../lib/auth';
import type { NavSection } from '../../lib/nav';
import { isFormDirty, setFormDirty } from '../../lib/unsavedGuard';
import { getSession, logout } from '../../server/functions/auth';
import { AppSidebar } from '../app-sidebar';
import { SiteHeader } from '../site-header';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { SidebarInset, SidebarProvider } from '../ui/sidebar';
import { TooltipProvider } from '../ui/tooltip';

export default function AppShell({
  nav,
  title,
  subtitle = 'HUT RI ke-81',
  children,
}: {
  nav: NavSection[];
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const router = useRouter();

  // ── Session info (untuk label user di sidebar) ──
  const [userLabel, setUserLabel] = useState<{ username?: string; role?: string }>({});
  useEffect(() => {
    void getSession().then((s) =>
      setUserLabel({ username: s.username ?? undefined, role: s.role ?? undefined })
    );
  }, []);

  // ── Dark mode (class strategy, persist localStorage) ──
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (localStorage.getItem('tki5r:theme') ?? 'light') === 'dark';
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('tki5r:theme', dark ? 'dark' : 'light');
    } catch {
      /* noop */
    }
  }, [dark]);

  const handleLogout = async () => {
    if (isFormDirty()) {
      pendingRef.current = { to: '/login', logout: true };
      setShowLeave(true);
      return;
    }
    await logout();
    toast.success('Berhasil keluar');
    navigate({ to: '/login' });
  };

  // ── Unsaved-form guard ──
  const [showLeave, setShowLeave] = useState(false);
  const allowNavRef = useRef(false);
  const showLeaveRef = useRef(false);
  const pendingRef = useRef<{ to: string; logout?: boolean } | null>(null);

  useEffect(() => {
    return router.subscribe('onBeforeNavigate', (e) => {
      if (isFormDirty() && !allowNavRef.current && !showLeaveRef.current) {
        showLeaveRef.current = true;
        const targetHref: string = (e as any).toLocation?.href;
        pendingRef.current = targetHref ? { to: targetHref } : null;
        setShowLeave(true);
        const cur = router.state.location.href;
        allowNavRef.current = true;
        router
          .navigate({ href: cur, replace: true })
          .finally(() => setTimeout(() => (allowNavRef.current = false), 50));
      }
    });
  }, [router]);

  const requestNav = (to: string) => {
    if (to === pathname) return;
    if (isFormDirty()) {
      pendingRef.current = { to };
      setShowLeave(true);
      return;
    }
    navigate({ to });
  };

  const cancelLeave = () => {
    pendingRef.current = null;
    showLeaveRef.current = false;
    setShowLeave(false);
  };
  const confirmLeave = () => {
    setFormDirty(false);
    showLeaveRef.current = false;
    setShowLeave(false);
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending?.logout) {
      void logout().then(() => {
        toast.success('Berhasil keluar');
        navigate({ to: pending.to });
      });
    } else if (pending) {
      navigate(
        pending.to.startsWith('http') || pending.to.includes('?')
          ? { href: pending.to }
          : { to: pending.to }
      );
    }
  };

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          sections={nav}
          title={title}
          subtitle={subtitle}
          userName={userLabel.username}
          roleLabel={
            userLabel.role ? ROLE_LABELS[userLabel.role as keyof typeof ROLE_LABELS] : undefined
          }
          dark={dark}
          onToggleDark={() => setDark((d) => !d)}
          onNav={requestNav}
          onLogout={() => void handleLogout()}
        />
        <SidebarInset className="print:p-0 print:m-0 print:border-none print:shadow-none print:w-full print:block">
          <div className="print:hidden">
            <SiteHeader title={title} />
          </div>
          <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6 lg:p-6 min-w-0 print:p-0 print:m-0 print:gap-0 print:block print:w-full">
            <div className="mx-auto w-full max-w-7xl min-w-0 space-y-6 print:max-w-none print:w-full print:p-0 print:m-0 print:space-y-0 print:block">
              {children}
            </div>
          </div>
        </SidebarInset>

        {/* ── Leave-form confirmation dialog ── */}
        <Dialog
          open={showLeave}
          onOpenChange={(o) => {
            if (!o) cancelLeave();
          }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
                  <AlertTriangle size={18} />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-base font-extrabold tracking-tight">
                    Keluar dari form?
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-sm text-muted-foreground">
                    Isian tersimpan otomatis sebagai draft. Kamu bisa lanjut mengisi kapan saja.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 sm:flex-col sm:items-stretch">
              <Button variant="default" onClick={confirmLeave} className="w-full">
                Tetap Keluar
              </Button>
              <Button variant="outline" onClick={cancelLeave} className="w-full">
                Kembali Mengisi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarProvider>
    </TooltipProvider>
  );
}
