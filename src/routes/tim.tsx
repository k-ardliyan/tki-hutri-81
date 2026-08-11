import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';
import { TimPageSkeleton } from '../components/ui/skeletons';
import { getTeamSummary, getTeams } from '../server/functions/teams';

const TimPage = lazyRouteComponent(() => import('../components/pages/TimPage'));

export const Route = createFileRoute('/tim')({
  loader: async () => ({
    teams: await getTeams(),
    summary: await getTeamSummary(),
  }),
  component: TimPage,
  pendingComponent: TimPageSkeleton,
});
