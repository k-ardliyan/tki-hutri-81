/**
 * Selfcheck — form dekorasi (finalMode weighted) + combineFinal (bobot 70/30).
 * Assert-based, exit 1 on fail. Run: bun scripts/selfcheck-dekorasi.ts
 */
import { getFiveRForm, isDekorasiSubmission } from '../src/data/5r';
import { combineFinal, scoreSubmission } from '../src/lib/scoring';

let failed = 0;
const check = (name: string, cond: boolean, detail?: string) => {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

// ── Struktur form dekorasi ──
const dekor = getFiveRForm('dekorasi');
check('form dekorasi ada', !!dekor);
if (dekor) {
  check('5 kategori', dekor.categories.length === 5);
  check('20 kriteria total', dekor.categories.reduce((s, c) => s + c.criteria.length, 0) === 20);
  check('finalMode weighted', dekor.finalMode === 'weighted');
  const maxes = dekor.categories.map((c) => c.criteria.length * dekor.scale.max);
  check(
    'max kategori 20/25/25/15/15',
    JSON.stringify(maxes) === JSON.stringify([20, 25, 25, 15, 15]),
    JSON.stringify(maxes)
  );
  check(
    'order kriteria 1..20',
    dekor.categories.flatMap((c) => c.criteria.map((k) => k.order)).join(',') ===
      Array.from({ length: 20 }, (_, i) => i + 1).join(',')
  );
  check('scale 1-5', dekor.scale.min === 1 && dekor.scale.max === 5);

  // ── finalMode weighted: final = totalRaw/totalMax*100 ──
  const sub = (answers: Record<string, number>) => ({
    id: 't',
    roomId: 'sales',
    formId: 'dekorasi',
    auditor: 'A',
    answers,
    notes: {},
    submittedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const all5 = scoreSubmission(
    dekor,
    sub(Object.fromEntries(dekor.categories.flatMap((c) => c.criteria.map((k) => [k.id, 5]))))
  );
  check('semua 5 → final 100', all5.final === 100, `final=${all5.final}`);

  const all3 = scoreSubmission(
    dekor,
    sub(Object.fromEntries(dekor.categories.flatMap((c) => c.criteria.map((k) => [k.id, 3]))))
  );
  check('semua 3 → final 60', all3.final === 60, `final=${all3.final}`);

  // A=4×4(16), B=5×3(15), C=5×5(25), D=3×2(6), E=3×4(12) → raw 74/100 → final 74 (weighted)
  const mixed: Record<string, number> = {};
  for (const c of dekor.categories) {
    const val =
      c.id === 'tema'
        ? 4
        : c.id === 'kreativitas'
          ? 3
          : c.id === 'keindahan'
            ? 5
            : c.id === 'area'
              ? 2
              : 4;
    for (const k of c.criteria) mixed[k.id] = val;
  }
  const m = scoreSubmission(dekor, sub(mixed));
  check(
    'campuran → final 74 (weighted, bukan mean-percents 72)',
    m.final === 74 && m.totalRaw === 74,
    `final=${m.final} raw=${m.totalRaw}`
  );
}

// ── Form 5R lama (uniform) tidak berubah ──
const ns = getFiveRForm('office-non-smoking');
if (ns) {
  const sub = {
    id: 't',
    roomId: 'sales',
    formId: ns.id,
    auditor: 'A',
    answers: {} as Record<string, number>,
    notes: {},
    submittedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  for (const c of ns.categories) for (const k of c.criteria) sub.answers[k.id] = 4;
  const s = scoreSubmission(ns, sub);
  check('5R uniform: semua 4 → final 80', s.final === 80, `final=${s.final}`);
  check(
    '5R uniform: final === totalRaw/totalMax (max sama tiap kategori)',
    Math.abs(s.final - (s.totalRaw / s.totalMax) * 100) < 1e-9,
    `final=${s.final} raw=${s.totalRaw}/${s.totalMax}`
  );
}

// ── combineFinal (70/30) ──
check('combineFinal(80, 60) = 74', combineFinal(80, 60) === 74, `=${combineFinal(80, 60)}`);
check(
  'combineFinal(0, 100) = 30',
  Math.abs(combineFinal(0, 100) - 30) < 1e-9,
  `=${combineFinal(0, 100)}`
);
check('combineFinal(100, 0) = 70', combineFinal(100, 0) === 70, `=${combineFinal(100, 0)}`);
check('bobot default 0.7', combineFinal(50, 50) === 50);

// ── Filter 5R vs dekorasi (dipakai semua dashboard + halaman publik) ──
check('isDekorasiSubmission(dekorasi) true', isDekorasiSubmission('dekorasi') === true);
check(
  'isDekorasiSubmission(office-smoking) false',
  isDekorasiSubmission('office-smoking') === false
);
check('isDekorasiSubmission(produksi) false', isDekorasiSubmission('produksi') === false);

console.log(failed > 0 ? `✗ ${failed} check gagal` : '✓ Semua check lulus');
process.exit(failed > 0 ? 1 : 0);
