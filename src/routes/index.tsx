/**
 * Landing page route — now at root `/` (was /beranda).
 */
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';
import { HomePageSkeleton } from '~/components/loading/skeletons';
import { getCompetitions } from '../server/functions/competitions';
import { getTeamSummary } from '../server/functions/teams';

const HomePage = lazyRouteComponent(() => import('../components/pages/HomePage'));

export const Route = createFileRoute('/')({
  loader: async () => ({
    competitions: await getCompetitions(),
    teamSummary: await getTeamSummary(),
  }),
  component: HomePage,
  pendingComponent: HomePageSkeleton,
});
