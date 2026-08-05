# HUT RI ke-81 — PT TKI x PT FTP (TanStack Start)

Microsite lomba 17-an: estafet balon & estafet air. Dibangun dengan **TanStack Start** (SSR) — migrasi dari React Router SPA.

## Stack

- TanStack Start v1 (SSR) + TanStack Router + TanStack Query (terpasang, belum di-wire)
- Nitro (adapter produksi — deploy ke Vercel)
- React 19, Vite 8, TypeScript, GSAP
- Drizzle ORM + Postgres (layer DB diparkir — siap wire di fase berikutnya)
- Bun sebagai package manager (runtime produksi cukup Node)

## Perintah

```bash
bun install        # install dependencies
bun run dev        # dev server (SSR + HMR)
bun run build      # build production (dist/ + .output/ nitro)
bun run start      # serve production SSR via Nitro (node .output/server/index.mjs)
bun run typecheck  # tsc --noEmit
bun run lint       # oxlint
bun run db:push    # push schema ke DB (butuh .env DATABASE_URL)
bun run db:seed    # seed data (butuh .env DATABASE_URL)
```

## Struktur

- `src/routes/` — file-based routing TanStack (`/`, `/beranda`, `/lomba`, `/lomba/$id`, `/rundown`, `/tim`)
- `src/components/pages/` — halaman utama (lazy per route)
- `src/server/` — server functions + Drizzle schema (diparkir)
- `scripts/` — `seed.ts` + `seed-data/` (parkir DB)

## Deploy (Vercel)

Pakai **Nitro** (`nitro/vite` plugin di `vite.config.ts`) — jalur resmi Vercel untuk TanStack Start.
`bun run build` menghasilkan `.output/` (preset `node-server` lokal; Vercel otomatis memilih
preset `vercel` saat build di lingkungan Vercel). Tidak perlu `vercel.json` — framework
terdeteksi otomatis. Build command di Vercel: `bun run build`.
