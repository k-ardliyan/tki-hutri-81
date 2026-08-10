import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router'
import PageFallback from '../../components/ui/PageFallback'

const LombaPage = lazyRouteComponent(() => import('../../components/pages/LombaPage'))

export const Route = createFileRoute('/lomba/$id')({
  component: LombaPage,
  pendingComponent: PageFallback,
})