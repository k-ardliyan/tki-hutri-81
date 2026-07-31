# HUT RI 81 PT TKI — React (JavaScript) + Tailwind + GSAP Implementation Plan

> **For Hermes:** Plan-only. Implement task-by-task after approval. Prefer plain JSX (no TypeScript).

**Goal:**  
Rebuild `hut_ri_81_pt_tki.html` as a **React (JavaScript/JSX)** SPA: mobile-first, modern visual polish, same feature set, with **Tailwind CSS v4** + **GSAP** for powerful animation styling — ready for future brand/event assets.

**Architecture:**  
- Keep Vite + React 19 scaffold already in repo (`package.json` uses bun; files are `.jsx`).  
- **No TypeScript** — all source stays `.js` / `.jsx` for faster animation iteration and less friction.  
- **Feature parity first**, then visual upgrade (depth, motion, glass, micro-interactions).  
- Tab shell at `App.jsx`; each tab is a section component. Shared data in `src/data/`.  
- **GSAP** as primary animation engine (timeline, scroll, stagger, number ticks). Framer Motion only if a tiny declarative hover is simpler — default = **GSAP only** to avoid dual animation systems.  
- Assets live under `src/assets/` (bundled) and `public/` (static); placeholders until real assets arrive.

**Tech Stack:**  
- React 19 + Vite 8 (existing)  
- Tailwind CSS v4 (`@tailwindcss/vite`)  
- GSAP (+ `ScrollTrigger` plugin)  
- Icons: Lucide React *or* keep Font Awesome classes via CDN/link (parity with HTML) — decide in Task 1  
- Fonts: Inter + Outfit (Google Fonts, same as HTML)  
- Package manager: **bun** (lockfile is `bun.lock`)

---

## Current context / assumptions

### Repo now
| Item | Status |
|------|--------|
| Vite + React JSX scaffold | Yes (`src/App.jsx`, `main.jsx`) |
| Tailwind | **Not installed** (HTML used CDN) |
| GSAP / Framer | **Not installed** |
| Feature app | Only Vite starter UI |
| Reference | `hut_ri_81_pt_tki.html` (~full single-file app) |

### Reference app feature map (must preserve)
1. **Sticky header** + desktop top nav + date badge  
2. **Hero** (pattern bg, badge, copy, meta chips) + **countdown** → 13 Agu 2026 12:45 WIB  
3. **7 tabs:** beranda · kelompok · panduan · galeri · klasemen · rundown · checklist  
4. **Mobile bottom dock** (6 items; galeri reachable via desktop/beranda deep-link — note gap below)  
5. **Beranda:** 4 stat cards + 3 cabang lomba  
6. **Kelompok:** search, filter all/putra/putri, 13 groups (8 putra / 5 putri), highlight match, ketua badge  
7. **Panduan:** role toggle peserta/panitia; 3 SVG flow diagrams + 5R bobot; panitia duties  
8. **Galeri:** 3 safety/inspiration cards (asset slots later)  
9. **Klasemen:** putra/putri toggle, podium top-3, score table (5R/Balon/Air/Total — scores still placeholder `0`/`-`)  
10. **Rundown:** 3 phases timeline  
11. **Checklist 5R:** 8 items, % gauge, readiness label, reset  

### Brand tokens (from HTML)
```
brand.red       #D32F2F
brand.darkRed   #8B0000
brand.lightRed  #FF5252
brand.accentRed #FF1744
brand.gold      #FFC107
brand.amber     #FF9800
brand.dark      #0F172A
surface bg      #F1F5F9
```

### Explicit product decisions (this revision)
| Decision | Choice | Why |
|----------|--------|-----|
| Language | **JavaScript only** (`.jsx` / `.js`) | Faster styling/animation iteration; no TS tax |
| Animation lib | **GSAP primary** | Timeline, ScrollTrigger, scrub, complex SVG/hero motion |
| Framer Motion | **Optional / not default** | Avoid two systems; add later only if needed |
| Styling | **Tailwind v4 via Vite plugin** | Proper build (no CDN), design tokens in `@theme` |
| Routing | **In-app tab state** (no react-router v1) | Matches HTML SPA tabs; URL hash optional later |
| Data | Static modules in `src/data/` | Scores can become editable later without rewrite |
| Icons | Prefer **Font Awesome link** for 1:1 parity first; Lucide optional cleanup | Less redesign churn on day 1 |

### Open questions (non-blocking defaults)
1. **Mobile nav missing “Galeri”** — keep HTML behavior (6 dock items) + desktop-only Galeri, *or* overflow “More”. **Default: keep HTML parity.**  
2. **Score source** — stay placeholder until panitia API. **Default: static 0.**  
3. **Real assets** — folder skeleton now; wire when files drop.  
4. **Deploy base path** — assume `/` unless Laragon subpath needed.

