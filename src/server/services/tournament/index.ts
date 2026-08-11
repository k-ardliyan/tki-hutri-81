/**
 * Tournament service — single elimination engine (thin orchestration di server fns).
 *
 * Generate: struktur dibuat SEKALI (rounds + matches + slots + destination).
 * Result: satu transaction — simpan result, set winner/loser, propagate ke
 * destination match, resolve status, update status bracket.
 * Correction: flow khusus + invalidate downstream dengan konfirmasi.
 */
import { and, eq, inArray, sql } from 'drizzle-orm';
import { calculateBracketSize } from '../../../lib/tournament/bracket-size';
import {
  type DerivedSlot,
  generateBracketStructure,
  type InitialSlot,
} from '../../../lib/tournament/generator';
import { calculatePodium } from '../../../lib/tournament/podium';
import { generateSeedOrder } from '../../../lib/tournament/seeding';
import { nextBracketStatus } from '../../../lib/tournament/status';
import type {
  BracketDetailView,
  BracketStatus,
  MatchStatus,
  SeedingMethod,
  TournamentPodium,
} from '../../../lib/tournament/types';
import {
  assertUniqueParticipants,
  canEditStructure,
  canSubmitResult,
  winnerBelongsToMatch,
} from '../../../lib/tournament/validation';
import type { db as dbClient } from '../../db';
import {
  bracketMatches,
  bracketMatchHistory,
  bracketMatchResults,
  bracketMatchSlots,
  bracketParticipants,
  bracketRounds,
  brackets,
  teams,
} from '../../db/schema';

type Db = NonNullable<typeof dbClient>;
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type Database = Tx;
/** Tipe DB yang dipakai server fns (cast dari assertDb). */
export type TournamentDb = Tx;

export interface GenerateInput {
  competitionId: number;
  kategori: 'putra' | 'putri';
  teamIds: number[];
  seedingMethod: SeedingMethod;
  thirdPlaceEnabled: boolean;
  manualPositions?: Map<number, number>;
}

export interface SubmitResultInput {
  matchId: number;
  winnerId: number;
  score1?: number | null;
  score2?: number | null;
  resultType?: 'NORMAL' | 'WALKOVER' | 'DISQUALIFIED';
  notes?: string | null;
  expectedVersion: number;
  enteredBy?: number | null;
}

export interface CorrectResultInput {
  matchId: number;
  winnerId: number;
  reason?: string | null;
  invalidateDownstream: boolean;
  enteredBy?: number | null;
}

async function loadBracket(database: Database, competitionId: number, kategori: 'putra' | 'putri') {
  const [b] = await database
    .select()
    .from(brackets)
    .where(and(eq(brackets.competitionId, competitionId), eq(brackets.kategori, kategori)))
    .limit(1);
  return b ?? null;
}

/** Ambil semua match sebuah bracket, urut round → match. */
async function loadMatches(database: Database, bracketId: number) {
  return database
    .select()
    .from(bracketMatches)
    .where(eq(bracketMatches.bracketId, bracketId))
    .orderBy(bracketMatches.roundId, bracketMatches.matchNumber);
}

async function loadSlots(database: Database, bracketId: number) {
  return database
    .select({
      id: bracketMatchSlots.id,
      matchId: bracketMatchSlots.matchId,
      slotNumber: bracketMatchSlots.slotNumber,
      sourceType: bracketMatchSlots.sourceType,
      sourceMatchId: bracketMatchSlots.sourceMatchId,
      sourceTeamId: bracketMatchSlots.sourceTeamId,
      participantId: bracketMatchSlots.participantId,
    })
    .from(bracketMatchSlots)
    .innerJoin(bracketMatches, eq(bracketMatches.id, bracketMatchSlots.matchId))
    .where(eq(bracketMatches.bracketId, bracketId));
}

/** Isi satu slot match (participant) + update kolom match, lalu resolve status. */
async function fillSlot(
  database: Database,
  slot: { id: number; matchId: number; slotNumber: number },
  teamId: number | null,
  match: {
    id: number;
    participant1Id: number | null;
    participant2Id: number | null;
    status: MatchStatus;
  }
) {
  await database
    .update(bracketMatchSlots)
    .set({ participantId: teamId })
    .where(eq(bracketMatchSlots.id, slot.id));
  const p1 = slot.slotNumber === 1 ? teamId : match.participant1Id;
  const p2 = slot.slotNumber === 2 ? teamId : match.participant2Id;
  const status: MatchStatus = p1 !== null && p2 !== null ? 'READY' : 'WAITING';
  await database
    .update(bracketMatches)
    .set({ participant1Id: p1, participant2Id: p2, status })
    .where(eq(bracketMatches.id, match.id));
}

