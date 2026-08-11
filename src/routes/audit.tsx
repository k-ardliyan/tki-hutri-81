import { createFileRoute, Outlet } from '@tanstack/react-router';
import { AuditDashboardSkeleton } from '~/components/loading/skeletons';
import AuditShell from '../components/layout/AuditShell';
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
