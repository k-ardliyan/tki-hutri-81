# HUT RI 81 PT TKI - React Conversion Implementation Plan

**Goal:**  
Migrasikan seluruh tampilan, interaksi, dan fungsionalitas dari `hut_ri_81_pt_tki.html` (Tailwind + vanilla JS + SVG diagrams + countdown + tab system + checklist) menjadi aplikasi React yang mobile-first, modern, dan siap pakai asset di masa depan.

**Architecture & Approach**  
- **Mobile-first + Tailwind**: Semua breakpoint pakai `sm:`, `md:`, `lg:` seperti HTML asli.  
- **Component-driven**: Gunakan React 19 + TypeScript (karena sudah ada @types/react).  
- **State management**: `useState` + `useEffect` untuk tab, countdown, checklist, search, leaderboards.  
- **Performance**: Gunakan `React.memo` untuk card/grid besar, lazy loading untuk SVG (jika terlalu berat).  
- **Modern touch**: Tambah GSAP/Framer Motion nanti (via npm install) untuk animasi lebih smooth.  
- **Asset future-proof**: Semua gambar, icon, logo akan dimasukkan ke `src/assets/` (hero.png sudah ada).

**Tech Stack yang akan ditambahkan**  
```bash
npm install framer-motion @types/gsap gsap
# atau pakai Framer Motion saja
```

**Files yang akan berubah / dibuat**

### 1. Setup Dependencies & Config
- Install `framer-motion` dan `gsap` (lebih fleksibel untuk animasi scroll & hover).
- Update `vite.config.js` (opsional, tetap default).
- Copy semua asset dari `public/` dan `src/assets/` ke folder baru `src/assets/` (hero.png, icons.svg, favicon.svg).

### 2. Main Structure
- Create `src/components/` folder.
- Split HTML menjadi komponen:
  - `Header.tsx`
  - `Hero.tsx`
  - `Tabs.tsx` (container tab beranda/kelompok/panduan dll)
  - `Countdown.tsx`
  - `GroupCard.tsx` (untuk kelompok peserta)
  - `ChecklistCard.tsx`
  - `FlowchartSVG.tsx` (untuk 3 lomba)
  - `LeaderboardPodium.tsx`

### 3. Core Components (Urutan Pembuatan)
1. `Header.tsx` — copy header HTML + sticky behavior + bottom nav mobile
2. `Hero.tsx` — hero banner + countdown (gunakan `useEffect` + `setInterval` atau `framer-motion` animate)
3. `Tabs.tsx` — tab system (beranda/kelompok/panduan/galeri/klasemen/rundown/checklist) dengan `useState`
4. `GroupList.tsx` — search + filter + grid kelompok (pakai dataKelompok dari script)
5. `PanduanTabs.tsx` — role toggle (peserta/panitia) + 3 flowchart SVG
6. `Checklist.tsx` — 8 item checklist + gauge + reset button
7. `Klasemen.tsx` — tab Putra/Putri + podium + leaderboard table (render dinamis)

### 4. Animasi (GSAP / Framer Motion)
- Countdown: `framer-motion` animate `motion.div` dengan `initial={{opacity:0}}`
- Scroll reveal pada card (pakai `useInView` dari framer-motion)
- Float animation pada logo 81 (seperti di HTML)
- Hover lift + scale pada semua card

### 5. Data & Logic
- pindahkan `dataKelompok` ke `src/data/kelompok.ts`
- `checklistItems` ke `src/data/checklist.ts`
- Buat helper `highlightMatch` sebagai hook custom

### 6. Verification & Test
- Jalankan `bun run dev` dan buka di browser
- Test semua tab, search, checklist, countdown, switch tab
- Lint dengan `bun run lint`
- Bandingkan screenshot dengan HTML asli (gunakan browser devtool atau tool seperti Percy nanti)

**Risk & Trade-off**
- SVG 3 flowchart besar — akan lazy load
- JS vanilla event handler (`onclick`) akan diubah ke `onClick` React
- Tailwind CDN di HTML akan diganti dengan import `tailwind.config` di Vite (sudah ada di HTML)

Plan ini sudah siap dieksekusi step-by-step. Mau langsung mulai implementasi atau revisi dulu?