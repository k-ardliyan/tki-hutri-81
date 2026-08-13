/**
 * Integration test: generate → submit 6 match → koreksi SF1 (invalidate) →
 * verifikasi QF/SF2 utuh + downstream reset → submit ulang → podium.
 */

import { eq } from 'drizzle-orm';
import { db } from '../src/server/db';
import { brackets, competitions, teams } from '../src/server/db/schema';
import { type TournamentDb, tournamentService } from '../src/server/services/tournament';

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

// Team IDs dinamis dari DB (seed ulang menggeser sequence — jangan hardcode).
const ids = (
  await db!
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.kategori, 'putra'))
    .orderBy(teams.nomor)
    .limit(8)
).map((t) => t.id);
const [A, , C, , E, , G] = ids;

// Hapus bracket putra existing (test bersih).
const [ex] = await db!.select().from(brackets).where(eq(brackets.kategori, 'putra')).limit(1);
if (ex) await tournamentService.remove(td, ex.id);

const { bracketId } = await tournamentService.generate(td, {
  competitionId,
  kategori: 'putra',
  teamIds: ids,
  seedingMethod: 'REGISTRATION_ORDER',
  thirdPlaceEnabled: true,
});
console.log('generate OK, bracket', bracketId);

let detail = await tournamentService.detail(td, competitionId, 'putra');
const main = detail!.rounds.filter((r) => r.roundType === 'MAIN');
check('3 main rounds', main.length === 3);
check(
  '8 match total',
  main.reduce((a, r) => a + r.matches.length, 0) + (detail!.thirdPlaceMatch ? 1 : 0) === 8
);
check(
  'QF semua READY',
  main[0].matches.every((m) => m.status === 'READY')
);
check(
  'SF menunggu',
  main[1].matches.every((m) => m.status === 'WAITING')
);
check(
  'seeds 1..8 = urutan registrasi',
  JSON.stringify(detail!.seeds.map((s) => s.teamId)) === JSON.stringify(ids)
);
check(
  'slots 8 tanpa BYE',
  detail!.slots.length === 8 && detail!.slots.every((s) => !s.bye && s.seed === s.slot)
);
check('M1 seed1=1 seed2=2', main[0].matches[0].seed1 === 1 && main[0].matches[0].seed2 === 2);

// Publish.
await tournamentService.publish(td, bracketId);

// Submit QF: pemenang = participant1 semua (A,C,E,G).
const submit = async (matchId: number, winnerId: number) => {
  const d = await tournamentService.detail(td, competitionId, 'putra');
  const all = d!.rounds.flatMap((r) => r.matches);
  const m =
    all.find((x) => x.id === matchId) ??
    (d!.thirdPlaceMatch?.id === matchId ? d!.thirdPlaceMatch : null);
  return tournamentService.submitResult(td, { matchId, winnerId, expectedVersion: m!.version });
};
const qf = main[0].matches;
for (const m of qf) await submit(m.id, m.participant1Id!);
check(
  `QF M1 winner=${A}`,
  (await tournamentService.detail(td, competitionId, 'putra'))!.rounds[0].matches[0].winnerId === A
);

detail = await tournamentService.detail(td, competitionId, 'putra');
const sf = detail!.rounds.filter((r) => r.roundType === 'MAIN')[1];
check(
  `SF1 = ${A} vs ${C}`,
  sf.matches[0].participant1Id === A && sf.matches[0].participant2Id === C
);
check(
  `SF2 = ${E} vs ${G}`,
  sf.matches[1].participant1Id === E && sf.matches[1].participant2Id === G
);
check(
  'SF READY',
  sf.matches.every((m) => m.status === 'READY')
);

for (const m of sf.matches) await submit(m.id, m.participant1Id!);
detail = await tournamentService.detail(td, competitionId, 'putra');
const final = detail!.rounds.filter((r) => r.roundType === 'MAIN')[2];
check(
  `Final = ${A} vs ${E}`,
  final.matches[0].participant1Id === A && final.matches[0].participant2Id === E
);
const tp = detail!.thirdPlaceMatch;
check(`Third = ${C} vs ${G} (losers SF)`, tp?.participant1Id === C && tp?.participant2Id === G);
check('Final READY', final.matches[0].status === 'READY');
check('Third READY', tp?.status === 'READY');

await submit(final.matches[0].id, A);
await submit(tp!.id, C);
detail = await tournamentService.detail(td, competitionId, 'putra');
check('Status COMPLETED', detail!.bracket.status === 'COMPLETED');
check(
  `Podium ${A}/${E}/${C}`,
  JSON.stringify(detail!.podium) === `{"rank1":${A},"rank2":${E},"rank3":${C}}`
);

