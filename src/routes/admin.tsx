import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getSession } from '../server/functions/5r'
import AdminShell from '../components/layout/AdminShell'

export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    const { role } = await getSession()
    if (role !== 'panitia') {
      throw redirect({ to: '/login' })
    }
  },
  component: PanitiaLayout,
})

function PanitiaLayout() {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  )
}
