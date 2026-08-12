/**
 * Selfcheck — heat elimination pure logic.
 * Jalankan: bun scripts/selfcheck-heat.ts (exit 1 kalau ada assert gagal).
 */
import {
  assignToSessions,
  autoGenerateStages,
  calculateHeatPodium,
  distributeSessions,
  qualify,
  resolveRanks,
  serpentineOrder,
  validateHeatConfig,
} from '../src/lib/tournament/heat-elimination';

let failures = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    console.log(`PASS ${name}`);
  } else {
    failures += 1;
    console.error(`FAIL ${name}`, detail ?? '');
  }
}
function eq<T>(name: string, actual: T, expected: T) {
  check(name, JSON.stringify(actual) === JSON.stringify(expected), { actual, expected });
}

// ─── distributeSessions ───
eq('dist-10/4', distributeSessions(10, 4), [4, 3, 3]);
eq('dist-11/4', distributeSessions(11, 4), [4, 4, 3]);
eq('dist-9/4', distributeSessions(9, 4), [3, 3, 3]);
eq('dist-16/4', distributeSessions(16, 4), [4, 4, 4, 4]);
eq('dist-5/4', distributeSessions(5, 4), [3, 2]);
eq('dist-2/4', distributeSessions(2, 4), [2]);
eq('dist-1/4', distributeSessions(1, 4), [1]);
check(
  'dist-8/3 balanced',
  distributeSessions(8, 3).every((x) => x >= 2),
  distributeSessions(8, 3)
);

// ─── autoGenerateStages ───
{
  const a = autoGenerateStages({
    participantCount: 16,
    teamsPerSession: 4,
    qualifiersPerSession: 2,
    finalSize: 4,
  });
  eq(
    'auto16-names',
    a.map((s) => s.name),
    ['Penyisihan', 'Semifinal', 'Final']
  );
  eq(
    'auto16-sizes',
    a.map((s) => s.sessionSizes),
    [[4, 4, 4, 4], [4, 4], [4]]
  );
  eq(
    'auto16-final',
    a.map((s) => s.isFinal),
    [false, false, true]
  );
  check('auto16-final-size', a[2].sessionSizes[0] === 4, a[2].sessionSizes);
}
{
  const a = autoGenerateStages({
    participantCount: 10,
    teamsPerSession: 4,
    qualifiersPerSession: 2,
    finalSize: 4,
  });
  eq(
    'auto10-names',
    a.map((s) => s.name),
    ['Penyisihan', 'Semifinal', 'Final']
  );
  eq(
    'auto10-sizes',
    a.map((s) => s.sessionSizes),
    [[4, 3, 3], [3, 3], [4]]
  );
}
{
  const a = autoGenerateStages({
    participantCount: 9,
    teamsPerSession: 4,
    qualifiersPerSession: 2,
    finalSize: 4,
  });
  eq(
    'auto9-sizes',
    a.map((s) => s.sessionSizes),
    [[3, 3, 3], [3, 3], [4]]
  );
}
{
  const a = autoGenerateStages({
    participantCount: 8,
    teamsPerSession: 4,
    qualifiersPerSession: 2,
    finalSize: 4,
  });
  eq(
    'auto8-sizes',
    a.map((s) => s.sessionSizes),
    [[4, 4], [4]]
  );
}
{
  const a = autoGenerateStages({
    participantCount: 4,
    teamsPerSession: 4,
    qualifiersPerSession: 2,
    finalSize: 4,
  });
  eq(
    'auto4-sizes',
    a.map((s) => s.sessionSizes),
    [[4]]
  );
  eq('auto4-final', a[0].isFinal, true);
}

// ─── validateHeatConfig ───
eq(
  'val-ok',
  validateHeatConfig({
    participantCount: 16,
    teamsPerSession: 4,
    qualifiersPerSession: 2,
    finalSize: 4,
  }).ok,
  true
);
check(
  'val-teams<2',
  !validateHeatConfig({
    participantCount: 16,
    teamsPerSession: 1,
    qualifiersPerSession: 2,
    finalSize: 4,
  }).ok
);
check(
  'val-qual>=teams',
  !validateHeatConfig({
    participantCount: 16,
    teamsPerSession: 4,
    qualifiersPerSession: 4,
    finalSize: 4,
  }).ok
);
check(
  'val-final<2',
  !validateHeatConfig({
    participantCount: 16,
    teamsPerSession: 4,
    qualifiersPerSession: 2,
    finalSize: 1,
  }).ok
);
{
  const w = validateHeatConfig({
    participantCount: 6,
    teamsPerSession: 4,
    qualifiersPerSession: 3,
    finalSize: 4,
  });
  check('val-warn-sesi-tak-gugur', w.warnings.length > 0, w.warnings);
}
{
  // 10 peserta, 2/sesi, 1 lolos → stage lanjutan punya sesi 1 peserta → warning.
  const w = validateHeatConfig({
    participantCount: 10,
    teamsPerSession: 2,
    qualifiersPerSession: 1,
    finalSize: 2,
  });
  check(
    'val-warn-sesi-1-peserta-stage-lanjutan',
    w.warnings.some((x) => x.includes('1 peserta')),
    w.warnings
  );
}
{
  // teamsPerSession > participantCount → hard error.
  const v = validateHeatConfig({
    participantCount: 10,
    teamsPerSession: 12,
    qualifiersPerSession: 2,
    finalSize: 4,
  });
  check(
    'val-teams>peserta error',
    !v.ok && v.errors.some((x) => x.includes('melebihi jumlah peserta')),
    v
  );
}
{
  // 7 peserta, 3/sesi, 2 lolos → distribusi [3,2,2]: dua sesi 2-peserta-lolos-2.
  // Dengan konteks sesi, dua pesan BEDA (Sesi 2, Sesi 3) — bukan duplikat identik.
  const w = validateHeatConfig({
    participantCount: 7,
    teamsPerSession: 3,
    qualifiersPerSession: 2,
    finalSize: 4,
  });
  const messages = w.warnings.filter((x) => x.includes('tidak ada yang gugur'));
  check('val-warning-punya-konteks-sesi', messages.length === 2, w.warnings);
  check(
    'val-warning-sesi-berbeda',
    messages.some((x) => x.includes('Sesi 2')) && messages.some((x) => x.includes('Sesi 3')),
    messages
  );
  // Dedup tetap berlaku utk pesan identik literal (tidak ada).
  check('val-warning-tanpa-duplikat-identik', new Set(messages).size === messages.length, messages);
}

