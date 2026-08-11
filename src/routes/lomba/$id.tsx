import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';
import { LombaPageSkeleton } from '../../components/ui/skeletons';

const LombaPage = lazyRouteComponent(() => import('../../components/pages/LombaPage'));

export const Route = createFileRoute('/lomba/$id')({
  component: LombaPage,
  pendingComponent: LombaPageSkeleton,
});