---

## Target folder structure (JS only)

```text
src/
  main.jsx
  App.jsx                 # shell: header + hero + active tab + bottom nav
  index.css               # Tailwind + @theme brand tokens + utilities
  data/
    kelompok.js
    checklist.js
    rundown.js            # optional extract
    scores.js             # placeholder leaderboard scores
  hooks/
    useCountdown.js
    useTab.js             # optional
  lib/
    gsap.js               # register plugins once
    highlight.js          # highlightMatch helper
  components/
    layout/
      Header.jsx
      BottomNav.jsx
    hero/
      Hero.jsx
      Countdown.jsx
    beranda/
      BerandaTab.jsx
      StatCards.jsx
      LombaOverview.jsx
    kelompok/
      KelompokTab.jsx
      GroupCard.jsx
      GroupFilters.jsx
    panduan/
      PanduanTab.jsx
      FlowLomba1.jsx      # SVG as component
      FlowLomba2.jsx
      FlowLomba3.jsx
      GuidePanitia.jsx
    galeri/
      GaleriTab.jsx
    klasemen/
      KlasemenTab.jsx
      Podium.jsx
      ScoreTable.jsx
    rundown/
      RundownTab.jsx
      TimelinePhase.jsx
    checklist/
      ChecklistTab.jsx
  assets/
    brand/                # logo, flag, hero art (future)
    galeri/               # inspiration photos (future)
    lomba/                # optional illustrations
public/
  favicon.svg             # rebrand later
  icons.svg               # keep or drop
```

Remove / stop using starter chrome: default Vite hero UI, purple theme CSS constraints on `#root`.

---

## Design direction (modern upgrade, still familiar)

Keep information architecture of the HTML; upgrade surface:

- **Mobile-first** spacing, thumb dock, large tap targets  
- **Layered hero:** soft gradient + subtle grain/dot pattern + optional floating red-white accents (GSAP float)  
- **Cards:** softer radius (`rounded-2xl`), thin border, light shadow, hover lift via GSAP or CSS  
- **Glass** countdown card (backdrop-blur)  
- **Typography:** Outfit headings, Inter body  
- **Motion principles:**  
  - Enter: short stagger (cards 40–60ms)  
  - Tab change: content fade/slide 200–300ms (GSAP)  
  - Countdown digit flip or scale tick on change  
  - ScrollTrigger for rundown timeline nodes  
  - Respect `prefers-reduced-motion` → skip/kill tweens  
- **Asset slots:** empty framed placeholders with dashed border + label until real images arrive  

---

## Step-by-step plan

### Task 1: Install Tailwind + GSAP (JS toolchain)

**Objective:** Wire production CSS and animation deps without TypeScript packages.

**Files:**
- Modify: `package.json` (via bun add)
- Create/Modify: `vite.config.js`
- Rewrite: `src/index.css`
- Modify: `index.html` (title, lang, fonts, viewport, FA optional)

**Steps:**
1. Install:
   ```bash
   bun add gsap
   bun add -d tailwindcss @tailwindcss/vite
   ```
2. `vite.config.js` — add Tailwind plugin:
   ```js
   import { defineConfig } from 'vite'
   import react, { reactCompilerPreset } from '@vitejs/plugin-react'
   import babel from '@rolldown/plugin-babel'
   import tailwindcss from '@tailwindcss/vite'

   export default defineConfig({
     plugins: [
       react(),
       babel({ presets: [reactCompilerPreset()] }),
       tailwindcss(),
     ],
   })
   ```
3. `src/index.css`:
   ```css
   @import "tailwindcss";

   @theme {
     --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
     --font-heading: "Outfit", ui-sans-serif, system-ui, sans-serif;
     --color-brand-red: #D32F2F;
     --color-brand-dark-red: #8B0000;
     --color-brand-light-red: #FF5252;
     --color-brand-accent-red: #FF1744;
     --color-brand-gold: #FFC107;
     --color-brand-amber: #FF9800;
     --color-brand-dark: #0F172A;
   }

   @layer base {
     html { -webkit-tap-highlight-color: transparent; }
     body {
       @apply bg-slate-100 text-slate-800 antialiased font-sans;
     }
   }

   @utility font-heading {
     font-family: var(--font-heading);
   }
   /* hero-pattern, glass-card, no-scrollbar, nav active — port from HTML */
   ```
4. `index.html`: `lang="id"`, title `HUT RI Ke-81 - PT Teknologi Kartu Indonesia`, Google Fonts Inter+Outfit, Font Awesome 6 CDN (if keeping FA).
5. Verify: `bun run dev` shows unstyled-then-styled root; no TS packages added.

