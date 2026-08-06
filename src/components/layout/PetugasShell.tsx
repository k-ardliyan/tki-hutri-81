/**
 * PetugasShell — wrapper AppShell untuk area petugas snack.
 * Nav: Scan, Dashboard (read-only).
 */
import { Gauge, QrCode } from 'lucide-react'
import AppShell from './AppShell'
import type { ShellNavItem } from './AppShell'

const NAV: ShellNavItem[] = [
  { id: 'scan', label: 'Scan', icon: QrCode, path: '/petugas' },
  { id: 'dashboard', label: 'Dashboard', icon: Gauge, path: '/petugas/dashboard' },
]

export default function PetugasShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShell nav={NAV} title="Petugas Snack">
      {children}
    </AppShell>
  )
}
