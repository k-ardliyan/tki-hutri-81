/**
 * Postinstall patch — port upstream TanStack/router PR #8036 (belum merged).
 *
 * Masalah: `<Scripts />` me-render `<script src>` dari start manifest (client
 * entry) ke body tree SSR tanpa `preventScriptHoist` dihormati saat hydration.
 * React 19 memperlakukan `<script async src>` sebagai hoistable resource →
 * memindahkannya ke <head> saat hydrate → node server di body tidak pernah
 * di-claim → hydration mismatch (dev warning / prod React error #418) di SEMUA
 * halaman.
 *
 * Fix: di branch client `!hydrated`, kalau `preventScriptHoist` → tambah
 * `onLoad` handler supaya react-dom TIDAK menganggapnya hoistable.
 * Referensi: https://github.com/TanStack/router/pull/8036
 * (issue: https://github.com/TanStack/router/issues/7775)
 *
 * Dijalankan otomatis via `postinstall` di package.json. Idempotent: kalau
 * patch sudah ada / kode sumber berubah, script skip dengan warning (tidak
 * pernah crash build).
 */
import { readFileSync, writeFileSync } from 'node:fs';

const OLD = `	if (!hydrated) {
		if (attrs?.src) return /* @__PURE__ */ jsx("script", {
			...attrs,
			suppressHydrationWarning: true
		});`;

const NEW = `	if (!hydrated) {
		if (attrs?.src) {
			if (!preventScriptHoist) return /* @__PURE__ */ jsx("script", {
				...attrs,
				suppressHydrationWarning: true
			});
			// preventScriptHoist + onLoad => react-dom tidak anggap hoistable
			// resource => claim node server, hindari hydration mismatch #418.
			return /* @__PURE__ */ jsx("script", {
				...attrs,
				onLoad: noopScriptHandler,
				suppressHydrationWarning: true
			});
		}`;

const OLD_CJS = `	if (!hydrated) {
		if (attrs?.src) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("script", {
			...attrs,
			suppressHydrationWarning: true
		});`;

const NEW_CJS = `	if (!hydrated) {
		if (attrs?.src) {
			if (!preventScriptHoist) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("script", {
				...attrs,
				suppressHydrationWarning: true
			});
			// preventScriptHoist + onLoad => react-dom tidak anggap hoistable
			// resource => claim node server, hindari hydration mismatch #418.
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("script", {
				...attrs,
				onLoad: noopScriptHandler,
				suppressHydrationWarning: true
			});
		}`;

const targets = [
  {
    file: 'node_modules/@tanstack/react-router/dist/esm/Asset.js',
    old: OLD,
    next: NEW,
  },
  {
    file: 'node_modules/@tanstack/react-router/dist/cjs/Asset.cjs',
    old: OLD_CJS,
    next: NEW_CJS,
  },
];

let applied = 0;
let already = 0;
for (const { file, old, next } of targets) {
  let src;
  try {
    src = readFileSync(file, 'utf8');
  } catch {
    console.warn(`[patch] skip (file tidak ada): ${file}`);
    continue;
  }
  if (src.includes(next)) {
    already++;
    console.log(`[patch] sudah ter-patch: ${file}`);
    continue;
  }
  if (!src.includes(old)) {
    console.warn(`[patch] SKIP — kode berubah, cek manual: ${file}`);
    continue;
  }
  writeFileSync(file, src.replace(old, next));
  applied++;
  console.log(`[patch] OK: ${file}`);
}

if (applied > 0) {
  console.log(`[patch] ${applied} file ter-patch (TanStack PR #8036).`);
} else if (already === targets.length) {
  console.log('[patch] Semua target sudah ter-patch (TanStack PR #8036).');
} else {
  console.warn('[patch] Tidak ada file yang di-patch — pastikan patch masih relevan (PR #8036).');
}
