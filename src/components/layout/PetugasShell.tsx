/**
 * PetugasShell — wrapper AppShell untuk area petugas snack.
 * Nav: Scan, Dashboard (read-only).
 */
import { Gauge, QrCode } from 'lucide-react';
import type { NavSection } from '../../lib/nav';
import AppShell from './AppShell';

const NAV: NavSection[] = [
  {
    title: 'Utama',
    items: [
      { id: 'scan', label: 'Scan', icon: QrCode, path: '/petugas' },
      { id: 'dashboard', label: 'Dashboard', icon: Gauge, path: '/petugas/dashboard' },
    ],
  },
];

export default function PetugasShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShell nav={NAV} title="Petugas Snack">
      {children}
    </AppShell>
  );
}