// ─── Koreksi SF1: pemenang A → C (invalidate downstream) ──
const sf1 = detail!.rounds.filter((r) => r.roundType === 'MAIN')[1].matches[0];
// Blok tanpa invalidate.
let blocked = false;
try {
  await tournamentService.correctResult(td, {
    matchId: sf1.id,
    winnerId: C,
    invalidateDownstream: false,
    expectedVersion: sf1.version,
  });
} catch (e) {
  blocked = e instanceof Error && e.message.includes('membatalkan');
}
check('Koreksi tanpa konfirmasi → blok', blocked);

await tournamentService.correctResult(td, {
  matchId: sf1.id,
  winnerId: C,
  invalidateDownstream: true,
  reason: 'tes koreksi',
  expectedVersion: sf1.version,
});
detail = await tournamentService.detail(td, competitionId, 'putra');
const qfAfter = detail!.rounds.filter((r) => r.roundType === 'MAIN')[0];
const sfAfter = detail!.rounds.filter((r) => r.roundType === 'MAIN')[1];
const finalAfter = detail!.rounds.filter((r) => r.roundType === 'MAIN')[2];
check(
  'QF tetap COMPLETED (tidak tersentuh)',
  qfAfter.matches.every((m) => m.status === 'COMPLETED')
);
check('SF2 tetap COMPLETED (sibling utuh)', sfAfter.matches[1].status === 'COMPLETED');
check(`SF1 winner berubah ${C}`, sfAfter.matches[0].winnerId === C);
check('Final di-reset → READY (siap diinput ulang)', finalAfter.matches[0].status === 'READY');
check(
  `Final peserta recompute = ${C} vs ${E}`,
  finalAfter.matches[0].participant1Id === C && finalAfter.matches[0].participant2Id === E
);
check('Third di-reset → READY', detail!.thirdPlaceMatch?.status === 'READY');
check(
  `Third peserta recompute = ${A} vs ${G}`,
  detail!.thirdPlaceMatch?.participant1Id === A && detail!.thirdPlaceMatch?.participant2Id === G
);
check('Status turun IN_PROGRESS', detail!.bracket.status === 'IN_PROGRESS');
check(
  'Podium dikosongkan',
  JSON.stringify(detail!.podium) === '{"rank1":null,"rank2":null,"rank3":null}'
);

// Isi ulang final + third → podium baru C/E/A.
await submit(finalAfter.matches[0].id, C);
await submit(detail!.thirdPlaceMatch!.id, A);
detail = await tournamentService.detail(td, competitionId, 'putra');
check('COMPLETED lagi', detail!.bracket.status === 'COMPLETED');
check(
  `Podium baru ${C}/${E}/${A}`,
  JSON.stringify(detail!.podium) === `{"rank1":${C},"rank2":${E},"rank3":${A}}`
);

// ── Reload stability: seeding deterministik (REGISTRATION_ORDER) ──
const again = await tournamentService.detail(td, competitionId, 'putra');
check(
  'Reload: QF peserta sama',
  JSON.stringify(again!.rounds[0].matches.map((m) => [m.participant1Id, m.participant2Id])) ===
    JSON.stringify(detail!.rounds[0].matches.map((m) => [m.participant1Id, m.participant2Id]))
);

// Helper submit per kategori (ambil version fresh dari detail).
const submitK = async (kategori: 'putra' | 'putri', matchId: number, winnerId: number) => {
  const dd = await tournamentService.detail(td, competitionId, kategori);
  const all = dd!.rounds.flatMap((r) => r.matches);
  const mm =
    all.find((x) => x.id === matchId) ??
    (dd!.thirdPlaceMatch?.id === matchId ? dd!.thirdPlaceMatch : null);
  return tournamentService.submitResult(td, { matchId, winnerId, expectedVersion: mm!.version });
};

