/**
 * AuditShell — wrapper AppShell untuk area tim audit.
 * Nav: Dashboard, Isi, Hasil. Read+write (bisa isi form).
 */
import AppShell from './AppShell'
import type { ShellNavItem } from './AppShell'

const NAV: ShellNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fa-gauge-high', path: '/audit' },
  { id: 'isi', label: 'Isi', icon: 'fa-pen-to-square', path: '/audit/isi' },
  { id: 'hasil', label: 'Hasil', icon: 'fa-trophy', path: '/audit/hasil' },
]

export default function AuditShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShell nav={NAV} title="Tim Audit">
      {children}
    </AppShell>
  )
}
