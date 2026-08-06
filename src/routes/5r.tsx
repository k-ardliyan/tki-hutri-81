import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router'
import PageFallback from '../components/ui/PageFallback'
import { getRooms, getForms, getSubmissions } from '../server/functions/5r'

const Hasil5RPage = lazyRouteComponent(() => import('../components/pages/Hasil5RPage'))

export const Route = createFileRoute('/5r')({
  loader: async () => {
    const [rooms, forms, submissions] = await Promise.all([getRooms(), getForms(), getSubmissions()])
    return { rooms, forms, submissions }
  },
  component: Hasil5RPage,
  pendingComponent: PageFallback,
})
