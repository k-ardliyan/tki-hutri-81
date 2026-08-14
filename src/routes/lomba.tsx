import { createFileRoute, Outlet } from '@tanstack/react-router';
import { RotateCw } from 'lucide-react';
import { LombaPageSkeleton } from '~/components/loading/skeletons';
import { getCompetitions } from '../server/functions/competitions';

export const Route = createFileRoute('/lomba')({
  loader: async () => ({
    competitions: await getCompetitions(),
  }),
  component: LombaLayout,
  pendingComponent: LombaPageSkeleton,
  errorComponent: LombaErrorFallback,
});

function LombaLayout() {
  return <Outlet />;
}

function LombaErrorFallback({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="font-heading text-lg font-black text-foreground">
        Gagal Memuat Halaman Lomba
      </h2>
      <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">
        Terjadi kesalahan saat memuat data lomba. Silakan coba lagi.
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
