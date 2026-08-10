/**
 * selfcheck-scoring.ts — verifikasi modul scoring (tanpa framework).
 * Jalankan: bun run scripts/selfcheck-scoring.ts
 *
 * Kasus yang diuji:
 *  1. Semua skor 5 → final 100 (5 kategori, tiap 100%)
 *  2. Semua skor 1 → final 20 (5 kategori, tiap 20%)
 *  3. Semua skor 3 → final 60
 *  4. Campuran (bentuk form mini) → angka manual
 *  5. Skor invalid (6/0) → throw
 *  6. aggregateRoom rata-rata 2 submission
 */
import { strict as assert } from 'node:assert'
import type { FiveRForm, FiveRSubmission } from '../src/data/5r'
import { scoreSubmission, aggregateRoom, round1 } from '../src/lib/scoring'

const form: FiveRForm = {
  id: 'produksi',
  label: 'Produksi',
  source: 'x',
  scale: { min: 1, max: 5 },
  categories: [
    {
      id: 'a',
      label: 'A',
      sortOrder: 1,
      criteria: [
        { id: 'a1', order: 1, text: 'k1', options: [] },
        { id: 'a2', order: 2, text: 'k2', options: [] },
      ],
    },
    {
      id: 'b',
      label: 'B',
      sortOrder: 2,
      criteria: [{ id: 'b1', order: 1, text: 'k3', options: [] }],
    },
  ],
}

function sub(answers: Record<string, number>): FiveRSubmission {
  return {
    id: 's1',
    roomId: 'r1',
    formId: 'produksi',
    auditor: 'test',
    answers,
    notes: {},
    submittedAt: '2026-01-01',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  }
}

// 1. Semua 5
let s = scoreSubmission(form, sub({ a1: 5, a2: 5, b1: 5 }))
assert.ok(Math.abs(s.final - 100) < 1e-9, `final harus 100, dapat ${s.final}`)
assert.equal(s.totalRaw, 15)
assert.equal(s.totalMax, 15)

// 2. Semua 1 → persen per kategori = 20%
s = scoreSubmission(form, sub({ a1: 1, a2: 1, b1: 1 }))
assert.ok(Math.abs(s.final - 20) < 1e-9, `final harus 20, dapat ${s.final}`)
assert.equal(s.totalRaw, 3)

// 3. Semua 3 → 60%
s = scoreSubmission(form, sub({ a1: 3, a2: 3, b1: 3 }))
assert.ok(Math.abs(s.final - 60) < 1e-9, `final harus 60, dapat ${s.final}`)

// 4. Campuran: A=(4,2) → 6/10=60%; B=(5) → 100%; final = 80%
s = scoreSubmission(form, sub({ a1: 4, a2: 2, b1: 5 }))
assert.ok(Math.abs(s.final - 80) < 1e-9, `final harus 80, dapat ${s.final}`)
assert.equal(s.categories[0].percent, 60)
assert.equal(s.categories[1].percent, 100)

// 5. Invalid skor → throw
assert.throws(() => scoreSubmission(form, sub({ a1: 6, a2: 1, b1: 1 })))
assert.throws(() => scoreSubmission(form, sub({ a1: 0, a2: 1, b1: 1 })))

// 6. aggregateRoom: dua submission 80 & 60 → 70
s = scoreSubmission(form, sub({ a1: 4, a2: 2, b1: 5 })) // 80
const s2 = scoreSubmission(form, sub({ a1: 3, a2: 3, b1: 3 })) // 60
assert.equal(aggregateRoom([s, s2]), 70)

// round1
assert.equal(round1(66.666666), 66.7)

console.log('✅ selfcheck-scoring: SEMUA PASS (6 kasus)')