**Do not install:** `typescript`, `@types/gsap` (unless IDE complains — optional only), `framer-motion` in this phase.

---

### Task 2: Extract static data modules

**Objective:** Pure JS data, zero DOM.

**Files:**
- Create: `src/data/kelompok.js` — copy `dataKelompok` array from HTML script  
- Create: `src/data/checklist.js` — copy `checklistItems`  
- Create: `src/data/scores.js` — shape `{ [groupId]: { r5, balon, air } }` all zeros for now  
- Create: `src/lib/highlight.js` — `highlightMatch(text, term)` returns string with mark tags **or** React nodes helper used by GroupCard  

**Verify:** import from a temporary log in App; `bun run lint`.

---

### Task 3: GSAP bootstrap + reduced motion

**Files:**
- Create: `src/lib/gsap.js`
  ```js
  import gsap from 'gsap'
  import { ScrollTrigger } from 'gsap/ScrollTrigger'
  gsap.registerPlugin(ScrollTrigger)
  export { gsap, ScrollTrigger }
  export function shouldReduceMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }
  ```
- Create: `src/hooks/useCountdown.js` — target `new Date('2026-08-13T12:45:00')` (local); return `{ days, hours, mins, secs, done }`; cleanup interval.

---

### Task 4: App shell — layout chrome

**Objective:** Sticky header, bottom nav, tab state, padding for dock.

**Files:**
- Rewrite: `src/App.jsx`
- Create: `src/components/layout/Header.jsx`
- Create: `src/components/layout/BottomNav.jsx`
- Soften/remove: `src/App.css` (delete if unused)  
- Fix: `#root` full-width (remove Vite starter `width: 1126px` center constraint from `index.css`)

**Behavior:**
- `const [tab, setTab] = useState('beranda')`
- Header desktop buttons + BottomNav call `setTab`
- Active styles: brand red (port `.bottom-nav-item.active`, desk active pill)
- Main `pb-24 lg:pb-8`
- Optional: GSAP on tab change — fade out/in `#tab-panel` (kill previous tween)

**Placeholder tabs:** empty section with title until Task 5–11 fill them.

---

### Task 5: Hero + Countdown

**Files:**
- Create: `src/components/hero/Hero.jsx`
- Create: `src/components/hero/Countdown.jsx`

**Parity + modern:**
- `hero-pattern` background  
- Badge, H2, 5R underline, location/team chips  
- Glass countdown 4 cells  
- GSAP: badge fade-up, title stagger words or lines, countdown card scale-in; optional continuous float on “81” badge in header  

**Verify:** digits tick every second; hits zero after target.

---

### Task 6: Beranda tab

**Files:**
- `src/components/beranda/BerandaTab.jsx`
- `StatCards.jsx`, `LombaOverview.jsx`

**Content:** 4 stats (13 Tim, 3 Cabang, 3–6 Ags, 28 Ags) + 3 lomba cards + “Lihat Flow” → `setTab('panduan')`  
**Motion:** stagger cards on mount / when tab becomes active (`useEffect` deps `[active]`).

---

### Task 7: Kelompok tab

**Files:**
- `KelompokTab.jsx`, `GroupFilters.jsx`, `GroupCard.jsx`

**State:** `filter` (`all|putra|putri`), `query`  
**Logic:** same filter + search as HTML (`nama` or any `anggota`)  
**UI:** pills, search input, responsive grid, empty state  
**Highlight:** safe render — prefer split + `<mark>` elements over `dangerouslySetInnerHTML` if easy  

---

### Task 8: Panduan tab + SVG flows

**Files:**
- `PanduanTab.jsx`, `GuidePanitia.jsx`
- `FlowLomba1.jsx`, `FlowLomba2.jsx`, `FlowLomba3.jsx` — port SVG markup as JSX (`class` → `className`, `stroke-width` → `strokeWidth`, etc.)

**State:** `role` `peserta|panitia`  
**Motion (GSAP):** when role/peserta section mounts, optional draw-ish opacity stagger on flow step groups (`g` nodes with refs or classes). Keep subtle — diagrams must stay readable.

---

### Task 9: Galeri + Rundown + Checklist

**GaleriTab:** 3 rule cards; each card has **image slot** `aspect-video` placeholder (`src/assets/galeri/...` optional later).  
**RundownTab:** 3 phases from HTML; TimelinePhase component; ScrollTrigger pin/stagger optional.  
**ChecklistTab:** controlled checkboxes from `checklist.js`; percent + labels (Belum / Cukup / Sangat Siap); reset; optional GSAP on gauge number.

---

### Task 10: Klasemen tab

**Files:** `KlasemenTab.jsx`, `Podium.jsx`, `ScoreTable.jsx`  
**Logic:** filter putra/putri from `kelompok.js`; sort by total from `scores.js` (all 0 → stable order by `nomor`); podium order 2–1–3 visual like HTML.  
**Motion:** podium bars grow height on tab enter.

