import { createFileRoute, Outlet } from '@tanstack/react-router';
import AdminShell from '../components/layout/AdminShell';
import PetugasShell from '../components/layout/PetugasShell';
import { requireRole } from '../lib/routeGuard';

export const Route = createFileRoute('/snack')({
  beforeLoad: async () => {
    const role = await requireRole(['superadmin', 'admin', 'petugas']);
    return { snackRole: role };
  },
  component: SnackLayout,
});

/**
 * Shell selector — render shell sesuai role dari route context.
 * admin/superadmin → AdminShell (nav penuh: Penilaian, Snack, Kelola, Akses);
 * petugas → PetugasShell (Distribusi, Dashboard, Riwayat).
 * Child route renders its own specific pending skeleton inside Outlet without flashing layout shell.
 */
function SnackShell({ children }: { children: React.ReactNode }) {
  const { snackRole } = Route.useRouteContext() ?? {};
  if (snackRole === 'petugas') {
    return <PetugasShell>{children}</PetugasShell>;
  }
  if (snackRole === 'admin' || snackRole === 'superadmin') {
    return <AdminShell>{children}</AdminShell>;
  }
  return <div className="flex-1 min-w-0">{children}</div>;
}

function SnackLayout() {
  return (
    <SnackShell>
      <Outlet />
    </SnackShell>
  );
}
