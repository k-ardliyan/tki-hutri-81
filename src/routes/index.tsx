/**
 * Landing page route — now at root `/` (was /beranda).
 */
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';
import { HomePageSkeleton } from '~/components/loading/skeletons';
import { getCompetitions } from '../server/functions/competitions';
import { getTeamSummary } from '../server/functions/teams';

const HomePage = lazyRouteComponent(() => import('../components/pages/HomePage'));

export const Route = createFileRoute('/')({
  loader: async () => ({
    competitions: await getCompetitions(),
    teamSummary: await getTeamSummary(),
  }),
  component: HomePage,
  pendingComponent: HomePageSkeleton,
  errorComponent: HomeErrorFallback,
});

function HomeErrorFallback({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="font-heading text-lg font-black text-foreground">Gagal Memuat Beranda</h2>
      <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">
        Koneksi database sedang padat atau bermasalah. Silakan coba lagi — data lama tidak hilang.
      </p>
      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-full bg-brand-red px-6 py-2.5 text-xs font-bold text-white transition hover:bg-red-700 cursor-pointer"
      >
        <i className="fa-solid fa-rotate-right" />
        Coba Lagi
      </button>
    </div>
  );
}
