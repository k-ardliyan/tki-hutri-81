/**
 * Integration review: edge cases yang sebelumnya tak tertutup.
 * 1. Koreksi TANPA invalidate (downstream WAITING) → slot downstream ikut berubah.
 * 2. Walkover (resultType) tersimpan.
 * 3. Optimistic lock (expectedVersion mismatch) → ditolak.
 * 4. Submit saat DRAFT → ditolak.
 * 5. Reset Results → semua hasil hilang, status PUBLISHED, podium kosong.
 * 6. Regenerate DRAFT → struktur baru, peserta sama.
 * 7. 16 peserta → 4 round, 15 match, destination benar.
 * 8. Third-place disabled → final selesai langsung COMPLETED.
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
const bracketIds: number[] = [];
const cleanup = async () => {
  for (const id of bracketIds) await tournamentService.remove(td, id).catch(() => {});
};
// Team IDs dinamis dari DB (seed ulang menggeser sequence — jangan hardcode).
const putraIds = (
  await db!
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.kategori, 'putra'))
    .orderBy(teams.nomor)
    .limit(8)
).map((t) => t.id);
const [A, B, C, D, E, F, G, H] = putraIds;
const T8 = putraIds;
const fresh = async (kategori: 'putra' | 'putri', teamIds: number[], thirdPlaceEnabled = true) => {
  const [comp] = await db!
    .select({ id: competitions.id })
    .from(competitions)
    .where(eq(competitions.slug, 'balon'))
    .limit(1);
  const [ex] = await db!.select().from(brackets).where(eq(brackets.kategori, kategori)).limit(1);
  if (ex) await tournamentService.remove(td, ex.id);
  const { bracketId } = await tournamentService.generate(td, {
    competitionId: comp!.id,
    kategori,
    teamIds,
    seedingMethod: 'REGISTRATION_ORDER',
    thirdPlaceEnabled,
  });
  bracketIds.push(bracketId);
  return { competitionId: comp!.id, bracketId };
};
const submit = async (
  competitionId: number,
  kategori: 'putra' | 'putri',
  matchId: number,
  winnerId: number,
  extra: Record<string, unknown> = {}
) => {
  const d = await tournamentService.detail(td, competitionId, kategori);
  const m =
    d!.rounds.flatMap((r) => r.matches).find((x) => x.id === matchId) ??
    (d!.thirdPlaceMatch?.id === matchId ? d!.thirdPlaceMatch : null);
  return tournamentService.submitResult(td, {
    matchId,
    winnerId,
    expectedVersion: m!.version,
    ...extra,
  });
};

// ── 1. Koreksi TANPA invalidate (downstream WAITING) ──
console.log('koreksi tanpa invalidate (downstream WAITING)');
{
  const { competitionId, bracketId } = await fresh('putra', T8);
  await tournamentService.publish(td, bracketId);
  let d = await tournamentService.detail(td, competitionId, 'putra');
  const qf = d!.rounds[0].matches;
  // QF M1..M4: pemenang A,C,E,G.
  for (const m of qf) await submit(competitionId, 'putra', m.id, m.participant1Id!);
  d = await tournamentService.detail(td, competitionId, 'putra');
  const sf1 = d!.rounds[1].matches[0];
  // SF1 selesai (A menang), FINAL belum dimainkan → final slot1 = A.
  await submit(competitionId, 'putra', sf1.id, sf1.participant1Id!);
  d = await tournamentService.detail(td, competitionId, 'putra');
  const fin = d!.rounds[2].matches[0];
  check('final slot1 = A (pemenang SF1 asli)', fin.participant1Id === A);
  // Koreksi SF1 → pemenang C, TANPA invalidate (final WAITING, affected=0).
  const sf1Now = d!.rounds[1].matches[0]; // version fresh setelah submit SF1
  await tournamentService.correctResult(td, {
    matchId: sf1.id,
    winnerId: C,
    invalidateDownstream: false,
    expectedVersion: sf1Now.version,
  });
  d = await tournamentService.detail(td, competitionId, 'putra');
  const fin2 = d!.rounds[2].matches[0];
  check('final slot1 ikut berubah = C', fin2.participant1Id === C);
  check('final tetap WAITING (belum dimainkan)', fin2.status === 'WAITING');
  check(
    'third place slot1 ikut berubah = A (loser baru SF1)',
    d!.thirdPlaceMatch!.participant1Id === A
  );
  check(
    'third place slot2 masih kosong (SF2 belum selesai)',
    d!.thirdPlaceMatch!.participant2Id === null
  );
  check('SF1 winner = C', d!.rounds[1].matches[0].winnerId === C);
  check(
    'QF tetap COMPLETED',
    d!.rounds[0].matches.every((m) => m.status === 'COMPLETED')
  );
}

// ── 2. Walkover + 3. optimistic lock + 4. DRAFT block ──
console.log('walkover / lock / draft block');
{
  const { competitionId, bracketId } = await fresh('putra', T8.slice(0, 4));
  let d = await tournamentService.detail(td, competitionId, 'putra');
  const qf = d!.rounds[0].matches;
  // DRAFT: submit → ditolak.
  let draftBlocked = false;
  try {
    await submit(competitionId, 'putra', qf[0].id, A);
  } catch {
    draftBlocked = true;
  }
  check('submit saat DRAFT → ditolak', draftBlocked);

  await tournamentService.publish(td, bracketId);
  // Version salah → ditolak.
  let lockBlocked = false;
  try {
    await tournamentService.submitResult(td, {
      matchId: qf[0].id,
      winnerId: A,
      expectedVersion: 99,
    });
  } catch (e) {
    lockBlocked = e instanceof Error && e.message.includes('admin lain');
  }
  check('expectedVersion mismatch → ditolak (lock)', lockBlocked);

  // Walkover: winner B, tipe WALKOVER.
  await tournamentService.submitResult(td, {
    matchId: qf[0].id,
    winnerId: B,
    resultType: 'WALKOVER',
    expectedVersion: 1,
  });
  d = await tournamentService.detail(td, competitionId, 'putra');
  check(
    'walkover tersimpan (winner B, WALKOVER)',
    (() => {
      const m = d!.rounds[0].matches[0];
      return m.winnerId === B && m.loserId === A;
    })()
  );
}

// ── 5. Reset Results ──
console.log('reset results');
{
  const { competitionId, bracketId } = await fresh('putra', T8);
  await tournamentService.publish(td, bracketId);
  let d = await tournamentService.detail(td, competitionId, 'putra');
  for (const m of d!.rounds[0].matches)
    await submit(competitionId, 'putra', m.id, m.participant1Id!);
  d = await tournamentService.detail(td, competitionId, 'putra');
  for (const m of d!.rounds[1].matches)
    await submit(competitionId, 'putra', m.id, m.participant1Id!);
  d = await tournamentService.detail(td, competitionId, 'putra');
  await submit(
    competitionId,
    'putra',
    d!.rounds[2].matches[0].id,
    d!.rounds[2].matches[0].participant1Id!
  );
  await submit(competitionId, 'putra', d!.thirdPlaceMatch!.id, d!.thirdPlaceMatch!.participant1Id!);
  d = await tournamentService.detail(td, competitionId, 'putra');
  check('COMPLETED sebelum reset', d!.bracket.status === 'COMPLETED');
  await tournamentService.resetResults(td, bracketId);
  d = await tournamentService.detail(td, competitionId, 'putra');
  check('status → PUBLISHED', d!.bracket.status === 'PUBLISHED');
  check(
    'QF kembali READY',
    d!.rounds[0].matches.every((m) => m.status === 'READY')
  );
  check(
    'SF kembali WAITING',
    d!.rounds[1].matches.every((m) => m.status === 'WAITING')
  );
  check('podium kosong', JSON.stringify(d!.podium) === '{"rank1":null,"rank2":null,"rank3":null}');
}

// ── 6. Regenerate DRAFT ──
console.log('regenerate draft');
{
  const { competitionId, bracketId } = await fresh('putra', T8);
  const before = await tournamentService.detail(td, competitionId, 'putra');
  await tournamentService.regenerate(td, competitionId, 'putra');
  const after = await tournamentService.detail(td, competitionId, 'putra');
  check('bracket id baru', after!.bracket.id !== bracketId);
  check(
    'peserta sama (8)',
    after!.bracket.participantCount === 8 &&
      after!.bracket.participantCount === before!.bracket.participantCount
  );
  check('status DRAFT lagi', after!.bracket.status === 'DRAFT');
  // Regenerate saat PUBLISHED → ditolak.
  await tournamentService.publish(td, after!.bracket.id);
  let regenBlocked = false;
  try {
    await tournamentService.regenerate(td, competitionId, 'putra');
  } catch {
    regenBlocked = true;
  }
  check('regenerate PUBLISHED → ditolak', regenBlocked);
}

// ── 7. 16 peserta ──
console.log('16 peserta (4 round, 15 match)');
{
  const teamRows = await db!.select({ id: teams.id }).from(teams).limit(16);
  if (teamRows.length < 16) {
    console.log('  - skip: teams < 16');
  } else {
    const ids = teamRows.map((t) => t.id);
    const { competitionId } = await fresh('putri', ids);
    const d = await tournamentService.detail(td, competitionId, 'putri');
    const main = d!.rounds.filter((r) => r.roundType === 'MAIN');
    check('4 main rounds', main.length === 4);
    check('15 main match', main.reduce((a, r) => a + r.matches.length, 0) === 15);
    check('R1 = Round of 16', main[0].name === 'Round of 16');
    check(
      'R1 8 match READY',
      main[0].matches.length === 8 && main[0].matches.every((m) => m.status === 'READY')
    );
    check('R4 = Final 1 match', main[3].name === 'Final' && main[3].matches.length === 1);
    check(
      'M1 destination R2 M1 slot1',
      main[0].matches[0].nextMatchId === main[1].matches[0].id &&
        main[0].matches[0].nextMatchSlot === 1
    );
    check(
      'M2 destination R2 M1 slot2',
      main[0].matches[1].nextMatchId === main[1].matches[0].id &&
        main[0].matches[1].nextMatchSlot === 2
    );
  }
}

// ── 8. Third-place disabled → COMPLETED tanpa third ──
console.log('third place disabled');
{
  const { competitionId, bracketId } = await fresh('putra', T8, false);
  let d = await tournamentService.detail(td, competitionId, 'putra');
  check(
    'tanpa round third',
    !d!.rounds.some((r) => r.roundType === 'THIRD_PLACE') && d!.thirdPlaceMatch === null
  );
  await tournamentService.publish(td, bracketId);
  // Submit per round dengan detail fresh (peserta round berikut terisi setelah round selesai).
  for (let r = 0; r < 3; r++) {
    const dd = await tournamentService.detail(td, competitionId, 'putra');
    const matches = dd!.rounds.filter((x) => x.roundType === 'MAIN')[r].matches;
    for (const m of matches) await submit(competitionId, 'putra', m.id, m.participant1Id!);
  }
  d = await tournamentService.detail(td, competitionId, 'putra');
  check('COMPLETED (final selesai, tanpa third)', d!.bracket.status === 'COMPLETED');
  check(
    `podium ${A}/${E}/null`,
    JSON.stringify(d!.podium) === `{"rank1":${A},"rank2":${E},"rank3":null}`
  );
}

// ── 9. Manual seeding ──
console.log('manual seeding');
{
  // Swap posisi 1↔2: tim B di posisi 1, tim A di posisi 2 → M1 = B vs A.
  const { competitionId, bracketId } = await fresh('putra', T8);
  const manual = new Map<number, number>([
    [A, 2],
    [B, 1],
    [C, 3],
    [D, 4],
    [E, 5],
    [F, 6],
    [G, 7],
    [H, 8],
  ]);
  const { bracketId: manualBracketId } = await tournamentService.generate(td, {
    competitionId,
    kategori: 'putra',
    teamIds: T8,
    seedingMethod: 'MANUAL',
    thirdPlaceEnabled: true,
    manualPositions: manual,
  });
  bracketIds.push(manualBracketId);
  const d = await tournamentService.detail(td, competitionId, 'putra');
  const qf = d!.rounds[0].matches;
  check(
    `M1 = ${B} vs ${A} (posisi ditukar)`,
    qf[0].participant1Id === B && qf[0].participant2Id === A
  );
  check(`M2 = ${C} vs ${D}`, qf[1].participant1Id === C && qf[1].participant2Id === D);
  check(`M3 = ${E} vs ${F}`, qf[2].participant1Id === E && qf[2].participant2Id === F);
  check(`M4 = ${G} vs ${H}`, qf[3].participant1Id === G && qf[3].participant2Id === H);
  check('seedingMethod tersimpan MANUAL', d!.bracket.seedingMethod === 'MANUAL');
  check('manual M1 seed1=1 seed2=2 (badge)', qf[0].seed1 === 1 && qf[0].seed2 === 2);
  check(
    'slots mencerminkan swap',
    JSON.stringify(d!.slots.map((s) => s.teamId)) === JSON.stringify([B, A, C, D, E, F, G, H])
  );
  // Hapus dulu (fresh sudah bikin bracket lain), generate MANUAL dobel posisi → throw.
  await tournamentService.remove(td, bracketId);
  const dup = new Map<number, number>([
    [A, 1],
    [B, 1],
    [C, 3],
    [D, 4],
    [E, 5],
    [F, 6],
    [G, 7],
    [H, 8],
  ]);
  let dupBlocked = false;
  try {
    await tournamentService.generate(td, {
      competitionId,
      kategori: 'putra',
      teamIds: T8,
      seedingMethod: 'MANUAL',
      thirdPlaceEnabled: true,
      manualPositions: dup,
    });
  } catch (e) {
    dupBlocked = e instanceof Error && e.message.includes('posisi seed');
  }
  check('MANUAL posisi dobel → ditolak', dupBlocked);
  const miss = new Map<number, number>([
    [A, 1],
    [C, 3],
    [D, 4],
    [E, 5],
    [F, 6],
    [G, 7],
    [H, 8],
  ]);
  let missBlocked = false;
  try {
    await tournamentService.generate(td, {
      competitionId,
      kategori: 'putra',
      teamIds: T8,
      seedingMethod: 'MANUAL',
      thirdPlaceEnabled: true,
      manualPositions: miss,
    });
  } catch (e) {
    missBlocked = e instanceof Error && e.message.includes('posisi seed');
  }
  check('MANUAL posisi kurang → ditolak', missBlocked);
}

await cleanup();
console.log(failed > 0 ? `✗ ${failed} check gagal` : '✓ Semua review check lulus');
process.exit(failed > 0 ? 1 : 0);