/** Propagate winner ke destination match (slot dari next_match). */
async function propagateWinner(
  database: Database,
  match: {
    id: number;
    winnerId: number | null;
    nextMatchId: number | null;
    nextMatchSlot: 1 | 2 | null;
  }
) {
  if (match.nextMatchId === null || match.nextMatchSlot === null || match.winnerId === null) return;
  const [target] = await database
    .select()
    .from(bracketMatches)
    .where(eq(bracketMatches.id, match.nextMatchId))
    .limit(1);
  if (!target) return;
  const [slot] = await database
    .select()
    .from(bracketMatchSlots)
    .where(
      and(
        eq(bracketMatchSlots.matchId, target.id),
        eq(bracketMatchSlots.slotNumber, match.nextMatchSlot)
      )
    )
    .limit(1);
  if (!slot) return;
  await fillSlot(database, slot, match.winnerId, target);
}

/** Propagate loser ke slot LOSER_OF (third place). */
async function propagateLoserToThirdPlace(
  database: Database,
  match: { id: number; loserId: number | null }
) {
  if (match.loserId === null) return;
  const [slot] = await database
    .select({
      id: bracketMatchSlots.id,
      matchId: bracketMatchSlots.matchId,
      slotNumber: bracketMatchSlots.slotNumber,
    })
    .from(bracketMatchSlots)
    .where(
      and(
        eq(bracketMatchSlots.sourceType, 'LOSER_OF'),
        eq(bracketMatchSlots.sourceMatchId, match.id)
      )
    )
    .limit(1);
  if (!slot) return;
  const [target] = await database
    .select()
    .from(bracketMatches)
    .where(eq(bracketMatches.id, slot.matchId))
    .limit(1);
  if (!target) return;
  await fillSlot(database, slot, match.loserId, target);
}

/** Hitung status bracket baru setelah result. */
async function computeBracketStatus(
  database: Database,
  bracketId: number,
  current: BracketStatus,
  thirdPlaceEnabled: boolean
): Promise<BracketStatus> {
  const matches = await loadMatches(database, bracketId);
  const rounds = await database
    .select()
    .from(bracketRounds)
    .where(eq(bracketRounds.bracketId, bracketId));
  const mainRounds = rounds.filter((r) => r.roundType === 'MAIN');
  const finalRound =
    mainRounds.sort((a, b) => a.sortOrder - b.sortOrder)[mainRounds.length - 1] ?? null;
  const thirdRound = rounds.find((r) => r.roundType === 'THIRD_PLACE') ?? null;
  const finalMatch = finalRound
    ? (matches.find((m) => m.roundId === finalRound.id && m.matchNumber === 1) ?? null)
    : null;
  const thirdPlaceMatch = thirdRound
    ? (matches.find((m) => m.roundId === thirdRound.id) ?? null)
    : null;
  const hasAnyResult = matches.some(
    (m) => m.status === 'COMPLETED' || m.status === 'AUTO_ADVANCED'
  );
  const finalCompleted = finalMatch
    ? finalMatch.status === 'COMPLETED' || finalMatch.status === 'AUTO_ADVANCED'
    : false;
  const thirdPlaceCompleted = thirdPlaceMatch
    ? thirdPlaceMatch.status === 'COMPLETED' || thirdPlaceMatch.status === 'AUTO_ADVANCED'
    : false;
  return nextBracketStatus(current, {
    published: false,
    hasAnyResult,
    finalCompleted,
    thirdPlaceEnabled,
    thirdPlaceCompleted,
  });
}

