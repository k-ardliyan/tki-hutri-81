import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import AdminShell from '../components/layout/AdminShell';
import PetugasShell from '../components/layout/PetugasShell';
import { requireRole } from '../lib/routeGuard';
import { getSnackRoleCache, setSnackRoleCache } from '../lib/snackRoleCache';
import { getSession } from '../server/functions/auth';

export const Route = createFileRoute('/snack')({
  beforeLoad: async () => {
    const role = await requireRole(['superadmin', 'admin', 'petugas']);
    setSnackRoleCache(role);
    return { snackRole: role };
  },
  component: SnackLayout,
});

/**
 * Shell selector — render shell sesuai role pengguna secara instan & persisten.
 * - Membaca route context, in-memory cache, dan sessionStorage agar TIDAK PERNAH flicker/salah shell.
 * - petugas → PetugasShell (Distribusi, Dashboard, Riwayat)
 * - admin/superadmin → AdminShell (Penilaian, Snack, Kelola, Akses)
 */
function SnackShell({ children }: { children: React.ReactNode }) {
  const context = Route.useRouteContext() as { snackRole?: string } | undefined;
  const initialRole = context?.snackRole || getSnackRoleCache();

  const [role, setRole] = useState<string | null>(initialRole);

  useEffect(() => {
    if (context?.snackRole) {
      setSnackRoleCache(context.snackRole);
      setRole(context.snackRole);
    } else if (!role) {
      void getSession().then((s) => {
        if (s?.role) {
          setSnackRoleCache(s.role);
          setRole(s.role);
        }
      });
    }
  }, [context?.snackRole, role]);

  if (role === 'petugas') {
    return <PetugasShell>{children}</PetugasShell>;
  }
  if (role === 'admin' || role === 'superadmin') {
    return <AdminShell>{children}</AdminShell>;
  }

  // Jika role belum termuat, render kontainer netral tanpa flash shell admin
  return <div className="min-h-screen w-full bg-background">{children}</div>;
}

function SnackLayout() {
  return (
    <SnackShell>
      <Outlet />
    </SnackShell>
  );
}