// ─── A. 2 peserta + thirdPlaceEnabled=true → tetap COMPLETED ───
{
  const ids2 = ids.slice(0, 2);
  const [b2] = await db!.select().from(brackets).where(eq(brackets.kategori, 'putra')).limit(1);
  if (b2) await tournamentService.remove(td, b2.id);
  const g2 = await tournamentService.generate(td, {
    competitionId,
    kategori: 'putra',
    teamIds: ids2,
    seedingMethod: 'REGISTRATION_ORDER',
    thirdPlaceEnabled: true,
  });
  let d2 = await tournamentService.detail(td, competitionId, 'putra');
  check('2 tim: third place tidak dibuat', d2!.thirdPlaceMatch === null);
  check('2 tim: 1 main round', d2!.rounds.filter((r) => r.roundType === 'MAIN').length === 1);
  await tournamentService.publish(td, g2.bracketId);
  const m2 = d2!.rounds[0].matches[0];
  await submitK('putra', m2.id, m2.participant1Id!);
  d2 = await tournamentService.detail(td, competitionId, 'putra');
  check('2 tim + thirdPlace flag → COMPLETED', d2!.bracket.status === 'COMPLETED');
  check('2 tim podium rank1/2', d2!.podium.rank1 === ids2[0] && d2!.podium.rank2 === ids2[1]);
  await tournamentService.remove(td, g2.bracketId);
}

// ─── B. 5 peserta (BYE) e2e: auto-advance → full play → COMPLETED ───
{
  const p5 = (
    await db!
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.kategori, 'putri'))
      .orderBy(teams.nomor)
      .limit(5)
  ).map((t) => t.id);
  if (p5.length === 5) {
    const [b5] = await db!.select().from(brackets).where(eq(brackets.kategori, 'putri')).limit(1);
    if (b5) await tournamentService.remove(td, b5.id);
    const g5 = await tournamentService.generate(td, {
      competitionId,
      kategori: 'putri',
      teamIds: p5,
      seedingMethod: 'REGISTRATION_ORDER',
      thirdPlaceEnabled: true,
    });
    let d5 = await tournamentService.detail(td, competitionId, 'putri');
    const byeMatches = d5!.rounds[0].matches.filter((m) => m.status === 'AUTO_ADVANCED');
    check('5 tim: 3 BYE auto-advance', byeMatches.length === 3);
    await tournamentService.publish(td, g5.bracketId);
    const byeReject = await tournamentService
      .submitResult(td, {
        matchId: byeMatches[0].id,
        winnerId: byeMatches[0].winnerId!,
        expectedVersion: byeMatches[0].version,
      })
      .then(() => false)
      .catch((e) => String(e?.message ?? e).includes('Gunakan koreksi'));
    check('5 tim: submit match BYE ditolak', byeReject);
    // Mainkan semua match READY (loop sampai habis), lalu third place.
    let guard = 0;
    while (guard++ < 10) {
      const d = await tournamentService.detail(td, competitionId, 'putri');
      const ready = d!.rounds
        .filter((r) => r.roundType === 'MAIN')
        .flatMap((r) => r.matches)
        .filter((m) => m.status === 'READY');
      if (ready.length === 0) break;
      for (const m of ready) await submitK('putri', m.id, m.participant1Id!);
    }
    const tp5 = (await tournamentService.detail(td, competitionId, 'putri'))!.thirdPlaceMatch;
    if (tp5?.status === 'READY') await submitK('putri', tp5.id, tp5.participant1Id!);
    d5 = await tournamentService.detail(td, competitionId, 'putri');
    check('5 tim: bracket COMPLETED', d5!.bracket.status === 'COMPLETED');
    check('5 tim: podium rank1 terisi', d5!.podium.rank1 !== null);
    check(
      '5 tim: semua peserta masuk podium/play',
      d5!.podium.rank1 !== null && d5!.podium.rank2 !== null
    );
    await tournamentService.remove(td, g5.bracketId);
  } else {
    console.log('  - skip 5-tim (putri < 5 tim)');
  }
}

