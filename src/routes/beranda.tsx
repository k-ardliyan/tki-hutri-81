import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router'
import PageFallback from '../components/ui/PageFallback'
import { getCompetitions } from '../server/functions/competitions'
import { getTeamSummary } from '../server/functions/teams'

const HomePage = lazyRouteComponent(() => import('../components/pages/HomePage'))

export const Route = createFileRoute('/beranda')({
  loader: async () => ({
    competitions: await getCompetitions(),
    teamSummary: await getTeamSummary(),
  }),
  component: HomePage,
  pendingComponent: PageFallback,
})