import { createFileRoute, Outlet } from '@tanstack/react-router';
import AdminShell from '../components/layout/AdminShell';
import { AdminDashboardSkeleton } from '../components/ui/skeletons';
import { requireRole } from '../lib/routeGuard';

export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    await requireRole(['superadmin', 'admin']);
  },
  component: AdminLayout,
  pendingComponent: AdminPending,
});

function AdminPending() {
  return (
    <AdminShell>
      <AdminDashboardSkeleton />
    </AdminShell>
  );
}

function AdminLayout() {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
