import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requireRole } from '../lib/routeGuard'
import PetugasShell from '../components/layout/PetugasShell'

export const Route = createFileRoute('/petugas')({
  beforeLoad: async () => {
    await requireRole(['petugas', 'admin', 'superadmin'])
  },
  component: PetugasLayout,
})

function PetugasLayout() {
  return (
    <PetugasShell>
      <Outlet />
    </PetugasShell>
  )
}