---

### Task 11: Polish, assets readiness, verification

1. Wire any remaining cross-links (Beranda → Panduan, etc.)  
2. Add `src/assets/brand/.gitkeep`, `galeri/.gitkeep` + short `README` note in plan only (no noise docs unless asked)  
3. Favicon/title brand  
4. Commands:
   ```bash
   bun run lint
   bun run build
   bun run dev
   ```
5. Manual QA checklist:
   - [ ] Mobile 375px: dock usable, no horizontal bleed  
   - [ ] All 7 tabs switch (desktop includes Galeri)  
   - [ ] Search “Arif” finds Kelompok 1 Putra  
   - [ ] Filter putri shows 5 cards  
   - [ ] Checklist 8/8 → 100% Sangat Siap; Reset works  
   - [ ] Countdown live  
   - [ ] `prefers-reduced-motion`: no runaway loops  
   - [ ] Build succeeds  

---

## Dependency install commands (exact)

```bash
# from C:\laragon\www\tki-hut-ri81
bun add gsap
bun add -d tailwindcss @tailwindcss/vite
# DO NOT: bun add typescript / framer-motion (unless later requested)
```

Optional later (not Task 1):
```bash
bun add lucide-react   # only if replacing FA
```

---

## Files likely to change (summary)

| Action | Path |
|--------|------|
| Modify | `package.json`, `bun.lock`, `vite.config.js`, `index.html` |
| Rewrite | `src/main.jsx` (minor), `src/App.jsx`, `src/index.css` |
| Delete/unused | `src/App.css` (after migrate), starter assets usage |
| Create | entire `src/components/**`, `src/data/**`, `src/hooks/**`, `src/lib/**` |
| Keep reference | `hut_ri_81_pt_tki.html` (source of truth until feature-complete) |

---

## Animation recipe (GSAP-first, powerful styling)

| Surface | Technique |
|---------|-----------|
| First paint hero | `gsap.from('.hero-el', { y: 24, opacity: 0, stagger: 0.08, duration: 0.6, ease: 'power3.out' })` |
| Tab panel swap | timeline: out `opacity 0 y:8` → swap React state → in |
| Stat / group cards | stagger from `y:16` when tab active |
| Countdown digit change | quick `scale: 1.12` → 1 on value change (effect on digit text) |
| Podium | `height` from 0 with elastic/power2 |
| Rundown | ScrollTrigger on phase cards |
| Header 81 badge | infinite yoyo float **only if** `!shouldReduceMotion()` |
| Hover cards | CSS `transition` OK; GSAP `quickTo` for premium feel on desktop |

Centralize kill/cleanup in `useEffect` return (`ctx.revert()` with `gsap.context`).

---

## Risks & tradeoffs

| Risk | Mitigation |
|------|------------|
| Dual animation libs | **GSAP only** in v1 |
| Huge SVG in JSX | Separate files; memo; don’t animate every path at once |
| Tailwind v4 token naming | Map `bg-brand-red` via `@theme --color-brand-red` |
| React Compiler + GSAP DOM | Animate via classes/refs inside `gsap.context`; avoid fighting compiler on animated nodes |
| FA CDN vs offline | Accept CDN for speed; swap Lucide later |
| Scope creep (admin scores) | Scores module only; no backend |
| Mobile Galeri hidden | Documented parity; easy 7th dock later |

---

## Out of scope (v1)

- Backend / live scoring API  
- Auth  
- PWA offline full cache (optional later)  
- TypeScript migration  
- Pixel-perfect clone of every shadow if modern redesign improves UX  
- Framer Motion (unless you later request hybrid)

---

## Implementation order (bite-sized)

1. Tailwind + GSAP install + theme CSS + index.html fonts  
2. Data modules + highlight + useCountdown + gsap lib  
3. App shell Header + BottomNav + tab state  
4. Hero + Countdown (+ first GSAP entrance)  
5. Beranda  
6. Kelompok  
7. Panduan + 3 SVG  
8. Galeri + Rundown + Checklist  
9. Klasemen + podium motion  
10. Polish, reduced-motion, lint, build, manual QA  

---

## Success criteria

- App runs on `bun run dev` with **JSX only**  
- Feature parity with reference HTML for all listed tabs/tools  
- Visual language **more modern** (motion, hierarchy, glass, spacing) without losing PT TKI / HUT RI identity  
- Clear folders for **future assets**  
- `bun run build` + `bun run lint` clean  

---

## Handoff

Setelah plan disetujui, eksekusi mulai **Task 1** (install Tailwind + GSAP, theme, bersihkan starter CSS). Tidak menambah TypeScript.