// ─── C. 4 peserta: third place dari SF round 1 + koreksi version salah ───
{
  const ids4 = ids.slice(0, 4);
  const [b4] = await db!.select().from(brackets).where(eq(brackets.kategori, 'putra')).limit(1);
  if (b4) await tournamentService.remove(td, b4.id);
  const g4 = await tournamentService.generate(td, {
    competitionId,
    kategori: 'putra',
    teamIds: ids4,
    seedingMethod: 'REGISTRATION_ORDER',
    thirdPlaceEnabled: true,
  });
  let d4 = await tournamentService.detail(td, competitionId, 'putra');
  check('4 tim: 2 main rounds', d4!.rounds.filter((r) => r.roundType === 'MAIN').length === 2);
  await tournamentService.publish(td, g4.bracketId);
  const sf4 = d4!.rounds.filter((r) => r.roundType === 'MAIN')[0].matches;
  await submitK('putra', sf4[0].id, sf4[0].participant1Id!);
  await submitK('putra', sf4[1].id, sf4[1].participant1Id!);
  d4 = await tournamentService.detail(td, competitionId, 'putra');
  const final4 = d4!.rounds.filter((r) => r.roundType === 'MAIN')[1].matches[0];
  const tp4 = d4!.thirdPlaceMatch!;
  check(
    '4 tim: third = loser SF1 vs loser SF2',
    tp4.participant1Id === sf4[0].participant2Id && tp4.participant2Id === sf4[1].participant2Id
  );
  check('4 tim: final = winner SF1 vs winner SF2', final4.status === 'READY');
  await submitK('putra', final4.id, final4.participant1Id!);
  await submitK('putra', tp4.id, tp4.participant1Id!);
  d4 = await tournamentService.detail(td, competitionId, 'putra');
  check('4 tim: COMPLETED', d4!.bracket.status === 'COMPLETED');
  const final4now = d4!.rounds.filter((r) => r.roundType === 'MAIN')[1].matches[0];
  const wrongVersion = await tournamentService
    .correctResult(td, {
      matchId: final4.id,
      winnerId: final4now.participant2Id!,
      reason: 'cek lock',
      invalidateDownstream: false,
      expectedVersion: 0,
    })
    .then(() => false)
    .catch((e) => String(e?.message ?? e).includes('diubah admin lain'));
  check('4 tim: koreksi version salah → tolak', wrongVersion);
  const correctOk = await tournamentService
    .correctResult(td, {
      matchId: final4.id,
      winnerId: final4now.participant2Id!,
      reason: 'koreksi valid',
      invalidateDownstream: false,
      expectedVersion: final4now.version,
    })
    .then((r) => r.ok)
    .catch(() => false);
  check('4 tim: koreksi version benar → ok', correctOk);
  await tournamentService.remove(td, g4.bracketId);
}

// ─── D. Manual seeding: posisi tim asing (di luar peserta) → ditolak ───
{
  const ids4 = ids.slice(0, 4);
  const [bD] = await db!.select().from(brackets).where(eq(brackets.kategori, 'putra')).limit(1);
  if (bD) await tournamentService.remove(td, bD.id);
  const foreign = 999999;
  let threw = false;
  try {
    await tournamentService.generate(td, {
      competitionId,
      kategori: 'putra',
      teamIds: ids4,
      seedingMethod: 'MANUAL',
      thirdPlaceEnabled: false,
      manualPositions: new Map([
        [ids4[0], 1],
        [ids4[1], 2],
        [ids4[2], 3],
        [ids4[3], 4],
        [foreign, 5],
      ]),
    });
  } catch (e) {
    threw = String((e as Error)?.message ?? e).includes('di luar peserta');
  }
  check('manual posisi tim asing → ditolak', threw);
}

// ─── E. Regenerate MANUAL tanpa posisi baru → seed dipertahankan ───
{
  const ids4 = ids.slice(0, 4);
  const [bE] = await db!.select().from(brackets).where(eq(brackets.kategori, 'putra')).limit(1);
  if (bE) await tournamentService.remove(td, bE.id);
  const gE = await tournamentService.generate(td, {
    competitionId,
    kategori: 'putra',
    teamIds: ids4,
    seedingMethod: 'MANUAL',
    thirdPlaceEnabled: true,
    manualPositions: new Map([
      [ids4[3], 1],
      [ids4[2], 2],
      [ids4[1], 3],
      [ids4[0], 4],
    ]),
  });
  let dE = await tournamentService.detail(td, competitionId, 'putra');
  check(
    'regenerate: seed awal terbalik',
    JSON.stringify(dE!.seeds.map((s) => s.teamId)) ===
      JSON.stringify([ids4[3], ids4[2], ids4[1], ids4[0]])
  );
  await tournamentService.regenerate(td, competitionId, 'putra');
  dE = await tournamentService.detail(td, competitionId, 'putra');
  check(
    'regenerate MANUAL pertahankan urutan seed',
    JSON.stringify(dE!.seeds.map((s) => s.teamId)) ===
      JSON.stringify([ids4[3], ids4[2], ids4[1], ids4[0]])
  );
  // Cleanup pakai id BARU hasil regenerate (bukan gE.bracketId yang sudah dihapus).
  if (dE?.bracket.id) await tournamentService.remove(td, dE.bracket.id);
}

// Bersihkan test.
await tournamentService.remove(td, bracketId);
console.log(failed > 0 ? `✗ ${failed} check gagal` : '✓ Semua integration check lulus');
process.exit(failed > 0 ? 1 : 0);
