import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router'
import PageFallback from '../components/ui/PageFallback'
import { getRooms, getForms } from '../server/functions/5r'

const Hasil5RPage = lazyRouteComponent(() => import('../components/pages/Hasil5RPage'))

export const Route = createFileRoute('/5r')({
  loader: async () => ({
    rooms: await getRooms(),
    forms: await getForms(),
  }),
  component: Hasil5RPage,
  pendingComponent: PageFallback,
})
