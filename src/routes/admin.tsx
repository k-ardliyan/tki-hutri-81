import { createFileRoute, Outlet } from '@tanstack/react-router';
import AdminShell from '../components/layout/AdminShell';
import { requireRole } from '../lib/routeGuard';

export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    await requireRole(['superadmin', 'admin']);
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
