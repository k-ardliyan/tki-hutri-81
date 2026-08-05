/**
 * AdminShell — wrapper AppShell untuk area panitia (admin) 5R.
 * Nav: Dashboard, Isi, Hasil, Karyawan.
 */
import AppShell from './AppShell'
import type { ShellNavItem } from './AppShell'

const NAV: ShellNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fa-gauge-high', path: '/admin' },
  { id: 'isi', label: 'Isi', icon: 'fa-pen-to-square', path: '/admin/isi' },
  { id: 'hasil', label: 'Hasil', icon: 'fa-trophy', path: '/admin/hasil' },
  { id: 'karyawan', label: 'Karyawan', icon: 'fa-users', path: '/admin/karyawan' },
]

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShell nav={NAV} title="Panitia 5R">
      {children}
    </AppShell>
  )
}
