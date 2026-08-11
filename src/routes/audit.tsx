import { createFileRoute, Outlet } from '@tanstack/react-router';
import AuditShell from '../components/layout/AuditShell';
import { AuditDashboardSkeleton } from '../components/ui/skeletons';
import { requireRole } from '../lib/routeGuard';

export const Route = createFileRoute('/audit')({
  beforeLoad: async () => {
    await requireRole(['audit', 'admin', 'superadmin']);
  },
  component: AuditLayout,
  pendingComponent: AuditPending,
});

function AuditPending() {
  return (
    <AuditShell>
      <AuditDashboardSkeleton />
    </AuditShell>
  );
}

function AuditLayout() {
  return (
    <AuditShell>
      <Outlet />
    </AuditShell>
  );
}
