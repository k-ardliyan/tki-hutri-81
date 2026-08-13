import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';
import { TimPageSkeleton } from '~/components/loading/skeletons';
import { getTeamSummary, getTeams } from '../server/functions/teams';

const TimPage = lazyRouteComponent(() => import('../components/pages/TimPage'));

export const Route = createFileRoute('/tim')({
  // Data tim relatif statis — cache lebih lama supaya navigasi bolak-balik
  // /tim↔/live tidak re-run loader (0 query DB dalam window stale).
  staleTime: 60_000,
  gcTime: 10 * 60_000,
  loader: async () => ({
    teams: await getTeams(),
    summary: await getTeamSummary(),
  }),
  component: TimPage,
  pendingComponent: TimPageSkeleton,
});
