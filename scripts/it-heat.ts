/**
 * Integration test — HEAT elimination engine (Stage → Session → Results).
 *
 * Skenario utama:
 * 1. generateHeat 8 tim → 1 stage (2 sesi × 4, 2 lolos/sesi) → Final 4.
 * 2. submit hasil sesi → QUALIFIED/ELIMINATED; optimistic lock.
 * 3. finalizeStage → qualifier masuk Final; podium; COMPLETED.
 * 4. Koreksi hasil upstream → downstream invalidated → regenerate.
 *
 * SELF-CLEAN: bracket heat dihapus di akhir.
 */

import { eq } from 'drizzle-orm';
import type { HeatDetailView } from '../src/lib/tournament/heat-elimination';
import { db } from '../src/server/db';
import { brackets, competitions, teams } from '../src/server/db/schema';
import type { TournamentDb } from '../src/server/services/tournament';
import { heatService } from '../src/server/services/tournament/heat';

const td = db as unknown as TournamentDb;
let failed = 0;
const check = (name: string, cond: boolean, detail?: string) => {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

const [comp] = await db!
  .select({ id: competitions.id })
  .from(competitions)
  .where(eq(competitions.slug, 'balon'))
  .limit(1);
const competitionId = comp?.id ?? 1;

// Team IDs dinamis (jangan hardcode — seed ulang menggeser sequence).
// Kategori putra punya 8 tim; putri cuma 5.
const ids = (
  await db!
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.kategori, 'putra'))
    .orderBy(teams.nomor)
    .limit(8)
).map((t) => t.id);
const [A, B, C, D, E, F, G, H] = ids;

// Bersihkan bracket existing utk kategori putra.
const [ex] = await db!.select().from(brackets).where(eq(brackets.kategori, 'putra')).limit(1);
if (ex) await db!.delete(brackets).where(eq(brackets.id, ex.id));

// ─── 1. Generate 8 tim → 2 stage (Penyisihan 2 sesi + Final 4) ───
const config = {
  participantCount: 8,
  teamsPerSession: 4,
  qualifiersPerSession: 2,
  finalSize: 4,
};
await heatService.generate(td, {
  competitionId,
  kategori: 'putra',
  teamIds: ids,
  config,
  seedingMethod: 'REGISTRATION_ORDER',
});

let detail = (await heatService.detail(td, competitionId, 'putra')) as HeatDetailView;
check('bracket format HEAT', detail.bracket.format === 'HEAT_ELIMINATION');
check('bracket DRAFT', detail.bracket.status === 'DRAFT');
check('2 stages', detail.stages.length === 2, String(detail.stages.length));
check('stage1 = Penyisihan', detail.stages[0].name === 'Penyisihan');
check('stage1 ACTIVE', detail.stages[0].status === 'ACTIVE');
check('stage1 2 sesi', detail.stages[0].sessions.length === 2);
check('sesi 1: 4 peserta', detail.stages[0].sessions[0].participants.length === 4);
check(
  'sesi 1: A,B,C,D (registrasi)',
  JSON.stringify(detail.stages[0].sessions[0].participants.map((p) => p.participantId)) ===
    JSON.stringify([A, B, C, D])
);
check('stage2 PENDING', detail.stages[1].status === 'PENDING');
check('stage2 = Final', detail.stages[1].isFinal === true);
check('stage2 belum punya sesi', detail.stages[1].sessions.length === 0);

// ─── 2. Publish ───
await heatService.publish(td, detail.bracket.id);
detail = (await heatService.detail(td, competitionId, 'putra')) as HeatDetailView;
check('bracket PUBLISHED', detail.bracket.status === 'PUBLISHED');

// ─── 3. Submit sesi 1: A(1) B(2) C(3) D(4) → A,B lolos ───
const s1 = detail.stages[0].sessions[0];
const s1Res = await heatService.submitSessionResult(td, {
  sessionId: s1.id,
  expectedVersion: s1.version,
  results: [
    { participantId: A, rank: 1 },
    { participantId: B, rank: 2 },
    { participantId: C, rank: 3 },
    { participantId: D, rank: 4 },
  ],
});
check('submit s1 ok', s1Res.ok === true);

detail = (await heatService.detail(td, competitionId, 'putra')) as HeatDetailView;
const s1After = detail.stages[0].sessions[0];
check('s1 COMPLETED', s1After.status === 'COMPLETED');
check(
  's1 results QUALIFIED/ELIMINATED',
  JSON.stringify(s1After.results.map((r) => [r.participantId, r.resultStatus])) ===
    JSON.stringify([
      [A, 'QUALIFIED'],
      [B, 'QUALIFIED'],
      [C, 'ELIMINATED'],
      [D, 'ELIMINATED'],
    ])
);

