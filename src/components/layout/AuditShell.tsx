/**
 * AuditShell — wrapper AppShell untuk area tim audit.
 * Nav: Dashboard, Isi, Hasil. Read+write (bisa isi form).
 */
import { Gauge, SquarePen, Trophy } from 'lucide-react'
import AppShell from './AppShell'
import type { NavSection } from '../../lib/nav'

const NAV: NavSection[] = [
  {
    title: 'Penilaian',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: Gauge, path: '/audit' },
      { id: 'isi', label: 'Isi Penilaian', icon: SquarePen, path: '/audit/isi' },
      { id: 'hasil', label: 'Hasil Audit', icon: Trophy, path: '/audit/hasil' },
    ],
  },
]

export default function AuditShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShell nav={NAV} title="Tim Audit">
      {children}
    </AppShell>
  )
}
