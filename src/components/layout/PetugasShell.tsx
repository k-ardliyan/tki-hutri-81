/**
 * PetugasShell — wrapper AppShell untuk area petugas snack.
 * Nav: Distribusi, Dashboard, Riwayat (semua di /snack/* — halaman operasional sama dgn admin,
 * perbedaan capability di-handle permission server-side).
 */
import { Gauge, History, QrCode } from 'lucide-react';
import type { NavSection } from '../../lib/nav';
import AppShell from './AppShell';

const NAV: NavSection[] = [
  {
    title: 'Utama',
    items: [
      { id: 'distribution', label: 'Distribusi', icon: QrCode, path: '/snack/distribution' },
      { id: 'dashboard', label: 'Dashboard', icon: Gauge, path: '/snack/dashboard' },
      { id: 'history', label: 'Riwayat', icon: History, path: '/snack/history' },
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
