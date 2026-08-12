/**
 * AdminShell — wrapper AppShell untuk area panitia/admin/superadmin.
 * Nav grouped per section: Penilaian, Snack, Kelola (Users hanya superadmin).
 */

import {
  CalendarDays,
  Gauge,
  GitFork,
  History,
  IdCard,
  QrCode,
  SquarePen,
  Trophy,
  UserCog,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { UserRole } from '../../lib/auth';
import type { NavSection } from '../../lib/nav';
import { getSession } from '../../server/functions/auth';
import AppShell from './AppShell';

const BASE_SECTIONS: NavSection[] = [
  {
    title: 'Penilaian',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: Gauge, path: '/admin' },
      { id: 'bagan', label: 'Bagan', icon: GitFork, path: '/admin/bagan' },
      { id: 'isi', label: 'Isi Penilaian', icon: SquarePen, path: '/admin/isi' },
      { id: 'hasil', label: 'Hasil Penilaian', icon: Trophy, path: '/admin/hasil' },
    ],
  },
  {
    title: 'Snack',
    items: [
      { id: 'distribution', label: 'Distribusi', icon: QrCode, path: '/snack/distribution' },
      { id: 'snack-dashboard', label: 'Dashboard Snack', icon: Gauge, path: '/snack/dashboard' },
      { id: 'snack-history', label: 'Riwayat', icon: History, path: '/snack/history' },
      { id: 'gelang', label: 'Gelang & QR', icon: IdCard, path: '/snack/gelang' },
      { id: 'sessions', label: 'Sesi Snack', icon: CalendarDays, path: '/snack/sessions' },
    ],
  },
  {
    title: 'Kelola',
    items: [
      { id: 'karyawan', label: 'Karyawan', icon: Users, path: '/admin/employees' },
      { id: 'teams', label: 'Tim', icon: Users, path: '/admin/teams' },
    ],
  },
];

const SUPERADMIN_SECTIONS: NavSection[] = [
  ...BASE_SECTIONS.map((s) => ({ ...s, items: [...s.items] })),
  {
    title: 'Akses',
    items: [{ id: 'users', label: 'Users', icon: UserCog, path: '/admin/users' }],
  },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    void getSession().then((s) => setRole(s.role));
  }, []);

  const sections = role === 'superadmin' ? SUPERADMIN_SECTIONS : BASE_SECTIONS;

  return (
    <AppShell nav={sections} title={role === 'superadmin' ? 'Superadmin' : 'Panitia'}>
      {children}
    </AppShell>
  );
}
