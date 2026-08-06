/**
 * AdminShell — wrapper AppShell untuk area panitia/admin/superadmin.
 * Nav dinamis per role. Bottom bar: max 5 utama + "Lainnya" sheet.
 */
import { useEffect, useState } from 'react'
import AppShell from './AppShell'
import type { ShellNavItem } from './AppShell'
import { getSession } from '../../server/functions/auth'
import type { UserRole } from '../../lib/auth'

const BASE_NAV: ShellNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fa-gauge-high', path: '/admin' },
  { id: 'isi', label: 'Isi', icon: 'fa-pen-to-square', path: '/admin/isi' },
  { id: 'hasil', label: 'Hasil', icon: 'fa-trophy', path: '/admin/hasil' },
  { id: 'snack', label: 'Snack', icon: 'fa-cookie-bite', path: '/admin/snack' },
  { id: 'scan', label: 'Scan', icon: 'fa-qrcode', path: '/admin/snack/scan' },
  { id: 'gelang', label: 'Gelang', icon: 'fa-id-card', path: '/admin/snack/gelang' },
  { id: 'sessions', label: 'Sesi Snack', icon: 'fa-calendar-days', path: '/admin/snack/sessions' },
  { id: 'karyawan', label: 'Karyawan', icon: 'fa-users', path: '/admin/employees' },
]

const SUPERADMIN_NAV: ShellNavItem[] = [
  ...BASE_NAV,
  { id: 'users', label: 'Users', icon: 'fa-user-gear', path: '/admin/users' },
]

// Bottom bar: Dashboard, Isi, Hasil, Snack, + "Lainnya" sheet berisi sisanya
const PRIMARY_IDS = ['dashboard', 'isi', 'hasil', 'snack']

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole | null>(null)

  useEffect(() => {
    void getSession().then((s) => setRole(s.role))
  }, [])

  const nav = role === 'superadmin' ? SUPERADMIN_NAV : BASE_NAV

  return (
    <AppShell nav={nav} title={role === 'superadmin' ? 'Superadmin' : 'Panitia'} primaryNav={PRIMARY_IDS}>
      {children}
    </AppShell>
  )
}
