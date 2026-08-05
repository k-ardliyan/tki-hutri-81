import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router'
import PageFallback from '../components/ui/PageFallback'
import { getTeams, getTeamSummary } from '../server/functions/teams'

const TimPage = lazyRouteComponent(() => import('../components/pages/TimPage'))

export const Route = createFileRoute('/tim')({
  loader: async () => ({
    teams: await getTeams(),
    summary: await getTeamSummary(),
  }),
  component: TimPage,
  pendingComponent: PageFallback,
})