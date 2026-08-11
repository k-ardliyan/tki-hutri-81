import { createFileRoute, Outlet } from '@tanstack/react-router';
import { LombaPageSkeleton } from '~/components/loading/skeletons';
import { getCompetitions } from '../server/functions/competitions';

export const Route = createFileRoute('/lomba')({
  loader: async () => ({
    competitions: await getCompetitions(),
  }),
  component: LombaLayout,
  pendingComponent: LombaPageSkeleton,
});

function LombaLayout() {
  return <Outlet />;
}
