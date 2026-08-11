import { createFileRoute, Outlet } from '@tanstack/react-router';
import PetugasShell from '../components/layout/PetugasShell';
import { PetugasDashboardSkeleton } from '../components/ui/skeletons';
import { requireRole } from '../lib/routeGuard';

export const Route = createFileRoute('/petugas')({
  beforeLoad: async () => {
    await requireRole(['petugas', 'admin', 'superadmin']);
  },
  component: PetugasLayout,
  pendingComponent: PetugasPending,
});

function PetugasPending() {
  return (
    <PetugasShell>
      <PetugasDashboardSkeleton />
    </PetugasShell>
  );
}

function PetugasLayout() {
  return (
    <PetugasShell>
      <Outlet />
    </PetugasShell>
  );
}
