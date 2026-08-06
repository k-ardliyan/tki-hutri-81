/**
 * AuditShell — wrapper AppShell untuk area tim audit.
 * Nav: Dashboard, Isi, Hasil. Read+write (bisa isi form).
 */
import { Gauge, SquarePen, Trophy } from 'lucide-react'
import AppShell from './AppShell'
import type { ShellNavItem } from './AppShell'

const NAV: ShellNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Gauge, path: '/audit' },
  { id: 'isi', label: 'Isi', icon: SquarePen, path: '/audit/isi' },
  { id: 'hasil', label: 'Hasil', icon: Trophy, path: '/audit/hasil' },
]

export default function AuditShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShell nav={NAV} title="Tim Audit">
      {children}
    </AppShell>
  )
}
