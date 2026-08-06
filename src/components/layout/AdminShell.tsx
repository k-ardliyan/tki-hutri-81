/**
 * AdminShell — wrapper AppShell untuk area panitia/admin/superadmin.
 * Nav dinamis per role. Bottom bar: max 5 utama + "Lainnya" sheet.
 */
import { useEffect, useState } from 'react'
import { CalendarDays, Cookie, Gauge, IdCard, QrCode, SquarePen, Trophy, UserCog, Users } from 'lucide-react'
import AppShell from './AppShell'
import type { ShellNavItem } from './AppShell'
import { getSession } from '../../server/functions/auth'
import type { UserRole } from '../../lib/auth'

const BASE_NAV: ShellNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Gauge, path: '/admin' },
  { id: 'isi', label: 'Isi', icon: SquarePen, path: '/admin/isi' },
  { id: 'hasil', label: 'Hasil', icon: Trophy, path: '/admin/hasil' },
  { id: 'snack', label: 'Snack', icon: Cookie, path: '/admin/snack' },
  { id: 'scan', label: 'Scan', icon: QrCode, path: '/admin/snack/scan' },
  { id: 'gelang', label: 'Gelang', icon: IdCard, path: '/admin/snack/gelang' },
  { id: 'sessions', label: 'Sesi Snack', icon: CalendarDays, path: '/admin/snack/sessions' },
  { id: 'karyawan', label: 'Karyawan', icon: Users, path: '/admin/employees' },
]

const SUPERADMIN_NAV: ShellNavItem[] = [
  ...BASE_NAV,
  { id: 'users', label: 'Users', icon: UserCog, path: '/admin/users' },
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
