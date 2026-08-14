import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';
import { RotateCw } from 'lucide-react';
import { RundownSkeleton } from '~/components/loading/skeletons';
import { getRundown } from '../server/functions/rundown';

const RundownPage = lazyRouteComponent(() => import('../components/pages/RundownPage'));

export const Route = createFileRoute('/rundown')({
  loader: async () => ({
    rundown: await getRundown(),
  }),
  component: RundownPage,
  pendingComponent: RundownSkeleton,
  errorComponent: RundownErrorFallback,
});

function RundownErrorFallback({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="font-heading text-lg font-black text-foreground">Gagal Memuat Rundown</h2>
      <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">
        Terjadi kesalahan saat memuat jadwal rundown. Silakan coba lagi.
      </p>
      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-full bg-brand-red px-6 py-2.5 text-xs font-bold text-white transition hover:bg-red-700 cursor-pointer"
      >
        <RotateCw size={13} />
        <span>Coba Lagi</span>
      </button>
    </div>
  );
}
