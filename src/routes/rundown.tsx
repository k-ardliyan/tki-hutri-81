import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router'
import PageFallback from '../components/ui/PageFallback'
import { getRundown } from '../server/functions/rundown'

const RundownPage = lazyRouteComponent(() => import('../components/pages/RundownPage'))

export const Route = createFileRoute('/rundown')({
  loader: async () => ({
    rundown: await getRundown(),
  }),
  component: RundownPage,
  pendingComponent: PageFallback,
})