// ─── resolveRanks ───
eq(
  'rank-manual',
  resolveRanks(
    [
      { participantId: 1, rank: 2 },
      { participantId: 2, rank: 1 },
      { participantId: 3, rank: 4 },
      { participantId: 4, rank: 3 },
    ],
    'MANUAL_POSITION'
  ),
  [
    { participantId: 2, rank: 1 },
    { participantId: 1, rank: 2 },
    { participantId: 4, rank: 3 },
    { participantId: 3, rank: 4 },
  ]
);
check(
  'rank-manual-dobel',
  (() => {
    try {
      resolveRanks(
        [
          { participantId: 1, rank: 1 },
          { participantId: 2, rank: 1 },
        ],
        'MANUAL_POSITION'
      );
      return false;
    } catch {
      return true;
    }
  })()
);
eq(
  'rank-time-asc',
  resolveRanks(
    [
      { participantId: 1, timeMs: 42530 },
      { participantId: 2, timeMs: 39120 },
      { participantId: 3, timeMs: 44810 },
      { participantId: 4, timeMs: 40220 },
    ],
    'TIME_ASC'
  ).map((r) => r.participantId),
  [2, 4, 1, 3]
);
eq(
  'rank-score-desc',
  resolveRanks(
    [
      { participantId: 1, score: 80 },
      { participantId: 2, score: 95 },
      { participantId: 3, score: 70 },
    ],
    'SCORE_DESC'
  ).map((r) => r.participantId),
  [2, 1, 3]
);

// ─── qualify (TOP_N_PER_SESSION) ───
eq(
  'qual-per-session',
  qualify({
    mode: 'TOP_N_PER_SESSION',
    qualifiersPerSession: 2,
    bySession: [
      {
        sessionId: 1,
        ranks: [
          { participantId: 1, rank: 1 },
          { participantId: 2, rank: 2 },
          { participantId: 3, rank: 3 },
          { participantId: 4, rank: 4 },
        ],
      },
      {
        sessionId: 2,
        ranks: [
          { participantId: 5, rank: 1 },
          { participantId: 6, rank: 2 },
          { participantId: 7, rank: 3 },
          { participantId: 8, rank: 4 },
        ],
      },
    ],
  }).map((q) => q.participantId),
  [1, 2, 5, 6]
);

// ─── serpentineOrder ───
eq('serpentine-8/4', serpentineOrder([1, 2, 3, 4, 5, 6, 7, 8], 4), [1, 8, 2, 7, 3, 6, 4, 5]);

// ─── assignToSessions ───
{
  const sessions = assignToSessions({
    participantIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    sessionSizes: [4, 3, 3],
    method: 'REGISTRATION_ORDER',
  });
  eq('assign-reg-order', sessions, [
    [1, 2, 3, 4],
    [5, 6, 7],
    [8, 9, 10],
  ]);
}
{
  const sessions = assignToSessions({
    participantIds: [1, 2, 3, 4, 5, 6, 7, 8],
    sessionSizes: [4, 4],
    method: 'MANUAL',
    manualSessions: new Map([
      [1, 2],
      [2, 1],
      [3, 1],
      [4, 1],
      [5, 2],
      [6, 2],
      [7, 1],
      [8, 2],
    ]),
  });
  eq(
    'assign-manual',
    sessions.map((s) => s.length),
    [4, 4]
  );
}
{
  const sessions = assignToSessions({
    participantIds: [1, 2, 3, 4, 5, 6, 7, 8],
    sessionSizes: [4, 4],
    method: 'SEEDED_SERPENTINE',
  });
  eq('assign-serpentine', sessions, [
    [1, 4, 5, 8],
    [2, 3, 6, 7],
  ]);
}

// ─── podium ───
eq(
  'podium-heat',
  calculateHeatPodium([
    { participantId: 10, rank: 1 },
    { participantId: 20, rank: 2 },
    { participantId: 30, rank: 3 },
    { participantId: 40, rank: 4 },
  ]),
  { rank1: 10, rank2: 20, rank3: 30 }
);

if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log('\nAll heat selfchecks PASS');