// Optimistic lock: version lama → tolak.
const lockFail = await heatService
  .submitSessionResult(td, {
    sessionId: s1.id,
    expectedVersion: s1.version, // sudah berubah
    results: [
      { participantId: A, rank: 1 },
      { participantId: B, rank: 2 },
      { participantId: C, rank: 3 },
      { participantId: D, rank: 4 },
    ],
  })
  .then(() => false)
  .catch(() => true);
check('optimistic lock menolak version lama', lockFail === true);

// ─── 4. Submit sesi 2: E(1) F(2) G(3) H(4) → E,F lolos ───
const s2 = detail.stages[0].sessions[1];
await heatService.submitSessionResult(td, {
  sessionId: s2.id,
  expectedVersion: s2.version,
  results: [
    { participantId: E, rank: 1 },
    { participantId: F, rank: 2 },
    { participantId: G, rank: 3 },
    { participantId: H, rank: 4 },
  ],
});

// ─── 5. Finalize stage 1 → Final aktif + 4 qualifier (A,B,E,F) ───
const stage1Id = detail.stages[0].id;
const fin = await heatService.finalizeStage(td, stage1Id);
check('finalize stage1 ok', fin.ok === true && fin.isFinal === false);
check('qualifier count 4', fin.qualifierCount === 4);

detail = (await heatService.detail(td, competitionId, 'putra')) as HeatDetailView;
check('stage1 COMPLETED', detail.stages[0].status === 'COMPLETED');
check('stage2 ACTIVE', detail.stages[1].status === 'ACTIVE');
const finalSessions = detail.stages[1].sessions;
check('final 1 sesi', finalSessions.length === 1);
const finalParts = finalSessions[0].participants.map((p) => p.participantId).sort();
check(
  'final berisi 4 qualifier A,B,E,F',
  JSON.stringify(finalParts) === JSON.stringify([A, B, E, F].sort())
);
const finalSession = finalSessions[0];
check(
  'final peserta sourceRank terisi',
  finalSession.participants.every((p) => p.sourceRank !== null)
);

// ─── 6. Input hasil final: A(1) B(2) E(3) F(4) → podium A,B,E ───
await heatService.submitSessionResult(td, {
  sessionId: finalSession.id,
  expectedVersion: finalSession.version,
  results: [
    { participantId: A, rank: 1 },
    { participantId: B, rank: 2 },
    { participantId: E, rank: 3 },
    { participantId: F, rank: 4 },
  ],
});
await heatService.finalizeStage(td, detail.stages[1].id);

detail = (await heatService.detail(td, competitionId, 'putra')) as HeatDetailView;
check('bracket COMPLETED', detail.bracket.status === 'COMPLETED');
check('stage2 COMPLETED', detail.stages[1].status === 'COMPLETED');
check('podium rank1 = A', detail.podium.rank1 === A);
check('podium rank2 = B', detail.podium.rank2 === B);
check('podium rank3 = E', detail.podium.rank3 === E);

// ─── 7. Koreksi upstream: sesi 1 rank berubah (C naik ke 2, B turun ke 3) ───
// → qualifier berubah (A,C bukan A,B) → downstream (final) di-invalidate.
const beforeCorrect = (await heatService.detail(td, competitionId, 'putra')) as HeatDetailView;
const s1Again = beforeCorrect.stages[0].sessions[0];
const correctRes = await heatService.correctSessionResult(td, {
  sessionId: s1Again.id,
  reason: 'Salah input urutan',
  invalidateDownstream: true,
  results: [
    { participantId: A, rank: 1 },
    { participantId: C, rank: 2 },
    { participantId: B, rank: 3 },
    { participantId: D, rank: 4 },
  ],
});
check('koreksi upstream ok', correctRes.ok === true);

detail = (await heatService.detail(td, competitionId, 'putra')) as HeatDetailView;
check(
  's1 rank C=2',
  detail.stages[0].sessions[0].results.find((r) => r.participantId === C)?.rank === 2
);
check('final di-invalidate (sesi kosong)', detail.stages[1].sessions.length === 0);
check('stage2 PENDING lagi', detail.stages[1].status === 'PENDING');
check(
  'history tercatat',
  (
    await db!.select().from(
      // import dinamik supaya tidak menambah import di header
      (
        await import('../src/server/db/schema')
      ).bracketSessionResultHistory
    )
  ).length > 0
);

