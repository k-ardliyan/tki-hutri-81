import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getSession } from '../server/functions/5r'
import AuditShell from '../components/layout/AuditShell'

export const Route = createFileRoute('/audit')({
  beforeLoad: async () => {
    const { role } = await getSession()
    if (!role) {
      throw redirect({ to: '/login' })
    }
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
