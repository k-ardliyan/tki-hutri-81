import { createRouter } from '@tanstack/react-router';
import PageFallback from './components/ui/PageFallback';
import { routeTree } from './routeTree.gen';

export function getRouter() {
  return createRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
    defaultPendingMs: 0,
    defaultPendingMinMs: 150,
    defaultPendingComponent: PageFallback,
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