// ─── 8. Finalize ulang → final baru berisi A,C (bukan B) ───
await heatService.finalizeStage(td, detail.stages[0].id);
detail = (await heatService.detail(td, competitionId, 'putra')) as HeatDetailView;
const newFinalParts = detail.stages[1].sessions[0].participants.map((p) => p.participantId).sort();
check(
  'final baru berisi A,C,E,F (C menggantikan B)',
  JSON.stringify(newFinalParts) === JSON.stringify([A, C, E, F].sort())
);

// ─── 9. Skenario DNS/DISQUALIFIED: peserta tanpa rank wajib berstatus gugur ───
{
  // Generate ulang 8 tim fresh (kategori putra), submit sesi dengan 1 peserta DNS.
  const [bC] = await db!.select().from(brackets).where(eq(brackets.kategori, 'putra')).limit(1);
  if (bC) await db!.delete(brackets).where(eq(brackets.id, bC.id));
  await heatService.generate(td, {
    competitionId,
    kategori: 'putra',
    teamIds: ids,
    config,
    seedingMethod: 'REGISTRATION_ORDER',
  });
  const dC = (await heatService.detail(td, competitionId, 'putra')) as HeatDetailView;
  await heatService.publish(td, dC.bracket.id);
  const sC1 = dC.stages[0].sessions[0];
  // D = DNS tanpa rank → diterima; A,B,C ber-rank.
  const resDns = await heatService.submitSessionResult(td, {
    sessionId: sC1.id,
    expectedVersion: sC1.version,
    results: [
      { participantId: A, rank: 1 },
      { participantId: B, rank: 2 },
      { participantId: C, rank: 3 },
      { participantId: D, resultStatus: 'DNS' },
    ],
  });
  check('submit dengan DNS diterima', resDns.ok === true);
  const dC2 = (await heatService.detail(td, competitionId, 'putra')) as HeatDetailView;
  const dnsResult = dC2.stages[0].sessions[0].results.find((r) => r.participantId === D);
  check('DNS tercatat rank null', dnsResult?.rank === null);
  check('DNS tercatat status DNS', dnsResult?.resultStatus === 'DNS');

  // Tanpa rank + tanpa status gugur → ditolak.
  const reject = await heatService
    .submitSessionResult(td, {
      sessionId: dC2.stages[0].sessions[1].id,
      expectedVersion: dC2.stages[0].sessions[1].version,
      results: [
        { participantId: E, rank: 1 },
        { participantId: F, rank: 2 },
        { participantId: G, rank: 3 },
        { participantId: H }, // tanpa rank & tanpa status
      ],
    })
    .then(() => false)
    .catch((e) => String(e?.message ?? e).includes('peringkat'));
  check('peserta tanpa rank & status → ditolak', reject === true);

  const [bClean2] = await db!
    .select()
    .from(brackets)
    .where(eq(brackets.kategori, 'putra'))
    .limit(1);
  if (bClean2) await db!.delete(brackets).where(eq(brackets.id, bClean2.id));
}

// ─── 10. Guard: submit/finalize DITOLAK saat bracket masih DRAFT ───
{
  const [bG] = await db!.select().from(brackets).where(eq(brackets.kategori, 'putra')).limit(1);
  if (bG) await db!.delete(brackets).where(eq(brackets.id, bG.id));
  await heatService.generate(td, {
    competitionId,
    kategori: 'putra',
    teamIds: ids,
    config,
    seedingMethod: 'REGISTRATION_ORDER',
  });
  const dG = (await heatService.detail(td, competitionId, 'putra')) as HeatDetailView;
  const sG = dG.stages[0].sessions[0];
  const submitDraft = await heatService
    .submitSessionResult(td, {
      sessionId: sG.id,
      expectedVersion: sG.version,
      results: [
        { participantId: A, rank: 1 },
        { participantId: B, rank: 2 },
        { participantId: C, rank: 3 },
        { participantId: D, rank: 4 },
      ],
    })
    .then(() => false)
    .catch((e) => String(e?.message ?? e).includes('Publish bagan dulu'));
  check('submit saat DRAFT ditolak', submitDraft === true);
  const finalizeDraft = await heatService
    .finalizeStage(td, dG.stages[0].id)
    .then(() => false)
    .catch((e) => String(e?.message ?? e).includes('Publish bagan dulu'));
  check('finalize saat DRAFT ditolak', finalizeDraft === true);
  const [bG2] = await db!.select().from(brackets).where(eq(brackets.kategori, 'putra')).limit(1);
  if (bG2) await db!.delete(brackets).where(eq(brackets.id, bG2.id));
}

