import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';
import { RundownSkeleton } from '~/components/loading/skeletons';
import { getRundown } from '../server/functions/rundown';

const RundownPage = lazyRouteComponent(() => import('../components/pages/RundownPage'));

export const Route = createFileRoute('/rundown')({
  loader: async () => ({
    rundown: await getRundown(),
  }),
  component: RundownPage,
  pendingComponent: RundownSkeleton,
});
