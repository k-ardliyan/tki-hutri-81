import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
//
// manualChunks strategy:
// - vendor:react    → React core (rarely changes, large, perfect for long-term cache)
// - vendor:router   → react-router-dom
// - vendor:gsap     → animation library (loaded by pages on demand)
// - vendor:sharp is dev-only — not in production bundle
export default defineConfig({
  server: { historyApiFallback: true },
  preview: { historyApiFallback: true },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  build: {
    chunkSizeWarningLimit: 600,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (id.includes('gsap')) return 'vendor-gsap'
          if (id.includes('react-router')) return 'vendor-router'
          if (id.includes('react-dom') || id.includes('/react/')) return 'vendor-react'
          return 'vendor'
        },
      },
    },
  },
})