// ─── 11. DNS tidak lolos: finalize dengan 1 DNS → qualifier tetap peserta ber-rank ───
{
  const [bD] = await db!.select().from(brackets).where(eq(brackets.kategori, 'putra')).limit(1);
  if (bD) await db!.delete(brackets).where(eq(brackets.id, bD.id));
  await heatService.generate(td, {
    competitionId,
    kategori: 'putra',
    teamIds: ids,
    config,
    seedingMethod: 'REGISTRATION_ORDER',
  });
  const dD = (await heatService.detail(td, competitionId, 'putra')) as HeatDetailView;
  await heatService.publish(td, dD.bracket.id);
  const sD1 = dD.stages[0].sessions[0];
  await heatService.submitSessionResult(td, {
    sessionId: sD1.id,
    expectedVersion: sD1.version,
    results: [
      { participantId: A, rank: 1 },
      { participantId: B, rank: 2 },
      { participantId: C, rank: 3 },
      { participantId: D, resultStatus: 'DNS' },
    ],
  });
  const sD2 = dD.stages[0].sessions[1];
  await heatService.submitSessionResult(td, {
    sessionId: sD2.id,
    expectedVersion: sD2.version,
    results: [
      { participantId: E, rank: 1 },
      { participantId: F, rank: 2 },
      { participantId: G, rank: 3 },
      { participantId: H, rank: 4 },
    ],
  });
  const finD = await heatService.finalizeStage(td, dD.stages[0].id);
  check('finalize DNS stage ok', finD.ok === true);
  const dD2 = (await heatService.detail(td, competitionId, 'putra')) as HeatDetailView;
  const finalPartsD = dD2.stages[1].sessions[0].participants.map((p) => p.participantId).sort();
  // D (DNS) TIDAK boleh lolos — qualifier = A,B (sesi1) + E,F (sesi2) = 4.
  check(
    'DNS tidak lolos',
    JSON.stringify(finalPartsD) === JSON.stringify([A, B, E, F].sort()),
    JSON.stringify(finalPartsD)
  );
  const [bD2] = await db!.select().from(brackets).where(eq(brackets.kategori, 'putra')).limit(1);
  if (bD2) await db!.delete(brackets).where(eq(brackets.id, bD2.id));
}

// ─── 12. Koreksi final → bracket COMPLETED turun ke IN_PROGRESS ───
{
  const [bF] = await db!.select().from(brackets).where(eq(brackets.kategori, 'putra')).limit(1);
  if (bF) await db!.delete(brackets).where(eq(brackets.id, bF.id));
  await heatService.generate(td, {
    competitionId,
    kategori: 'putra',
    teamIds: ids,
    config,
    seedingMethod: 'REGISTRATION_ORDER',
  });
  const dF = (await heatService.detail(td, competitionId, 'putra')) as HeatDetailView;
  await heatService.publish(td, dF.bracket.id);
  for (const s of dF.stages[0].sessions) {
    const parts = s.participants.map((p) => p.participantId);
    await heatService.submitSessionResult(td, {
      sessionId: s.id,
      expectedVersion: s.version,
      results: parts.map((p, i) => ({ participantId: p, rank: i + 1 })),
    });
  }
  await heatService.finalizeStage(td, dF.stages[0].id);
  const dF2 = (await heatService.detail(td, competitionId, 'putra')) as HeatDetailView;
  const fSess = dF2.stages[1].sessions[0];
  await heatService.submitSessionResult(td, {
    sessionId: fSess.id,
    expectedVersion: fSess.version,
    results: fSess.participants.map((p, i) => ({ participantId: p.participantId, rank: i + 1 })),
  });
  await heatService.finalizeStage(td, dF2.stages[1].id);
  let dF3 = (await heatService.detail(td, competitionId, 'putra')) as HeatDetailView;
  check('bracket COMPLETED sebelum koreksi', dF3.bracket.status === 'COMPLETED');
  // Koreksi sesi final (rank dibalik) → bracket harus IN_PROGRESS.
  const finSess = dF3.stages[1].sessions[0];
  const parts = finSess.participants.map((p) => p.participantId);
  await heatService.correctSessionResult(td, {
    sessionId: finSess.id,
    invalidateDownstream: false,
    results: parts.map((p, i) => ({ participantId: p, rank: parts.length - i })),
  });
  dF3 = (await heatService.detail(td, competitionId, 'putra')) as HeatDetailView;
  check('bracket IN_PROGRESS setelah koreksi final', dF3.bracket.status === 'IN_PROGRESS');
  const [bF2] = await db!.select().from(brackets).where(eq(brackets.kategori, 'putra')).limit(1);
  if (bF2) await db!.delete(brackets).where(eq(brackets.id, bF2.id));
}

