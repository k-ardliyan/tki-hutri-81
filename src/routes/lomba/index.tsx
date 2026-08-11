import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';
import { LombaPageSkeleton } from '~/components/loading/skeletons';

const LombaPage = lazyRouteComponent(() => import('../../components/pages/LombaPage'));

export const Route = createFileRoute('/lomba/')({
  component: LombaPage,
  pendingComponent: LombaPageSkeleton,
});
