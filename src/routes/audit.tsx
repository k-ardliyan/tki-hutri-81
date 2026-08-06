import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requireRole } from '../lib/routeGuard'
import AuditShell from '../components/layout/AuditShell'

export const Route = createFileRoute('/audit')({
  beforeLoad: async () => {
    await requireRole(['audit', 'admin', 'superadmin'])
  },
  component: AuditLayout,
})

function AuditLayout() {
  return (
    <AuditShell>
      <Outlet />
    </AuditShell>
  )
}
