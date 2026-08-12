import { createFileRoute, redirect } from '@tanstack/react-router';

/** /snack → /snack/distribution (halaman operasional utama). */
export const Route = createFileRoute('/snack/')({
  beforeLoad: () => {
    throw redirect({ to: '/snack/distribution' });
  },
});
