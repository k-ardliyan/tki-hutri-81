import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server';

// TanStack Start v1.168+ (react-start 1.168.x):
// - handler is passed as the FIRST argument to createStartHandler
// - the default export must be an OBJECT with a `fetch` method
//   (dev middleware calls `entry.default.fetch(request)`)
// - the router entry (`src/router.tsx`) is loaded automatically via the
//   `#tanstack-router-entry` virtual module — no createRouter option needed
const fetch = createStartHandler(defaultStreamHandler);

export default {
  async fetch(...args: Parameters<typeof fetch>) {
    return await fetch(...args);
  },
};
