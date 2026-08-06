import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requireRole } from '../lib/routeGuard'
import AdminShell from '../components/layout/AdminShell'

export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    await requireRole(['superadmin', 'admin'])
  },
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  )
}
