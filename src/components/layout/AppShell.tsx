/**
 * AppShell — shell generik untuk area internal (admin/audit/petugas).
 *
 * Mobile (< lg): header + bottom tab bar (max 5 items + "Lainnya" sheet).
 * Desktop (lg+): left sidebar + content.
 */
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useRouter } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft, Check, ClipboardCheck, Ellipsis, LogOut, Moon, Sun } from 'lucide-react'
import { toast } from 'sonner'
import type { LucideIcon } from 'lucide-react'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Sheet, SheetContent, SheetTitle } from '../ui/sheet'
import { logout } from '../../server/functions/auth'
import { isFormDirty, setFormDirty } from '../../lib/unsavedGuard'

export interface ShellNavItem {
  id: string
  label: string
  icon: LucideIcon
  path: string
}

const MAX_BOTTOM_ITEMS = 5

export default function AppShell({
  nav,
  title,
  subtitle = 'HUT RI ke-81',
  primaryNav,
  children,
}: {
  nav: ShellNavItem[]
  title: string
  subtitle?: string
  primaryNav?: string[]
  children: React.ReactNode
}) {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  // Aktif = item dengan path prefix terpanjang yang match pathname
  const active =
    nav
      .filter((n) => pathname === n.path || pathname.startsWith(`${n.path}/`) || (n.path !== nav[0].path && pathname.startsWith(n.path)))
      .sort((a, b) => b.path.length - a.path.length)[0]?.id ?? nav[0].id

  const primaryIds = primaryNav ?? nav.map((n) => n.id)
  const bottomItems = nav.filter((n) => primaryIds.includes(n.id)).slice(0, MAX_BOTTOM_ITEMS)
  const overflowItems = nav.filter((n) => !bottomItems.includes(n))
  const showOverflow = overflowItems.length > 0

  const [showSheet, setShowSheet] = useState(false)

  // ── Dark mode (class strategy, persist localStorage) ──
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false
    return (localStorage.getItem('tki5r:theme') ?? 'light') === 'dark'
  })
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try { localStorage.setItem('tki5r:theme', dark ? 'dark' : 'light') } catch { /* noop */ }
  }, [dark])

  const handleLogout = async () => {
    if (isFormDirty()) {
      pendingRef.current = { to: '/login', logout: true }
      setShowLeave(true)
      return
    }
    await logout()
    toast.success('Berhasil keluar')
    navigate({ to: '/login' })
  }

  // ── Unsaved-form guard ──
  const router = useRouter()
  const [showLeave, setShowLeave] = useState(false)
  const allowNavRef = useRef(false)
  const showLeaveRef = useRef(false)
  const pendingRef = useRef<{ to: string; logout?: boolean } | null>(null)

  useEffect(() => {
    return router.subscribe('onBeforeNavigate', (e) => {
      if (isFormDirty() && !allowNavRef.current && !showLeaveRef.current) {
        showLeaveRef.current = true
        const targetHref: string = (e as any).toLocation?.href
        pendingRef.current = targetHref ? { to: targetHref } : null
        setShowLeave(true)
        const cur = router.state.location.href
        allowNavRef.current = true
        router
          .navigate({ href: cur, replace: true })
          .finally(() => setTimeout(() => (allowNavRef.current = false), 50))
      }
    })
  }, [router])

  const requestNav = (to: string, opts?: { logout?: boolean }) => {
    if (to === pathname) return
    if (isFormDirty()) {
      pendingRef.current = { to, ...opts }
      setShowLeave(true)
      return
    }
    if (opts?.logout) { void handleLogout(); return }
    navigate({ to })
  }

  const cancelLeave = () => { pendingRef.current = null; showLeaveRef.current = false; setShowLeave(false) }
  const confirmLeave = () => {
    setFormDirty(false); showLeaveRef.current = false; setShowLeave(false)
    const pending = pendingRef.current; pendingRef.current = null
    if (pending?.logout) { void logout().then(() => { toast.success('Berhasil keluar'); navigate({ to: pending.to }) }) }
    else if (pending) { navigate(pending.to.startsWith('http') || pending.to.includes('?') ? { href: pending.to } : { to: pending.to }) }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas lg:flex-row">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-56 lg:flex-col lg:border-r lg:border-border lg:bg-white">
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ClipboardCheck size={14} />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{title}</p>
            <p className="text-[10px] text-muted-foreground/70">{subtitle}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {nav.map((item) => {
            const Icon = item.icon
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => requestNav(item.path)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
              >
                <Icon size={16} className="w-5" />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="space-y-1 border-t border-border px-3 py-3">
          <button
            type="button"
            onClick={() => setDark((d) => !d)}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground/70 transition hover:bg-muted hover:text-foreground"
          >
            {dark ? <Sun size={16} className="w-5" /> : <Moon size={16} className="w-5" />}
            {dark ? 'Mode Terang' : 'Mode Gelap'}
          </button>
          <a href="/" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground/70 transition hover:bg-muted hover:text-foreground">
            <ArrowLeft size={16} className="w-5" />Situs
          </a>
          <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive/10">
            <LogOut size={16} className="w-5" />Keluar
          </button>
        </div>
      </aside>

      {/* ── Mobile header ── */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-white/90 px-4 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ClipboardCheck size={14} />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{title}</p>
            <p className="text-[10px] text-muted-foreground/70">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setDark((d) => !d)}
            aria-label={dark ? 'Mode terang' : 'Mode gelap'}
            className="text-muted-foreground"
          >
            {dark ? <Sun size={14} /> : <Moon size={14} />}
          </Button>
          <Button variant="secondary" size="sm" onClick={handleLogout} className="h-7 px-3 text-xs font-semibold">Keluar</Button>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 px-4 py-5 pb-[calc(3.25rem+env(safe-area-inset-bottom,0px))] sm:px-6 lg:ml-56 lg:py-6 lg:pb-6">{children}</main>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white/95 backdrop-blur-xl lg:hidden">
        <div className="flex">
          {bottomItems.map((item) => {
            const Icon = item.icon
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => requestNav(item.path)}
                className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition ${isActive ? 'text-primary' : 'text-muted-foreground/60'}`}
              >
                {isActive && <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary" />}
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            )
          })}
          {showOverflow && (
            <button
              type="button"
              onClick={() => setShowSheet(true)}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition ${overflowItems.some((n) => n.id === active) ? 'text-primary' : 'text-muted-foreground/60'}`}
            >
              {overflowItems.some((n) => n.id === active) && <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary" />}
              <Ellipsis size={16} />
              <span>Lainnya</span>
            </button>
          )}
        </div>
      </nav>

      {/* ── Bottom sheet: menu lainnya ── */}
      <Sheet open={showSheet} onOpenChange={setShowSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetTitle className="mb-3 text-xs font-bold text-muted-foreground">Menu Lainnya</SheetTitle>
          <div className="space-y-1">
            {overflowItems.map((item) => {
              const Icon = item.icon
              const isActive = active === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setShowSheet(false); requestNav(item.path) }}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition ${isActive ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:bg-muted'}`}
                >
                  <Icon size={16} className="w-5" />
                  <span className="text-sm font-semibold">{item.label}</span>
                  {isActive && <Check size={14} className="ml-auto" />}
                </button>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Leave-form confirmation dialog ── */}
      <Dialog open={showLeave} onOpenChange={(o) => { if (!o) cancelLeave() }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
                <AlertTriangle size={18} />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-extrabold tracking-tight">Keluar dari form?</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-muted-foreground">
                  Isian tersimpan otomatis sebagai draft. Kamu bisa lanjut mengisi kapan saja.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col sm:items-stretch">
            <Button variant="default" onClick={confirmLeave} className="w-full">Tetap Keluar</Button>
            <Button variant="outline" onClick={cancelLeave} className="w-full">Kembali Mengisi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
