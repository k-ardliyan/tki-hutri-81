/**
 * AppShell — shell generik untuk area internal (admin/audit).
 *
 * Mobile (< lg): header + bottom tab bar.
 * Desktop (lg+): left sidebar + content.
 *
 * Props:
 * - nav: daftar menu {id, label, icon, path}
 * - title: judul brand di header/sidebar
 * - subtitle: teks kecil di bawah title
 */
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useRouter } from '@tanstack/react-router'
import { logout } from '../../server/functions/5r'
import { isFormDirty, setFormDirty } from '../../lib/unsavedGuard'

export interface ShellNavItem {
  id: string
  label: string
  icon: string
  path: string
}

export default function AppShell({
  nav,
  title,
  subtitle = 'HUT RI ke-81',
  children,
}: {
  nav: ShellNavItem[]
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const active = nav.find((n) => pathname === n.path || (n.path !== nav[0].path && pathname.startsWith(n.path)))?.id ?? nav[0].id

  const handleLogout = async () => {
    if (isFormDirty()) {
      pendingRef.current = { to: '/login', logout: true }
      setShowLeave(true)
      return
    }
    await logout()
    navigate({ to: '/login' })
  }

  // ── Unsaved-form guard (modal konfirmasi saat keluar halaman isi) ──
  const router = useRouter()
  const [showLeave, setShowLeave] = useState(false)
  const allowNavRef = useRef(false)
  const showLeaveRef = useRef(false)
  const pendingRef = useRef<{ to: string; logout?: boolean } | null>(null)

  // Back/forward browser: simpan target, tahan navigasi + munculkan dialog
  useEffect(() => {
    return router.subscribe('onBeforeNavigate', (e) => {
      if (isFormDirty() && !allowNavRef.current && !showLeaveRef.current) {
        showLeaveRef.current = true
        // simpan tujuan navigasi dari event agar confirm bisa navigate ke sana
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
    if (opts?.logout) {
      void handleLogout()
      return
    }
    navigate({ to })
  }

  const cancelLeave = () => {
    pendingRef.current = null
    showLeaveRef.current = false
    setShowLeave(false)
  }

  const confirmLeave = () => {
    setFormDirty(false)
    showLeaveRef.current = false
    setShowLeave(false)
    const pending = pendingRef.current
    pendingRef.current = null
    if (pending?.logout) {
      void logout().then(() => navigate({ to: pending.to }))
    } else if (pending) {
      // pending.to bisa berupa href penuh (dari onBeforeNavigate) atau path
      navigate(pending.to.startsWith('http') || pending.to.includes('?') ? { href: pending.to } : { to: pending.to })
    }
    // pending == null (edge) → user tinggal tekan lagi, sekarang bersih
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas lg:flex-row">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-56 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white">
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-red/10 text-brand-red">
            <i className="fa-solid fa-clipboard-check text-xs" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{title}</p>
            <p className="text-[10px] text-slate-400">{subtitle}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {nav.map((item) => {
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => requestNav(item.path)}
                className={`flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-brand-red text-white'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <i className={`fa-solid ${item.icon} w-5 text-center text-xs`} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="space-y-1 border-t border-slate-200 px-3 py-3">
          <a
            href="/"
            className="flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-semibold text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
          >
            <i className="fa-solid fa-arrow-left w-5 text-center text-xs" />
            Situs
          </a>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-50"
          >
            <i className="fa-solid fa-right-from-bracket w-5 text-center text-xs" />
            Keluar
          </button>
        </div>
      </aside>

      {/* ── Mobile header ── */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-red/10 text-brand-red">
            <i className="fa-solid fa-clipboard-check text-xs" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{title}</p>
            <p className="text-[10px] text-slate-400">{subtitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-200"
        >
          Keluar
        </button>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 px-4 py-5 pb-[calc(3.25rem+env(safe-area-inset-bottom,0px))] sm:px-6 lg:ml-56 lg:py-6 lg:pb-6">{children}</main>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-xl lg:hidden">
        <div className="flex">
          {nav.map((item) => {
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => requestNav(item.path)}
                className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition ${
                  isActive ? 'text-brand-red' : 'text-slate-400'
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-brand-red" />
                )}
                <i className={`fa-solid ${item.icon} text-sm`} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* ── Leave-form confirmation dialog ── */}
      {showLeave && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-dialog-title"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          onMouseDown={() => cancelLeave()}
        >
          <div
            className="w-full max-w-sm rounded-[var(--radius-lg)] bg-white p-5 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <i className="fa-solid fa-triangle-exclamation" />
              </div>
              <div>
                <h3 id="leave-dialog-title" className="text-base font-extrabold tracking-tight text-slate-900">
                  Keluar dari form?
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Isian tersimpan otomatis sebagai draft. Kamu bisa lanjut mengisi kapan saja.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={confirmLeave}
                className="w-full rounded-[var(--radius-md)] bg-brand-red px-4 py-3 text-sm font-bold text-white transition hover:brightness-110"
              >
                Tetap Keluar
              </button>
              <button
                type="button"
                onClick={cancelLeave}
                className="w-full rounded-[var(--radius-md)] border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Kembali Mengisi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
