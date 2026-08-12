# Panduan Arsitektur & Aturan Komponen untuk AI Agent

Dokumen ini adalah aturan baku (*ground truth*) dalam mengelola kode, komponen UI, struktur folder, dan standar pengembangan pada proyek **TKI HUT RI 81**.

---

## 1. Package Manager & Script Runtime
- Proyek ini **WAJIB** menggunakan **`bun`** (bukan npm/yarn/pnpm).
- Jalankan perintah seperti:
  ```bash
  bun run build
  bun run dev
  bun run lint
  ```

---

## 2. Standar Struktur Komponen (`src/components/`)

Folder `src/components/` dibagi menjadi beberapa lapisan tanggung jawab (*separation of concerns*):

```
src/components/
├── ui/              ← [DESIGN SYSTEM & PRIMITIVES]
├── common/          ← [SHARED GENERIC APP HELPERS]
├── loading/         ← [SKELETONS & LOADING STATES]
├── layout/          ← [PAGE SHELLS, HEADERS, FOOTERS]
├── pages/           ← [PAGE-LEVEL LAZY COMPONENTS]
└── [feature]/       ← [DOMAIN-SPECIFIC FEATURES: 5r, snack, bagan, brand, hero]
```

### A. Aturan Folder `src/components/ui/` (Strict UI / Design System Layer)
1. **Hanya untuk shadcn/ui primitives & reusable atomic composites** yang sepenuhnya agnostik terhadap bisnis domain.
2. **Karakteristik Komponen di `src/components/ui/`**:
   - File wajib menggunakan penamaan **kebab-case** (contoh: `button.tsx`, `dialog.tsx`, `responsive-dialog.tsx`, `status-badge.tsx`).
   - Tidak boleh mengandung hardcoded business logic, domain data, atau endpoint API aplikasi.
   - Menggunakan utility `cn()` dari `~/lib/utils` dan `cva` (jika bervarian).
   - Mengikuti pola standard shadcn (`data-slot`, forwardRef, slot pattern).
3. **Dilarang meletakkan**:
   - Skeleton layout halaman spesifik (letakkan di `~/components/loading/`).
   - Komponen dengan domain mapping seperti icon ruangan, enum spesifik lomba/5R (letakkan di folder domain terkait seperti `~/components/5r/`).
   - Helper UI convenience berskala app-wide yang bukan atomic primitive (letakkan di `~/components/common/`).

### B. Aturan Folder `src/components/common/` (Shared App Helpers)
- Komponen utilitas tampilan yang dipakai lintas halaman tetapi bukan primitif design system:
  - `EmptyState.tsx`: Komponen wrapper state kosong.
  - `LazyImage.tsx`: Wrapper `<img>` berbasis `IntersectionObserver`.
  - `PageFallback.tsx`: Suspense fallback route default.
  - `SectionHeader.tsx`: Header seksi card/konten dashboard.

### C. Aturan Folder `src/components/loading/` (Loading Skeletons)
- Seluruh skeleton kompleks dan page-level skeleton **harus** ditaruh di folder ini:
  - `skeletons.tsx` (misal: `AdminDashboardSkeleton`, `AuditDashboardSkeleton`, `DataTableSkeleton`, `UnifiedLiveSkeleton`, dll.).

### D. Aturan Folder Fitur Domain (`5r/`, `snack/`, `bagan/`, dll.)
- Komponen yang mengandung logika domain spesifik, state penilaian, kalkulasi skor, atau mapping ikon:
  - `RoomIcon.tsx` & `ScoreBadge.tsx` → `src/components/5r/`
  - `BracketTree.tsx` → `src/components/bagan/`
  - `GelangPrint.tsx`, `BarcodeScanner.tsx` → `src/components/snack/`

---

## 3. Standar Import Path
- Selalu gunakan alias path **`~/`** untuk import internal:
  ```typescript
  // ✅ BENAR
  import { Button } from '~/components/ui/button';
  import { LazyImage } from '~/components/common/LazyImage';
  import { DataTableSkeleton } from '~/components/loading/skeletons';
  import RoomIcon from '~/components/5r/RoomIcon';

  // ❌ HINDARI relative path dalam/rapuh
  import { Button } from '../../../components/ui/button';
  ```

---

## 4. Checklist Saat Menambah Komponen Baru
1. *Apakah ini komponen primitif shadcn?* → Jalankan `bunx --bun shadcn add <component>` (akan otomatis ke `src/components/ui/`).
2. *Apakah ini skeleton halaman?* → Tambahkan ke `src/components/loading/skeletons.tsx`.
3. *Apakah ini helper generic non-domain?* → Letakkan di `src/components/common/`.
4. *Apakah ini berhubungan dengan fitur tertentu (5R, Snack, Bagan, Hero)?* → Letakkan di folder domain masing-masing di `src/components/<feature>/`.
