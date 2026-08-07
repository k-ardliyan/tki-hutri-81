/**
 * AdminShell — wrapper AppShell untuk area panitia/admin/superadmin.
 * Nav grouped per section: Penilaian, Snack, Kelola (Users hanya superadmin).
 */
import { useEffect, useState } from 'react'
import { CalendarDays, Cookie, Gauge, IdCard, QrCode, SquarePen, Trophy, UserCog, Users } from 'lucide-react'
import AppShell from './AppShell'
import type { NavSection } from '../../lib/nav'
import { getSession } from '../../server/functions/auth'
import type { UserRole } from '../../lib/auth'

const BASE_SECTIONS: NavSection[] = [
  {
    title: 'Penilaian',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: Gauge, path: '/admin' },
      { id: 'isi', label: 'Isi', icon: SquarePen, path: '/admin/isi' },
      { id: 'hasil', label: 'Hasil', icon: Trophy, path: '/admin/hasil' },
    ],
  },
  {
    title: 'Snack',
    items: [
      { id: 'snack', label: 'Snack', icon: Cookie, path: '/admin/snack' },
      { id: 'scan', label: 'Scan', icon: QrCode, path: '/admin/snack/scan' },
      { id: 'gelang', label: 'Gelang', icon: IdCard, path: '/admin/snack/gelang' },
      { id: 'sessions', label: 'Sesi Snack', icon: CalendarDays, path: '/admin/snack/sessions' },
    ],
  },
  {
    title: 'Kelola',
    items: [
      { id: 'karyawan', label: 'Karyawan', icon: Users, path: '/admin/employees' },
    ],
  },
]

const SUPERADMIN_SECTIONS: NavSection[] = [
  ...BASE_SECTIONS.map((s) => ({ ...s, items: [...s.items] })),
  {
    title: 'Akses',
    items: [{ id: 'users', label: 'Users', icon: UserCog, path: '/admin/users' }],
  },
]

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole | null>(null)

  useEffect(() => {
    void getSession().then((s) => setRole(s.role))
  }, [])

  const sections = role === 'superadmin' ? SUPERADMIN_SECTIONS : BASE_SECTIONS

  return (
    <AppShell nav={sections} title={role === 'superadmin' ? 'Superadmin' : 'Panitia'}>
      {children}
    </AppShell>
  )
}