/** Isi ulang slot match (hanya yang di-`onlyIds`) dari source-nya (setelah reset/invalidate). */
async function recomputeAll(database: Database, bracketId: number, onlyIds?: Set<number>) {
  const matches = await loadMatches(database, bracketId);
  const slots = await loadSlots(database, bracketId);
  const byId = new Map(matches.map((m) => [m.id, m]));
  const slotsByMatch = new Map<number, typeof slots>();
  for (const s of slots) {
    const list = slotsByMatch.get(s.matchId) ?? [];
    list.push(s);
    slotsByMatch.set(s.matchId, list);
  }

  // Topological: main rounds asc, lalu third place (round terakhir).
  const ordered = [...matches].sort((a, b) => {
    const ra = a.roundId;
    const rb = b.roundId;
    if (ra === rb) return a.matchNumber - b.matchNumber;
    return ra - rb;
  });

  for (const m of ordered) {
    if (onlyIds && !onlyIds.has(m.id)) continue;
    const mslots = slotsByMatch.get(m.id) ?? [];
    const resolved: Array<{ slotNumber: number; teamId: number | null }> = [];
    for (const s of mslots) {
      let teamId: number | null = null;
      if (s.sourceType === 'PARTICIPANT') teamId = s.sourceTeamId;
      else if (s.sourceType === 'BYE') teamId = null;
      else if (s.sourceType === 'WINNER_OF' && s.sourceMatchId !== null) {
        const src = byId.get(s.sourceMatchId);
        teamId = src ? src.winnerId : null;
      } else if (s.sourceType === 'LOSER_OF' && s.sourceMatchId !== null) {
        const src = byId.get(s.sourceMatchId);
        teamId = src ? src.loserId : null;
      }
      resolved.push({ slotNumber: s.slotNumber, teamId });
      await database
        .update(bracketMatchSlots)
        .set({ participantId: teamId })
        .where(eq(bracketMatchSlots.id, s.id));
    }
    const s1 = resolved.find((r) => r.slotNumber === 1)?.teamId ?? null;
    const s2 = resolved.find((r) => r.slotNumber === 2)?.teamId ?? null;
    const byeSlot = mslots.find((s) => s.sourceType === 'BYE');
    const hasBye = byeSlot !== undefined;
    let status: MatchStatus;
    let winnerId: number | null = null;
    let loserId: number | null = null;
    if (hasBye && (s1 !== null) !== (s2 !== null)) {
      status = 'AUTO_ADVANCED';
      winnerId = s1 ?? s2;
      loserId = null;
    } else if (s1 !== null && s2 !== null) {
      status = 'READY';
    } else {
      status = 'WAITING';
    }
    await database
      .update(bracketMatches)
      .set({ participant1Id: s1, participant2Id: s2, winnerId, loserId, status })
      .where(eq(bracketMatches.id, m.id));
    // Sync byId for downstream references.
    byId.set(m.id, { ...m, participant1Id: s1, participant2Id: s2, winnerId, loserId, status });
  }
}

