/**
 * selfcheck-snack-lifecycle.ts — assert-based check utk pure helpers snack lifecycle.
 * Jalan: bun scripts/selfcheck-snack-lifecycle.ts — exit 1 kalau ada assert gagal.
 * No framework, no DB — hanya logika murni.
 */
import {
  effectiveSessionStatus,
  effectiveStock,
  sessionOverlaps,
  validateStockAgainstRedemptions,
} from '../src/server/functions/snack';

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failures++;
    console.error(
      `FAIL ${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  } else {
    console.log(`ok   ${name}`);
  }
}

const now = new Date('2026-08-13T12:00:00.000Z');
const base = {
  status: 'published',
  startsAt: null,
  endsAt: null,
  pausedAt: null,
  closedAt: null,
  archivedAt: null,
};

// effectiveSessionStatus (PRD §8 urutan: draft → archived → closed → paused → scheduled → active)
check('draft status → draft', effectiveSessionStatus({ ...base, status: 'draft' }, now), 'draft');
check(
  'archived status → archived',
  effectiveSessionStatus({ ...base, status: 'archived' }, now),
  'archived'
);
check(
  'closed_at set → closed',
  effectiveSessionStatus({ ...base, closedAt: new Date('2026-08-13T11:00:00Z') }, now),
  'closed'
);
check(
  'paused_at set → paused',
  effectiveSessionStatus({ ...base, pausedAt: new Date('2026-08-13T11:00:00Z') }, now),
  'paused'
);
check(
  'belum mulai → scheduled',
  effectiveSessionStatus(
    {
      ...base,
      startsAt: new Date('2026-08-13T14:00:00Z'),
      endsAt: new Date('2026-08-13T16:00:00Z'),
    },
    now
  ),
  'scheduled'
);
check(
  'dalam jendela → active',
  effectiveSessionStatus(
    {
      ...base,
      startsAt: new Date('2026-08-13T11:00:00Z'),
      endsAt: new Date('2026-08-13T14:00:00Z'),
    },
    now
  ),
  'active'
);
check(
  'setelah ends_at → closed (auto)',
  effectiveSessionStatus(
    {
      ...base,
      startsAt: new Date('2026-08-13T09:00:00Z'),
      endsAt: new Date('2026-08-13T11:00:00Z'),
    },
    now
  ),
  'closed'
);
check('tanpa schedule published → active', effectiveSessionStatus({ ...base }, now), 'active');
check(
  'paused menang atas scheduled (paused di masa depan)',
  effectiveSessionStatus(
    {
      ...base,
      startsAt: new Date('2026-08-13T14:00:00Z'),
      endsAt: new Date('2026-08-13T16:00:00Z'),
      pausedAt: new Date('2026-08-13T10:00:00Z'),
    },
    now
  ),
  'paused'
);

// effectiveStock (PRD §24-25: stock_quota eksplisit; fallback quota>0; 0/null = tanpa batas)
check('stock_quota eksplisit', effectiveStock({ stockQuota: 130, quota: 0 }), 130);
check('stock_quota 0 (tanpa batas)', effectiveStock({ stockQuota: 0, quota: 100 }), 0);
check(
  'stock_quota null + quota>0 → fallback',
  effectiveStock({ stockQuota: null, quota: 100 }),
  100
);
check(
  'stock_quota null + quota 0 → unlimited',
  effectiveStock({ stockQuota: null, quota: 0 }),
  null
);

// sessionOverlaps (PRD §9 / AC-S08 + C1: sesi selesai waktunya tidak memblok)
const overlapNow = new Date('2026-08-13T12:00:00.000Z');
const pub = {
  status: 'published',
  closedAt: null,
  archivedAt: null,
} as const;
const cand = {
  startsAt: '2026-08-13T13:00:00.000Z',
  endsAt: '2026-08-13T15:00:00.000Z',
};
check(
  'overlap interval bertabrakan → true',
  sessionOverlaps(
    { ...pub, startsAt: '2026-08-13T14:00:00.000Z', endsAt: '2026-08-13T16:00:00.000Z' },
    cand,
    overlapNow
  ),
  true
);
check(
  'overlap interval tidak bertabrakan → false',
  sessionOverlaps(
    { ...pub, startsAt: '2026-08-13T16:00:00.000Z', endsAt: '2026-08-13T17:00:00.000Z' },
    cand,
    overlapNow
  ),
  false
);
check(
  'sesi sudah selesai waktunya (ends <= now) → tidak memblok',
  sessionOverlaps(
    { ...pub, startsAt: '2026-08-13T09:00:00.000Z', endsAt: '2026-08-13T10:00:00.000Z' },
    { startsAt: '2026-08-13T09:30:00.000Z', endsAt: '2026-08-13T11:00:00.000Z' },
    overlapNow
  ),
  false
);
check(
  'closed → tidak overlap',
  sessionOverlaps({ ...pub, closedAt: overlapNow, startsAt: null, endsAt: null }, cand, overlapNow),
  false
);
check(
  'draft → tidak overlap',
  sessionOverlaps(
    {
      ...pub,
      status: 'draft',
      startsAt: '2026-08-13T14:00:00.000Z',
      endsAt: '2026-08-13T16:00:00.000Z',
    },
    cand,
    overlapNow
  ),
  false
);
check(
  'tanpa jadwal (legacy) → tidak overlap',
  sessionOverlaps({ ...pub, startsAt: null, endsAt: null }, cand, overlapNow),
  false
);

// validateStockAgainstRedemptions (B2: stok tidak boleh < klaim aktif)
check('stok null → tanpa batas, tidak error', validateStockAgainstRedemptions(null, 97), null);
check('stok >= redeemed → ok', validateStockAgainstRedemptions(130, 97), null);
check(
  'stok < redeemed → error',
  validateStockAgainstRedemptions(50, 97),
  'Stok 50 kurang dari 97 yang sudah diambil. Minimal 97.'
);

console.log(failures === 0 ? '\nPASS: snack lifecycle checks' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