// ─── 13. Flow 16 tim penuh: 4 sesi → 8 lolos → 2 sesi → 4 lolos → Final ───
{
  // Butuh 16 tim: gabung putra (8) + putri (5) tidak cukup → pakai putra + buat
  // cukup dgn tim putra saja bila >= 16. DB seed: putra 8. Skip kalau < 16.
  const allPutra = (
    await db!
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.kategori, 'putra'))
      .orderBy(teams.nomor)
  ).map((t) => t.id);
  if (allPutra.length >= 16) {
    const ids16 = allPutra.slice(0, 16);
    const [b16] = await db!.select().from(brackets).where(eq(brackets.kategori, 'putra')).limit(1);
    if (b16) await db!.delete(brackets).where(eq(brackets.id, b16.id));
    await heatService.generate(td, {
      competitionId,
      kategori: 'putra',
      teamIds: ids16,
      config: { participantCount: 16, teamsPerSession: 4, qualifiersPerSession: 2, finalSize: 4 },
      seedingMethod: 'REGISTRATION_ORDER',
    });
    let d16 = (await heatService.detail(td, competitionId, 'putra')) as HeatDetailView;
    check('16 tim: 3 stage', d16.stages.length === 3, String(d16.stages.length));
    check('16 tim: stage1 4 sesi', d16.stages[0].sessions.length === 4);
    await heatService.publish(td, d16.bracket.id);
    // Isi semua sesi stage 1 (top 2 lolos per sesi).
    for (const s of d16.stages[0].sessions) {
      const parts = s.participants.map((p) => p.participantId);
      await heatService.submitSessionResult(td, {
        sessionId: s.id,
        expectedVersion: s.version,
        results: parts.map((p, i) => ({ participantId: p, rank: i + 1 })),
      });
    }
    await heatService.finalizeStage(td, d16.stages[0].id);
    d16 = (await heatService.detail(td, competitionId, 'putra')) as HeatDetailView;
    check('16 tim: stage2 2 sesi', d16.stages[1].sessions.length === 2);
    check(
      '16 tim: 8 qualifier',
      d16.stages[1].sessions.reduce((a, s) => a + s.participants.length, 0) === 8
    );
    for (const s of d16.stages[1].sessions) {
      const parts = s.participants.map((p) => p.participantId);
      await heatService.submitSessionResult(td, {
        sessionId: s.id,
        expectedVersion: s.version,
        results: parts.map((p, i) => ({ participantId: p, rank: i + 1 })),
      });
    }
    await heatService.finalizeStage(td, d16.stages[1].id);
    d16 = (await heatService.detail(td, competitionId, 'putra')) as HeatDetailView;
    check('16 tim: final 4 peserta', d16.stages[2].sessions[0]?.participants.length === 4);
    const f16 = d16.stages[2].sessions[0];
    await heatService.submitSessionResult(td, {
      sessionId: f16.id,
      expectedVersion: f16.version,
      results: f16.participants.map((p, i) => ({ participantId: p.participantId, rank: i + 1 })),
    });
    await heatService.finalizeStage(td, d16.stages[2].id);
    d16 = (await heatService.detail(td, competitionId, 'putra')) as HeatDetailView;
    check('16 tim: COMPLETED', d16.bracket.status === 'COMPLETED');
    check('16 tim: podium rank1 terisi', d16.podium.rank1 !== null);
    const [b162] = await db!.select().from(brackets).where(eq(brackets.kategori, 'putra')).limit(1);
    if (b162) await db!.delete(brackets).where(eq(brackets.id, b162.id));
  } else {
    console.log('  - skip 16-tim (DB < 16 tim putra)');
  }
}

// ─── Cleanup ───
const [bClean] = await db!.select().from(brackets).where(eq(brackets.kategori, 'putra')).limit(1);
if (bClean) await db!.delete(brackets).where(eq(brackets.id, bClean.id));

if (failed > 0) {
  console.error(`\n${failed} check(s) FAILED`);
  process.exit(1);
}
console.log('\nAll heat integration checks PASS');
