import { createFileRoute, Outlet } from '@tanstack/react-router';
import AuditShell from '../components/layout/AuditShell';
import { requireRole } from '../lib/routeGuard';

export const Route = createFileRoute('/audit')({
  beforeLoad: async () => {
    await requireRole(['audit', 'admin', 'superadmin']);
  },
  component: AuditLayout,
});

function AuditLayout() {
  return (
    <AuditShell>
      <Outlet />
    </AuditShell>
  );
}
