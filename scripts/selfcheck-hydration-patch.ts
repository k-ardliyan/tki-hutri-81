/**
 * Selfcheck — verifikasi postinstall patch TanStack PR #8036 masih terpasang.
 *
 * Hydration React #418 balik DIAM-DIAM kalau node_modules tidak ter-patch:
 * - `bun install --ignore-scripts` (postinstall skip)
 * - upgrade @tanstack/react-router (string patch tidak match → script skip)
 *
 * Marker = komentar patch (hanya ada di dist setelah apply). String harus
 * sinkron dengan scripts/apply-react-router-patch.mjs.
 * Run: bun scripts/selfcheck-hydration-patch.ts
 */
import { readFileSync } from 'node:fs';

const MARKER = '// preventScriptHoist + onLoad => react-dom tidak anggap hoistable';
const FILES = [
  'node_modules/@tanstack/react-router/dist/esm/Asset.js',
  'node_modules/@tanstack/react-router/dist/cjs/Asset.cjs',
];

let failed = 0;
for (const file of FILES) {
  let src: string;
  try {
    src = readFileSync(file, 'utf8');
  } catch {
    console.error(`  ✗ ${file} — file tidak ada (jalankan bun install dulu)`);
    failed++;
    continue;
  }
  if (src.includes(MARKER)) {
    console.log(`  ✓ ${file} ter-patch`);
  } else {
    console.error(
      `  ✗ ${file} TIDAK ter-patch — jalankan "bun run postinstall" atau cek "bun install --ignore-scripts" (PR #8036, TanStack/router #7775)`
    );
    failed++;
  }
}

console.log(
  failed > 0 ? `✗ ${failed} check gagal — hydration #418 akan muncul` : '✓ Semua check lulus'
);
process.exit(failed > 0 ? 1 : 0);
