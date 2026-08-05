import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

export default defineConfig({
  plugins: [
    // Order matters: tanstackRouter BEFORE tanstackStart.
    // Do NOT pass autoCodeSplitting: true (breaks runtime in v1.168).
    // Start's built-in code splitter (addHmr: true) throws
    // 'Duplicate declaration "hot"' in v1.168.x — disable it via
    // tanstackStart({ router: { codeSplittingOptions } }).
    // Per-route splitting via React.lazy happens in route files.
    tanstackRouter({
      target: 'react',
      codeSplittingOptions: { defaultBehavior: [] },
      plugin: { hmr: { style: 'webpack' } },
    }),
    tanstackStart({
      router: {
        codeSplittingOptions: { defaultBehavior: [] },
        // Dev-only workaround: with hmrStyle 'vite' the code splitter injects
        // TWO `const hot` declarations (react-refresh-ignored + stable-hmr)
        // → 'Duplicate declaration "hot"' in v1.168.x. webpack style injects
        // only one (import.meta.webpackHot), which is undefined in Vite but
        // harmless. Production build sets addHmr=false regardless.
        plugin: { hmr: { style: 'webpack' } },
      },
    }),
    nitro(),
    viteReact(),
    tailwindcss(),
  ],
  resolve: {
    tsconfigPaths: true, // Vite 8 native — no vite-tsconfig-paths plugin needed
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('gsap')) return 'vendor-gsap'
          if (id.includes('tanstack')) return 'vendor-tanstack'
          if (id.includes('react-dom') || id.includes('/react/')) return 'vendor-react'
          return 'vendor'
        },
      },
    },
  },
})