export const tournamentService = {
  /** Generate struktur bracket lengkap (sekali). DRAFT bisa regenerate. */
  async generate(database: Database, input: GenerateInput) {
    if (input.teamIds.length < 2) throw new Error('Minimal 2 peserta untuk membuat bagan');
    assertUniqueParticipants(input.teamIds);

    const existing = await loadBracket(database, input.competitionId, input.kategori);
    if (existing && existing.status !== 'DRAFT')
      throw new Error('Bagan sudah dipublish. Reset/regenerate dulu untuk mengubah struktur.');

    const bracketSize = calculateBracketSize(input.teamIds.length);
    const structure = generateBracketStructure(input.teamIds.length, input.thirdPlaceEnabled);
    const participants = input.teamIds.map((teamId) => ({ teamId, nama: String(teamId) }));
    const seedOrder = generateSeedOrder(input.seedingMethod, participants, input.manualPositions);

    return database.transaction(async (tx) => {
      // Buang bracket DRAFT lama (cascade menghapus children).
      if (existing) {
        await tx.delete(brackets).where(eq(brackets.id, existing.id));
      }
      const [bracket] = await tx
        .insert(brackets)
        .values({
          competitionId: input.competitionId,
          kategori: input.kategori,
          format: 'SINGLE_ELIMINATION',
          status: 'DRAFT',
          seedingMethod: input.seedingMethod,
          thirdPlaceEnabled: input.thirdPlaceEnabled,
          participantCount: input.teamIds.length,
          bracketSize,
        })
        .returning();
      const bracketId = bracket.id;

      await tx.insert(bracketParticipants).values(
        seedOrder.map((teamId, i) => ({
          bracketId,
          teamId,
          seed: i + 1,
          initialSlot: i + 1,
          status: 'ACTIVE' as const,
        }))
      );

      const roundIds = new Map<number, number>();
      for (const r of structure.rounds) {
        const [row] = await tx
          .insert(bracketRounds)
          .values({
            bracketId,
            roundNumber: r.roundNumber,
            roundType: r.roundType,
            name: r.name,
            sortOrder: r.roundNumber,
          })
          .returning();
        roundIds.set(r.roundNumber, row.id);
      }

      // Slot peserta: seed order 1..N diisi berurutan; sisanya BYE.
      // Shift: match BYE-BYE tidak boleh ada (N >= size/2 selalu → bisa dihindari).
      const slotTeams: Array<number | null> = Array(bracketSize).fill(null);
      for (let i = 0; i < seedOrder.length; i++) slotTeams[i] = seedOrder[i];
      for (let j = structure.rounds[0].matchCount; j >= 1; j--) {
        const s1 = 2 * j - 2;
        const s2 = 2 * j - 1;
        if (slotTeams[s1] === null && slotTeams[s2] === null) {
          const donor = slotTeams.findIndex((v, idx) => idx % 2 === 1 && v !== null);
          if (donor >= 0) {
            slotTeams[s1] = slotTeams[donor];
            slotTeams[donor] = null;
          }
        }
      }

      // Insert matches (nextMatchId diisi setelah semua insert).
      const insertedMatches: Array<{ id: number; roundNumber: number; matchNumber: number }> = [];
      for (const m of structure.matches) {
        const isFirst = m.roundNumber === 1;
        const s1Team =
          isFirst && m.slot1.kind === 'PARTICIPANT'
            ? (slotTeams[(m.slot1 as { seedPosition: number }).seedPosition - 1] ?? null)
            : null;
        const s2Team =
          isFirst && m.slot2.kind === 'PARTICIPANT'
            ? (slotTeams[(m.slot2 as { seedPosition: number }).seedPosition - 1] ?? null)
            : null;
        const [row] = await tx
          .insert(bracketMatches)
          .values({
            bracketId,
            roundId: roundIds.get(m.roundNumber)!,
            matchNumber: m.matchNumber,
            participant1Id: s1Team,
            participant2Id: s2Team,
            status: s1Team !== null && s2Team !== null ? 'READY' : 'WAITING',
            version: 1,
          })
          .returning();
        insertedMatches.push({
          id: row.id,
          roundNumber: m.roundNumber,
          matchNumber: m.matchNumber,
        });
      }

      const matchIdByRoundNumber = (rn: number, mn: number) =>
        insertedMatches.find((x) => x.roundNumber === rn && x.matchNumber === mn)?.id ?? null;

      // Slots + nextMatch wiring.
      for (const m of structure.matches) {
        const matchId = matchIdByRoundNumber(m.roundNumber, m.matchNumber)!;
        const isFirst = m.roundNumber === 1;
        const src = (slot: InitialSlot | DerivedSlot, slotIndex: number) => {
          if (slot.kind === 'PARTICIPANT') {
            const tid = isFirst ? (slotTeams[slotIndex] ?? null) : null;
            if (tid === null)
              return { sourceType: 'BYE' as const, sourceTeamId: null, sourceMatchId: null };
            return { sourceType: 'PARTICIPANT' as const, sourceTeamId: tid, sourceMatchId: null };
          }
          if (slot.kind === 'BYE')
            return { sourceType: 'BYE' as const, sourceTeamId: null, sourceMatchId: null };
          const st = slot.kind === 'WINNER_OF' ? ('WINNER_OF' as const) : ('LOSER_OF' as const);
          // Third place (round terakhir) merujuk ke semifinal; main round merujuk ke round sebelumnya.
          const srcRound = m.roundType === 'THIRD_PLACE' ? m.roundNumber - 2 : m.roundNumber - 1;
          return {
            sourceType: st,
            sourceTeamId: null,
            sourceMatchId: matchIdByRoundNumber(srcRound, slot.matchNumber),
          };
        };
        const slot1Source = src(m.slot1, 2 * m.matchNumber - 2);
        const slot2Source = src(m.slot2, 2 * m.matchNumber - 1);

        await tx.insert(bracketMatchSlots).values([
          {
            matchId,
            slotNumber: 1,
            sourceType: slot1Source.sourceType,
            sourceMatchId: slot1Source.sourceMatchId,
            sourceTeamId: slot1Source.sourceTeamId,
            participantId: m.roundNumber === 1 ? slot1Source.sourceTeamId : null,
          },
          {
            matchId,
            slotNumber: 2,
            sourceType: slot2Source.sourceType,
            sourceMatchId: slot2Source.sourceMatchId,
            sourceTeamId: slot2Source.sourceTeamId,
            participantId: m.roundNumber === 1 ? slot2Source.sourceTeamId : null,
          },
        ]);

        if (m.nextMatchNumber !== null && m.nextRoundNumber !== null) {
          await tx
            .update(bracketMatches)
            .set({
              nextMatchId: matchIdByRoundNumber(m.nextRoundNumber, m.nextMatchNumber),
              nextMatchSlot: m.nextSlot,
            })
            .where(eq(bracketMatches.id, matchId));
        }
      }

      // Resolve BYE round 1 (auto advance + catat result BYE).
      for (const m of structure.matches.filter((x) => x.roundNumber === 1)) {
        const matchId = matchIdByRoundNumber(1, m.matchNumber)!;
        const [row] = await tx
          .select()
          .from(bracketMatches)
          .where(eq(bracketMatches.id, matchId))
          .limit(1);
        if (!row) continue;
        const byeSlot =
          (row.participant1Id === null && row.participant2Id !== null) ||
          (row.participant2Id === null && row.participant1Id !== null);
        if (byeSlot) {
          const winnerId = row.participant1Id ?? row.participant2Id;
          await tx
            .update(bracketMatches)
            .set({ winnerId, loserId: null, status: 'AUTO_ADVANCED' })
            .where(eq(bracketMatches.id, matchId));
          await tx
            .insert(bracketMatchResults)
            .values({ matchId, winnerId: winnerId!, resultType: 'BYE' });
          await propagateWinner(tx, {
            id: matchId,
            winnerId,
            nextMatchId: row.nextMatchId,
            nextMatchSlot: row.nextMatchSlot,
          });
        }
      }

      return { bracketId };
    });
  },

  /** Submit hasil match (satu transaction, propagate otomatis). */
  async submitResult(database: Database, input: SubmitResultInput) {
    return database.transaction(async (tx) => {
      const [match] = await tx
        .select()
        .from(bracketMatches)
        .where(eq(bracketMatches.id, input.matchId))
        .limit(1);
      if (!match) throw new Error('Match tidak ditemukan');
      const [bracket] = await tx
        .select()
        .from(brackets)
        .where(eq(brackets.id, match.bracketId))
        .limit(1);
      if (!bracket) throw new Error('Bracket tidak ditemukan');
      if (bracket.status === 'DRAFT') throw new Error('Publish bagan dulu sebelum input hasil');
      if (match.status === 'COMPLETED' || match.status === 'AUTO_ADVANCED')
        throw new Error('Match sudah selesai. Gunakan koreksi hasil.');
      if (!canSubmitResult(match)) throw new Error('Match belum siap menerima hasil');
      if (!winnerBelongsToMatch(match, input.winnerId))
        throw new Error('Pemenang harus peserta match ini');
      if (input.expectedVersion !== match.version)
        throw new Error('Data pertandingan sudah diubah admin lain. Silakan refresh.');

      // Idempotent guard tidak relevan (status COMPLETED ditolak di atas).

      const loserId =
        match.participant1Id === input.winnerId ? match.participant2Id : match.participant1Id;
      await tx.insert(bracketMatchResults).values({
        matchId: match.id,
        participant1Score: input.score1 ?? null,
        participant2Score: input.score2 ?? null,
        winnerId: input.winnerId,
        resultType: input.resultType ?? 'NORMAL',
        notes: input.notes ?? null,
        enteredBy: input.enteredBy ?? null,
      });
      await tx
        .update(bracketMatches)
        .set({ winnerId: input.winnerId, loserId, status: 'COMPLETED', version: match.version + 1 })
        .where(eq(bracketMatches.id, match.id));

      const updatedMatch = { ...match, winnerId: input.winnerId, loserId };
      await propagateWinner(tx, updatedMatch);
      await propagateLoserToThirdPlace(tx, updatedMatch);

      const status = await computeBracketStatus(
        tx,
        match.bracketId,
        bracket.status,
        bracket.thirdPlaceEnabled
      );
      await tx
        .update(brackets)
        .set({ status, updatedAt: new Date() })
        .where(eq(brackets.id, bracket.id));
      return { ok: true, nextStatus: status };
    });
  },

  /** Koreksi hasil match COMPLETED; invalidate downstream bila sudah dimainkan. */
  async correctResult(database: Database, input: CorrectResultInput) {
    return database.transaction(async (tx) => {
      const [match] = await tx
        .select()
        .from(bracketMatches)
        .where(eq(bracketMatches.id, input.matchId))
        .limit(1);
      if (!match) throw new Error('Match tidak ditemukan');
      if (match.status !== 'COMPLETED' && match.status !== 'AUTO_ADVANCED')
        throw new Error('Match belum selesai. Gunakan submit biasa.');
      if (match.status === 'AUTO_ADVANCED') throw new Error('Match BYE tidak bisa dikoreksi');
      if (!winnerBelongsToMatch(match, input.winnerId))
        throw new Error('Pemenang harus peserta match ini');
      const [bracket] = await tx
        .select()
        .from(brackets)
        .where(eq(brackets.id, match.bracketId))
        .limit(1);
      if (!bracket) throw new Error('Bracket tidak ditemukan');

      // Cek downstream sudah dimainkan?
      const affected = await countPlayedDownstream(tx, match.bracketId, match.id);
      if (affected > 0 && !input.invalidateDownstream) {
        throw new Error(
          `Koreksi ini membatalkan ${affected} hasil pertandingan berikutnya. Konfirmasi invalidate dulu.`
        );
      }

      await tx.insert(bracketMatchHistory).values({
        matchId: match.id,
        oldWinnerId: match.winnerId,
        newWinnerId: input.winnerId,
        changedBy: input.enteredBy ?? null,
        reason: input.reason ?? null,
      });

      const loserId =
        match.participant1Id === input.winnerId ? match.participant2Id : match.participant1Id;
      await tx
        .update(bracketMatches)
        .set({ winnerId: input.winnerId, loserId, status: 'COMPLETED', version: match.version + 1 })
        .where(eq(bracketMatches.id, match.id));

      // Selalu recompute downstream: koreksi pemenang harus propagate ke slot
      // berikutnya (baik downstream WAITING maupun dimainkan → invalidate).
      const downstream = new Set(await collectDownstreamIds(tx, match.bracketId, match.id));
      if (downstream.size > 0) {
        await tx
          .delete(bracketMatchHistory)
          .where(inArray(bracketMatchHistory.matchId, [...downstream]));
        await tx
          .delete(bracketMatchResults)
          .where(inArray(bracketMatchResults.matchId, [...downstream]));
        for (const id of downstream) {
          await tx
            .update(bracketMatches)
            .set({
              participant1Id: null,
              participant2Id: null,
              winnerId: null,
              loserId: null,
              status: 'WAITING',
            })
            .where(eq(bracketMatches.id, id));
          const slots = await tx
            .select()
            .from(bracketMatchSlots)
            .where(eq(bracketMatchSlots.matchId, id));
          for (const s of slots) {
            await tx
              .update(bracketMatchSlots)
              .set({ participantId: null })
              .where(eq(bracketMatchSlots.id, s.id));
          }
        }
        await recomputeAll(tx, match.bracketId, downstream);
        // Re-apply winner match ini (recomputeAll mungkin menimpa status).
        await tx
          .update(bracketMatches)
          .set({
            winnerId: input.winnerId,
            loserId,
            status: 'COMPLETED',
            version: match.version + 1,
          })
          .where(eq(bracketMatches.id, match.id));
      }

      const status = await computeBracketStatus(
        tx,
        match.bracketId,
        bracket.status,
        bracket.thirdPlaceEnabled
      );
      await tx
        .update(brackets)
        .set({ status, updatedAt: new Date() })
        .where(eq(brackets.id, bracket.id));
      return { ok: true, invalidated: affected };
    });
  },

  async publish(database: Database, bracketId: number) {
    const [b] = await database.select().from(brackets).where(eq(brackets.id, bracketId)).limit(1);
    if (!b) throw new Error('Bracket tidak ditemukan');
    if (!canEditStructure(b.status as BracketStatus))
      throw new Error('Hanya bracket DRAFT yang bisa dipublish');
    await database
      .update(brackets)
      .set({ status: 'PUBLISHED', updatedAt: new Date() })
      .where(eq(brackets.id, bracketId));
    return { ok: true };
  },

  async resetResults(database: Database, bracketId: number) {
    await resetResultsFn(database, bracketId);
    return { ok: true };
  },

  async regenerate(
    database: Database,
    competitionId: number,
    kategori: 'putra' | 'putri',
    manualPositions?: Map<number, number>
  ) {
    const b = await loadBracket(database, competitionId, kategori);
    if (!b) throw new Error('Bracket tidak ditemukan');
    if (!canEditStructure(b.status as BracketStatus))
      throw new Error('Hanya bracket DRAFT yang bisa regenerate');
    const participants = await database
      .select()
      .from(bracketParticipants)
      .where(eq(bracketParticipants.bracketId, b.id))
      .orderBy(bracketParticipants.seed);
    const teamIds = participants.map((p) => p.teamId);
    const method = b.seedingMethod as SeedingMethod;
    // MANUAL tanpa posisi baru → pertahankan urutan saat ini (seed → posisi).
    if (method === 'MANUAL' && !manualPositions) {
      manualPositions = new Map(participants.map((p) => [p.teamId, p.seed]));
    }
    return tournamentService.generate(database, {
      competitionId,
      kategori,
      teamIds,
      seedingMethod: method,
      thirdPlaceEnabled: b.thirdPlaceEnabled,
      manualPositions,
    });
  },

  /** Hapus total. */
  async remove(database: Database, bracketId: number) {
    await database.delete(brackets).where(eq(brackets.id, bracketId));
    return { ok: true };
  },

  /** Load detail lengkap untuk frontend (normalized). */
  async detail(
    database: Database,
    competitionId: number,
    kategori: 'putra' | 'putri'
  ): Promise<BracketDetailView | null> {
    const b = await loadBracket(database, competitionId, kategori);
    if (!b) return null;
    const rounds = await database
      .select()
      .from(bracketRounds)
      .where(eq(bracketRounds.bracketId, b.id))
      .orderBy(bracketRounds.sortOrder);
    const matches = await loadMatches(database, b.id);
    const participants = await database
      .select({
        teamId: bracketParticipants.teamId,
        nama: teams.nama,
        seed: bracketParticipants.seed,
      })
      .from(bracketParticipants)
      .innerJoin(teams, eq(teams.id, bracketParticipants.teamId))
      .where(eq(bracketParticipants.bracketId, b.id))
      .orderBy(bracketParticipants.seed);

    const teamNama = new Map<string, string>();
    const seedByTeam = new Map<number, number>();
    for (const p of participants) {
      teamNama.set(String(p.teamId), p.nama);
      seedByTeam.set(p.teamId, p.seed);
    }

    const seeds = participants.map((p) => ({ seed: p.seed, teamId: p.teamId, nama: p.nama }));

    // Peta slot round 1 (1..bracketSize) — mencerminkan BYE shift (slot ≠ seed).
    const firstRound = rounds.find((r) => r.roundType === 'MAIN' && r.roundNumber === 1) ?? null;
    const firstRoundMatches = firstRound
      ? matches
          .filter((m) => m.roundId === firstRound.id)
          .sort((a, b) => a.matchNumber - b.matchNumber)
      : [];
    const slots = firstRoundMatches
      .flatMap((m) => [
        { slot: 2 * m.matchNumber - 1, teamId: m.participant1Id },
        { slot: 2 * m.matchNumber, teamId: m.participant2Id },
      ])
      .map((s) => ({
        slot: s.slot,
        teamId: s.teamId,
        seed: s.teamId !== null ? (seedByTeam.get(s.teamId) ?? null) : null,
        nama: s.teamId !== null ? (teamNama.get(String(s.teamId)) ?? null) : null,
        bye: s.teamId === null,
      }));

    const mainRounds = rounds.filter((r) => r.roundType === 'MAIN');
    const finalRound = mainRounds[mainRounds.length - 1];
    const finalMatch = finalRound
      ? (matches.find((m) => m.roundId === finalRound.id && m.matchNumber === 1) ?? null)
      : null;
    const thirdRound = rounds.find((r) => r.roundType === 'THIRD_PLACE') ?? null;
    const thirdPlaceMatch = thirdRound
      ? (matches.find((m) => m.roundId === thirdRound.id) ?? null)
      : null;

    const podium: TournamentPodium = calculatePodium(finalMatch, thirdPlaceMatch);

    const roundViews = rounds.map((r) => ({
      id: r.id,
      roundNumber: r.roundNumber,
      roundType: r.roundType,
      name: r.name,
      matches: matches
        .filter((m) => m.roundId === r.id)
        .sort((a, b) => a.matchNumber - b.matchNumber)
        .map((m) => ({
          id: m.id,
          matchNumber: m.matchNumber,
          participant1Id: m.participant1Id,
          participant2Id: m.participant2Id,
          participant1Nama:
            m.participant1Id !== null ? (teamNama.get(String(m.participant1Id)) ?? null) : null,
          participant2Nama:
            m.participant2Id !== null ? (teamNama.get(String(m.participant2Id)) ?? null) : null,
          seed1: m.participant1Id !== null ? (seedByTeam.get(m.participant1Id) ?? null) : null,
          seed2: m.participant2Id !== null ? (seedByTeam.get(m.participant2Id) ?? null) : null,
          winnerId: m.winnerId,
          loserId: m.loserId,
          status: m.status,
          nextMatchId: m.nextMatchId,
          nextMatchSlot: m.nextMatchSlot,
          version: m.version,
        })),
    }));

    return {
      bracket: {
        id: b.id,
        status: b.status,
        format: b.format,
        seedingMethod: b.seedingMethod,
        thirdPlaceEnabled: b.thirdPlaceEnabled,
        participantCount: b.participantCount,
        bracketSize: b.bracketSize,
      },
      rounds: roundViews,
      thirdPlaceMatch: thirdPlaceMatch
        ? {
            id: thirdPlaceMatch.id,
            matchNumber: thirdPlaceMatch.matchNumber,
            participant1Id: thirdPlaceMatch.participant1Id,
            participant2Id: thirdPlaceMatch.participant2Id,
            participant1Nama:
              thirdPlaceMatch.participant1Id !== null
                ? (teamNama.get(String(thirdPlaceMatch.participant1Id)) ?? null)
                : null,
            participant2Nama:
              thirdPlaceMatch.participant2Id !== null
                ? (teamNama.get(String(thirdPlaceMatch.participant2Id)) ?? null)
                : null,
            seed1:
              thirdPlaceMatch.participant1Id !== null
                ? (seedByTeam.get(thirdPlaceMatch.participant1Id) ?? null)
                : null,
            seed2:
              thirdPlaceMatch.participant2Id !== null
                ? (seedByTeam.get(thirdPlaceMatch.participant2Id) ?? null)
                : null,
            winnerId: thirdPlaceMatch.winnerId,
            loserId: thirdPlaceMatch.loserId,
            status: thirdPlaceMatch.status,
            nextMatchId: null,
            nextMatchSlot: null,
            version: thirdPlaceMatch.version,
          }
        : null,
      podium,
      participants: participants.map((p) => ({ teamId: p.teamId, nama: p.nama })),
      seeds,
      slots,
    };
  },
};

