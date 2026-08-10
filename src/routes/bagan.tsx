import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/bagan')({
  beforeLoad: () => {
    throw redirect({
      to: '/live',
      search: { tab: 'bagan' },
    });
  },
});