async function resetResultsFn(database: Database, bracketId: number) {
  await database
    .delete(bracketMatchHistory)
    .where(sql`match_id in (select id from bracket_matches where bracket_id = ${bracketId})`);
  await database
    .delete(bracketMatchResults)
    .where(sql`match_id in (select id from bracket_matches where bracket_id = ${bracketId})`);
  await recomputeAll(database, bracketId);
  await database
    .update(brackets)
    .set({ status: 'PUBLISHED', updatedAt: new Date() })
    .where(eq(brackets.id, bracketId));
}

/** Kumpulkan id match downstream (via next-match chain + slot LOSER_OF), minus match sumber. */
async function collectDownstreamIds(
  database: Database,
  bracketId: number,
  fromMatchId: number
): Promise<number[]> {
  const all = await loadMatches(database, bracketId);
  const byId = new Map(all.map((m) => [m.id, m]));
  const visited = new Set<number>();
  const queue: number[] = [];
  const start = byId.get(fromMatchId);
  if (start?.nextMatchId) queue.push(start.nextMatchId);
  const loserSlots = await database
    .select({ matchId: bracketMatchSlots.matchId })
    .from(bracketMatchSlots)
    .where(
      and(
        eq(bracketMatchSlots.sourceType, 'LOSER_OF'),
        eq(bracketMatchSlots.sourceMatchId, fromMatchId)
      )
    );
  for (const s of loserSlots) queue.push(s.matchId);

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const m = byId.get(id);
    if (!m) continue;
    if (m.nextMatchId) queue.push(m.nextMatchId);
  }
  return [...visited];
}

/** Hitung berapa match downstream (via next_match chain) yang sudah dimainkan. */
async function countPlayedDownstream(
  database: Database,
  bracketId: number,
  fromMatchId: number
): Promise<number> {
  const ids = await collectDownstreamIds(database, bracketId, fromMatchId);
  if (ids.length === 0) return 0;
  const matches = await loadMatches(database, bracketId);
  const byId = new Map(matches.map((m) => [m.id, m]));
  let played = 0;
  for (const id of ids) {
    const m = byId.get(id);
    if (m && (m.status === 'COMPLETED' || m.status === 'AUTO_ADVANCED')) played++;
  }
  return played;
}
