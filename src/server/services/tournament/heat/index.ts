/**
 * Heat elimination service — Stage → Session → Participants → Results.
 *
 * Lifecycle:
 * - generateHeat: buat bracket DRAFT + semua stage (PENDING, stage-1 ACTIVE) +
 *   session stage-1 + assignment peserta. Stage berikutnya TBD (dibuat saat finalize).
 * - publishHeat: kunci konfigurasi (DRAFT → PUBLISHED).
 * - submitSessionResult: simpan rank per participant, session COMPLETED.
 * - finalizeStage: semua session stage selesai → hitung qualifier →
 *   buat session + assignment stage berikutnya (atau podium final → COMPLETED).
 * - correctSessionResult: koreksi hasil; downstream di-invalidate bila perlu.
 */
import { and, eq, inArray } from 'drizzle-orm';
import type {
  HeatConfigInput,
  HeatDetailView,
  HeatResultMode,
  HeatResultStatus,
  HeatSeedingMethod,
  QualifiedParticipant,
  ResolvedRank,
} from '../../../../lib/tournament/heat-elimination';
import {
  assignToSessions,
  autoGenerateStages,
  calculateHeatPodium,
  qualify,
  resolveRanks,
  validateHeatConfig,
} from '../../../../lib/tournament/heat-elimination';
import {
  bracketSessionParticipants,
  bracketSessionResultHistory,
  bracketSessionResults,
  bracketSessions,
  bracketStages,
  brackets,
  teams,
} from '../../../db/schema';
import type { TournamentDb } from '../index';

type Database = TournamentDb;

export interface GenerateHeatInput {
  competitionId: number;
  kategori: 'putra' | 'putri';
  teamIds: number[];
  config: HeatConfigInput;
  seedingMethod: HeatSeedingMethod;
  /** MANUAL assignment stage-1: teamId → sessionNumber. */
  manualSessions?: Map<number, number>;
}

export interface SessionResultSubmit {
  participantId: number;
  rank?: number | null;
  timeMs?: number | null;
  score?: number | null;
  resultStatus?: HeatResultStatus;
  notes?: string | null;
}

/** Status peserta yang tidak dapat lolos (tanpa rank). */
const NON_QUALIFIABLE = new Set<HeatResultStatus>(['DISQUALIFIED', 'DNS', 'DNF', 'WALKOVER']);

/**
 * Resolve hasil sesi: peserta ber-rank diselesaikan via resolveRanks; peserta
 * tanpa rank (DNS/DSQ/DNF/WO) tetap tercatat dengan rank null. Validasi:
 * setiap peserta wajib punya input; peserta tanpa rank wajib berstatus
 * non-qualifiable. Return map participantId → {rank, meta}.
 */
function resolveSessionResults(
  participants: Array<{ participantId: number }>,
  inputs: SessionResultSubmit[],
  resultMode: HeatResultMode
): Map<number, { rank: number | null; meta: SessionResultSubmit }> {
  const byId = new Map(inputs.map((r) => [r.participantId, r]));
  for (const p of participants) {
    if (!byId.has(p.participantId))
      throw new Error(`Peserta ${p.participantId} tidak memiliki hasil`);
  }
  const ranked = resolveRanks(
    inputs.map((r) => ({
      participantId: r.participantId,
      rank: r.rank,
      timeMs: r.timeMs,
      score: r.score,
      resultStatus: r.resultStatus,
    })),
    resultMode
  );
  const out = new Map<number, { rank: number | null; meta: SessionResultSubmit }>();
  for (const r of ranked)
    out.set(r.participantId, { rank: r.rank, meta: byId.get(r.participantId)! });
  for (const p of participants) {
    if (out.has(p.participantId)) continue;
    const meta = byId.get(p.participantId)!;
    if (!NON_QUALIFIABLE.has(meta.resultStatus ?? 'NORMAL'))
      throw new Error(
        `Peserta ${p.participantId} wajib diberi peringkat atau status gugur (DNS/DSQ/DNF/WO)`
      );
    out.set(p.participantId, { rank: null, meta });
  }
  return out;
}

export interface SubmitSessionInput {
  sessionId: number;
  expectedVersion: number;
  results: SessionResultSubmit[];
  enteredBy?: string | null;
}

export interface CorrectSessionInput {
  sessionId: number;
  reason?: string | null;
  invalidateDownstream: boolean;
  expectedVersion: number;
  results: SessionResultSubmit[];
  enteredBy?: string | null;
}

/** Nama default sesi. */
function sessionName(n: number): string {
  return `Sesi ${n}`;
}

/** Load bracket + semua stage urut. */
async function loadStages(database: Database, bracketId: number) {
  return database
    .select()
    .from(bracketStages)
    .where(eq(bracketStages.bracketId, bracketId))
    .orderBy(bracketStages.sortOrder);
}

async function loadSessions(database: Database, stageId: number) {
  return database
    .select()
    .from(bracketSessions)
    .where(eq(bracketSessions.stageId, stageId))
    .orderBy(bracketSessions.sessionNumber);
}

async function loadParticipants(database: Database, sessionId: number) {
  return database
    .select()
    .from(bracketSessionParticipants)
    .where(eq(bracketSessionParticipants.sessionId, sessionId))
    .orderBy(bracketSessionParticipants.slotNumber);
}

async function loadResults(database: Database, sessionId: number) {
  return database
    .select()
    .from(bracketSessionResults)
    .where(eq(bracketSessionResults.sessionId, sessionId))
    .orderBy(bracketSessionResults.rank);
}

/** Siapkan session + participant assignment untuk satu stage. */
async function createStageSessions(
  database: Database,
  stageId: number,
  sessionSizes: number[],
  participantIds: number[],
  seedingMethod: HeatSeedingMethod,
  manualSessions?: Map<number, number>
): Promise<void> {
  const buckets = assignToSessions({
    participantIds,
    sessionSizes,
    method: seedingMethod,
    manualSessions,
  });
  for (let i = 0; i < buckets.length; i++) {
    const [session] = await database
      .insert(bracketSessions)
      .values({
        stageId,
        sessionNumber: i + 1,
        name: sessionName(i + 1),
        status: 'READY',
        version: 1,
      })
      .returning();
    const members = buckets[i];
    await database.insert(bracketSessionParticipants).values(
      members.map((teamId, slotIndex) => ({
        sessionId: session.id,
        participantId: teamId,
        slotNumber: slotIndex + 1,
        seed: slotIndex + 1,
        sourceType: 'INITIAL' as const,
      }))
    );
  }
}

/**
 * Generate bracket heat (AUTO stage) — DRAFT. Stage 1 punya session + assignment;
 * stage berikutnya PENDING (TBD, dibuat saat finalize).
 */
export const heatService = {
  async generate(database: Database, input: GenerateHeatInput) {
    const { competitionId, kategori, teamIds, config, seedingMethod, manualSessions } = input;
    if (teamIds.length < 2) throw new Error('Minimal 2 peserta untuk membuat bagan');
    if (new Set(teamIds).size !== teamIds.length)
      throw new Error('Peserta tidak boleh dobel dalam satu bagan');
    const validation = validateHeatConfig(config);
    if (!validation.ok) throw new Error(validation.errors.join('; '));

    const existing = await database
      .select()
      .from(brackets)
      .where(and(eq(brackets.competitionId, competitionId), eq(brackets.kategori, kategori)))
      .limit(1);
    if (existing.length && existing[0].status !== 'DRAFT')
      throw new Error('Bagan sudah dipublish. Reset/regenerate dulu untuk mengubah struktur.');

    const stages = autoGenerateStages(config);
    const bracketSize = teamIds.length;

    return database.transaction(async (tx) => {
      if (existing.length) {
        await tx.delete(brackets).where(eq(brackets.id, existing[0].id));
      }
      const [bracket] = await tx
        .insert(brackets)
        .values({
          competitionId,
          kategori,
          format: 'HEAT_ELIMINATION',
          status: 'DRAFT',
          seedingMethod,
          thirdPlaceEnabled: false,
          participantCount: teamIds.length,
          bracketSize,
        })
        .returning();

      // Simpan semua stage; stage 1 ACTIVE.
      for (const s of stages) {
        await tx
          .insert(bracketStages)
          .values({
            bracketId: bracket.id,
            stageNumber: s.stageNumber,
            name: s.name,
            teamsPerSession: s.teamsPerSession,
            advancementMode: s.advancementMode,
            qualifiersPerSession: s.qualifiersPerSession,
            resultMode: s.resultMode,
            isFinal: s.isFinal,
            status: s.stageNumber === 1 ? 'ACTIVE' : 'PENDING',
            sortOrder: s.stageNumber,
          })
          .returning();
      }

      // Stage 1: session + assignment.
      const firstStage = stages[0];
      const [stage1Row] = await tx
        .select()
        .from(bracketStages)
        .where(and(eq(bracketStages.bracketId, bracket.id), eq(bracketStages.stageNumber, 1)))
        .limit(1);
      await createStageSessions(
        tx,
        stage1Row.id,
        firstStage.sessionSizes,
        teamIds,
        seedingMethod,
        manualSessions
      );

      return { bracketId: bracket.id };
    });
  },

  async publish(database: Database, bracketId: number) {
    const [b] = await database.select().from(brackets).where(eq(brackets.id, bracketId)).limit(1);
    if (!b) throw new Error('Bracket tidak ditemukan');
    if (b.status !== 'DRAFT') throw new Error('Hanya bracket DRAFT yang bisa dipublish');
    await database
      .update(brackets)
      .set({ status: 'PUBLISHED', updatedAt: new Date() })
      .where(eq(brackets.id, bracketId));
    return { ok: true };
  },

  /**
   * Submit hasil satu session. Semua peserta session wajib diberi hasil;
   * rank di-resolve sesuai result mode stage. Optimistic lock via session.version.
   */
  async submitSessionResult(database: Database, input: SubmitSessionInput) {
    return database.transaction(async (tx) => {
      const [session] = await tx
        .select()
        .from(bracketSessions)
        .where(eq(bracketSessions.id, input.sessionId))
        .limit(1);
      if (!session) throw new Error('Sesi tidak ditemukan');
      const [stage] = await tx
        .select()
        .from(bracketStages)
        .where(eq(bracketStages.id, session.stageId))
        .limit(1);
      if (!stage) throw new Error('Stage tidak ditemukan');
      if (stage.status !== 'ACTIVE') throw new Error('Stage belum aktif');
      if (session.status === 'COMPLETED' || session.status === 'CANCELLED')
        throw new Error('Sesi sudah selesai. Gunakan koreksi hasil.');
      if (input.expectedVersion !== session.version)
        throw new Error('Data sesi telah diperbarui admin lain. Silakan muat ulang.');
      const [bGuard] = await tx
        .select()
        .from(brackets)
        .where(eq(brackets.id, stage.bracketId))
        .limit(1);
      if (!bGuard || bGuard.status === 'DRAFT')
        throw new Error('Publish bagan dulu sebelum input hasil');

      const participants = await loadParticipants(tx, session.id);
      if (participants.length === 0) throw new Error('Sesi belum memiliki peserta');

      // Resolve hasil: rank utk peserta ber-rank; DNS/DSQ/DNF/WO tanpa rank.
      const resolved = resolveSessionResults(
        participants,
        input.results,
        stage.resultMode as HeatResultMode
      );

      // Simpan results + status QUALIFIED/ELIMINATED sesuai rank vs qualifier.
      const qualifiersPerSession = stage.qualifiersPerSession ?? 0;
      for (const [participantId, { rank, meta }] of resolved) {
        const isFinalStage = stage.isFinal;
        const status: HeatResultStatus =
          meta.resultStatus && NON_QUALIFIABLE.has(meta.resultStatus)
            ? meta.resultStatus
            : isFinalStage
              ? (meta.resultStatus ?? 'NORMAL')
              : rank !== null && rank <= qualifiersPerSession
                ? 'QUALIFIED'
                : 'ELIMINATED';
        await tx
          .insert(bracketSessionResults)
          .values({
            sessionId: session.id,
            participantId,
            rank,
            timeMs: meta.timeMs ?? null,
            score: meta.score ?? null,
            resultStatus: status,
            notes: meta.notes ?? null,
            enteredBy: input.enteredBy ?? null,
          })
          .onConflictDoUpdate({
            target: [bracketSessionResults.sessionId, bracketSessionResults.participantId],
            set: {
              rank,
              timeMs: meta.timeMs ?? null,
              score: meta.score ?? null,
              resultStatus: status,
              notes: meta.notes ?? null,
              enteredBy: input.enteredBy ?? null,
              updatedAt: new Date(),
            },
          });
      }

      await tx
        .update(bracketSessions)
        .set({ status: 'COMPLETED', version: session.version + 1, updatedAt: new Date() })
        .where(eq(bracketSessions.id, session.id));

      // Status bracket: PUBLISHED + ada hasil → IN_PROGRESS.
      const [b] = await tx.select().from(brackets).where(eq(brackets.id, stage.bracketId)).limit(1);
      if (b && b.status === 'PUBLISHED') {
        await tx
          .update(brackets)
          .set({ status: 'IN_PROGRESS', updatedAt: new Date() })
          .where(eq(brackets.id, b.id));
      }

      // Auto-finalize stage FINAL saat sesi terakhir selesai → podium + COMPLETED
      // langsung keluar tanpa perlu klik "Selesaikan Final" manual.
      if (stage.isFinal) {
        const allSessions = await loadSessions(tx, stage.id);
        const allDone = allSessions.every(
          (s) => s.status === 'COMPLETED' || s.status === 'CANCELLED'
        );
        if (allDone) {
          const bySession: Array<{ sessionId: number | null; ranks: ResolvedRank[] }> = [];
          for (const s of allSessions) {
            const results = await loadResults(tx, s.id);
            bySession.push({
              sessionId: s.id,
              ranks: results
                .filter((r) => r.rank !== null)
                .map((r) => ({ participantId: r.participantId, rank: r.rank as number })),
            });
          }
          const podium = calculateHeatPodium(bySession.flatMap((s) => s.ranks));
          await tx
            .update(bracketStages)
            .set({ status: 'COMPLETED', updatedAt: new Date() })
            .where(eq(bracketStages.id, stage.id));
          await tx
            .update(brackets)
            .set({ status: 'COMPLETED', updatedAt: new Date() })
            .where(eq(brackets.id, stage.bracketId));
          return { ok: true, finalCompleted: true, podium };
        }
      }
      return { ok: true, finalCompleted: false };
    });
  },

  /**
   * Finalize stage: semua session COMPLETED → hitung qualifier.
   * - Stage bukan final: buat session + assignment stage berikutnya, stage berikutnya ACTIVE.
   * - Stage final: hitung podium, bracket COMPLETED.
   */
  async finalizeStage(database: Database, stageId: number) {
    return database.transaction(async (tx) => {
      const [stage] = await tx
        .select()
        .from(bracketStages)
        .where(eq(bracketStages.id, stageId))
        .limit(1);
      if (!stage) throw new Error('Stage tidak ditemukan');
      if (stage.status !== 'ACTIVE') throw new Error('Hanya stage ACTIVE yang bisa difinalisasi');
      const [bGuard] = await tx
        .select()
        .from(brackets)
        .where(eq(brackets.id, stage.bracketId))
        .limit(1);
      if (!bGuard || bGuard.status === 'DRAFT')
        throw new Error('Publish bagan dulu sebelum finalisasi');

      const sessions = await loadSessions(tx, stage.id);
      if (sessions.length === 0) throw new Error('Stage tidak memiliki sesi');
      const allDone = sessions.every((s) => s.status === 'COMPLETED' || s.status === 'CANCELLED');
      if (!allDone) throw new Error('Semua sesi stage harus selesai sebelum finalisasi');

      // Kumpulkan hasil per session. Peserta tanpa rank (DNS/DSQ/DNF/WO) tidak
      // ikut qualify — jangan jadikan 0 (bisa lolos top-N).
      const bySession: Array<{ sessionId: number | null; ranks: ResolvedRank[] }> = [];
      for (const s of sessions) {
        const results = await loadResults(tx, s.id);
        bySession.push({
          sessionId: s.id,
          ranks: results
            .filter((r) => r.rank !== null)
            .map((r) => ({ participantId: r.participantId, rank: r.rank as number })),
        });
      }

      // Stage final → podium + COMPLETED.
      if (stage.isFinal) {
        const all = bySession.flatMap((s) => s.ranks);
        const podium = calculateHeatPodium(all);
        await tx
          .update(bracketStages)
          .set({ status: 'COMPLETED', updatedAt: new Date() })
          .where(eq(bracketStages.id, stage.id));
        await tx
          .update(brackets)
          .set({ status: 'COMPLETED', updatedAt: new Date() })
          .where(eq(brackets.id, stage.bracketId));
        return { ok: true, isFinal: true, podium };
      }

      // Qualifier + buat stage berikutnya.
      const qualifiers: QualifiedParticipant[] = qualify({
        mode: stage.advancementMode,
        qualifiersPerSession: stage.qualifiersPerSession ?? 0,
        bySession,
      });
      if (qualifiers.length === 0) throw new Error('Tidak ada peserta yang lolos dari stage ini');

      const nextStage = await tx
        .select()
        .from(bracketStages)
        .where(
          and(
            eq(bracketStages.bracketId, stage.bracketId),
            eq(bracketStages.stageNumber, stage.stageNumber + 1)
          )
        )
        .limit(1);
      if (!nextStage[0]) throw new Error('Stage berikutnya tidak ditemukan');
      const nextStageRow = nextStage[0];

      await tx
        .update(bracketStages)
        .set({ status: 'COMPLETED', updatedAt: new Date() })
        .where(eq(bracketStages.id, stage.id));
      await tx
        .update(bracketStages)
        .set({ status: 'ACTIVE', updatedAt: new Date() })
        .where(eq(bracketStages.id, nextStageRow.id));

      // Distribusi qualifier ke session stage berikutnya (balanced, RANDOM fallback).
      const [b] = await tx.select().from(brackets).where(eq(brackets.id, stage.bracketId)).limit(1);
      const seedMethod = (b?.seedingMethod ?? 'RANDOM') as HeatSeedingMethod;
      const participantIds = qualifiers.map((q) => q.participantId);
      const buckets = assignToSessions({
        participantIds,
        sessionSizes: sessionSizesForStage(nextStageRow, participantIds.length),
        method: seedMethod === 'MANUAL' ? 'RANDOM' : seedMethod,
      });
      for (let i = 0; i < buckets.length; i++) {
        const [session] = await tx
          .insert(bracketSessions)
          .values({
            stageId: nextStageRow.id,
            sessionNumber: i + 1,
            name: sessionName(i + 1),
            status: 'READY',
            version: 1,
          })
          .returning();
        await tx.insert(bracketSessionParticipants).values(
          buckets[i].map((teamId, slotIndex) => {
            const q = qualifiers.find((x) => x.participantId === teamId)!;
            return {
              sessionId: session.id,
              participantId: teamId,
              slotNumber: slotIndex + 1,
              seed: slotIndex + 1,
              sourceType: 'SESSION_QUALIFIER' as const,
              sourceStageId: stage.id,
              sourceSessionId: q.sourceSessionId,
              sourceRank: q.sourceRank,
            };
          })
        );
      }
      return { ok: true, isFinal: false, qualifierCount: qualifiers.length };
    });
  },

  /**
   * Koreksi hasil session COMPLETED. Kalau stage sudah difinalisasi dan downstream
   * sudah dimainkan → wajib invalidateDownstream. Recompute qualifier + assignment
   * stage berikutnya, hapus hasil downstream.
   */
  async correctSessionResult(database: Database, input: CorrectSessionInput) {
    return database.transaction(async (tx) => {
      const [session] = await tx
        .select()
        .from(bracketSessions)
        .where(eq(bracketSessions.id, input.sessionId))
        .limit(1);
      if (!session) throw new Error('Sesi tidak ditemukan');
      const [stage] = await tx
        .select()
        .from(bracketStages)
        .where(eq(bracketStages.id, session.stageId))
        .limit(1);
      if (!stage) throw new Error('Stage tidak ditemukan');
      if (session.status !== 'COMPLETED')
        throw new Error('Sesi belum selesai. Gunakan submit biasa.');
      if (input.expectedVersion !== session.version)
        throw new Error('Data sesi telah diperbarui admin lain. Silakan muat ulang.');

      const participants = await loadParticipants(tx, session.id);
      const resolved = resolveSessionResults(
        participants,
        input.results,
        stage.resultMode as HeatResultMode
      );

      // Cek downstream sudah dimainkan (stage setelah stage ini punya result).
      const playedDownstream = await countPlayedDownstream(tx, stage.id);
      if (playedDownstream > 0 && !input.invalidateDownstream) {
        throw new Error(
          `Koreksi ini membatalkan ${playedDownstream} hasil sesi berikutnya. Konfirmasi invalidate dulu.`
        );
      }

      // History (audit trail) — simpan per participant old→new.
      const oldResults = await loadResults(tx, session.id);
      for (const [participantId, { rank, meta }] of resolved) {
        const old = oldResults.find((o) => o.participantId === participantId);
        if (!old || old.rank === rank) continue;
        await tx.insert(bracketSessionResultHistory).values({
          sessionId: session.id,
          participantId,
          oldRank: old.rank,
          newRank: rank,
          oldTime: old.timeMs,
          newTime: meta.timeMs ?? null,
          reason: input.reason ?? null,
          changedBy: input.enteredBy ?? null,
        });
      }

      // Update results.
      const qualifiersPerSession = stage.qualifiersPerSession ?? 0;
      for (const [participantId, { rank, meta }] of resolved) {
        const status: HeatResultStatus =
          meta.resultStatus && NON_QUALIFIABLE.has(meta.resultStatus)
            ? meta.resultStatus
            : stage.isFinal
              ? (meta.resultStatus ?? 'NORMAL')
              : rank !== null && rank <= qualifiersPerSession
                ? 'QUALIFIED'
                : 'ELIMINATED';
        await tx
          .update(bracketSessionResults)
          .set({
            rank,
            timeMs: meta.timeMs ?? null,
            score: meta.score ?? null,
            resultStatus: status,
            notes: meta.notes ?? null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(bracketSessionResults.sessionId, session.id),
              eq(bracketSessionResults.participantId, participantId)
            )
          );
      }
      await tx
        .update(bracketSessions)
        .set({ version: session.version + 1, updatedAt: new Date() })
        .where(eq(bracketSessions.id, session.id));

      // Downstream: stage ini sudah difinalisasi → kembalikan ke ACTIVE (hasil
      // berubah, perlu finalisasi ulang) + hapus stage berikutnya.
      if (stage.status === 'COMPLETED') {
        await tx
          .update(bracketStages)
          .set({ status: 'ACTIVE', updatedAt: new Date() })
          .where(eq(bracketStages.id, stage.id));
        await invalidateDownstream(tx, stage);
        // Bracket COMPLETED dibatalkan oleh koreksi → turun ke IN_PROGRESS.
        await tx
          .update(brackets)
          .set({ status: 'IN_PROGRESS', updatedAt: new Date() })
          .where(eq(brackets.id, stage.bracketId));
      }
      return { ok: true, invalidated: playedDownstream };
    });
  },

  /** Hapus hasil semua session pada satu stage (struktur tetap). */
  async resetStageResults(database: Database, stageId: number) {
    return database.transaction(async (tx) => {
      const [stage] = await tx
        .select()
        .from(bracketStages)
        .where(eq(bracketStages.id, stageId))
        .limit(1);
      if (!stage) throw new Error('Stage tidak ditemukan');
      const sessions = await loadSessions(tx, stageId);
      for (const s of sessions) {
        await tx.delete(bracketSessionResults).where(eq(bracketSessionResults.sessionId, s.id));
        await tx
          .update(bracketSessions)
          .set({ status: 'READY', version: s.version + 1, updatedAt: new Date() })
          .where(eq(bracketSessions.id, s.id));
      }
      // Stage sudah difinalisasi → kembalikan ACTIVE + invalidate downstream
      // (hasil stage berikutnya tidak valid lagi).
      if (stage.status === 'COMPLETED') {
        await tx
          .update(bracketStages)
          .set({ status: 'ACTIVE', updatedAt: new Date() })
          .where(eq(bracketStages.id, stageId));
        await invalidateDownstream(tx, stage);
        await tx
          .update(brackets)
          .set({ status: 'IN_PROGRESS', updatedAt: new Date() })
          .where(eq(brackets.id, stage.bracketId));
      }
      return { ok: true };
    });
  },

  /** Regenerate bracket DRAFT — buang + generate ulang dgn konfigurasi tersimpan. */
  async regenerate(database: Database, competitionId: number, kategori: 'putra' | 'putri') {
    const [b] = await database
      .select()
      .from(brackets)
      .where(and(eq(brackets.competitionId, competitionId), eq(brackets.kategori, kategori)))
      .limit(1);
    if (!b) throw new Error('Bracket tidak ditemukan');
    if (b.status !== 'DRAFT') throw new Error('Hanya bracket DRAFT yang bisa regenerate');

    const stages = await loadStages(database, b.id);
    const first = stages[0];
    const final = stages[stages.length - 1];
    // Kumpulkan peserta dari SEMUA sesi stage 1 (bukan cuma sesi pertama).
    const stage1Sessions = await loadSessions(database, first.id);
    const allStage1Parts = [];
    for (const s of stage1Sessions) {
      allStage1Parts.push(...(await loadParticipants(database, s.id)));
    }
    const teamIds = allStage1Parts
      .sort((a, x) => a.slotNumber - x.slotNumber)
      .map((p) => p.participantId);
    const config: HeatConfigInput = {
      participantCount: teamIds.length,
      teamsPerSession: first.teamsPerSession,
      qualifiersPerSession: first.qualifiersPerSession ?? 0,
      finalSize: final.teamsPerSession,
    };
    await database.delete(brackets).where(eq(brackets.id, b.id));
    return heatService.generate(database, {
      competitionId,
      kategori,
      teamIds,
      config,
      seedingMethod: (b.seedingMethod ?? 'RANDOM') as HeatSeedingMethod,
    });
  },

  /** Detail normalized utk UI. */
  async detail(
    database: Database,
    competitionId: number,
    kategori: 'putra' | 'putri'
  ): Promise<HeatDetailView | null> {
    const [b] = await database
      .select()
      .from(brackets)
      .where(and(eq(brackets.competitionId, competitionId), eq(brackets.kategori, kategori)))
      .limit(1);
    if (!b || b.format !== 'HEAT_ELIMINATION') return null;

    const teamNama = new Map<number, string>();
    if (b.participantCount > 0) {
      // Hanya load tim peserta bracket (bukan seluruh tabel teams).
      const stageRows = await database
        .select({ id: bracketStages.id })
        .from(bracketStages)
        .where(eq(bracketStages.bracketId, b.id));
      const sessionIds: number[] = [];
      for (const st of stageRows) {
        const sess = await loadSessions(database, st.id);
        for (const s of sess) sessionIds.push(s.id);
      }
      let teamIds: number[] = [];
      if (sessionIds.length > 0) {
        const rows = await database
          .select({ participantId: bracketSessionParticipants.participantId })
          .from(bracketSessionParticipants)
          .where(inArray(bracketSessionParticipants.sessionId, sessionIds));
        teamIds = [...new Set(rows.map((r) => r.participantId))];
      }
      if (teamIds.length > 0) {
        const rows = await database
          .select({ id: teams.id, nama: teams.nama })
          .from(teams)
          .where(inArray(teams.id, teamIds));
        for (const t of rows) teamNama.set(t.id, t.nama);
      }
    }

    const stages = await loadStages(database, b.id);
    const stageViews = [];
    for (const stage of stages) {
      const sessions = await loadSessions(database, stage.id);
      const sessionViews = [];
      for (const s of sessions) {
        const parts = await loadParticipants(database, s.id);
        const results = await loadResults(database, s.id);
        sessionViews.push({
          id: s.id,
          sessionNumber: s.sessionNumber,
          name: s.name,
          status: s.status,
          version: s.version,
          participants: parts.map((p) => ({
            participantId: p.participantId,
            nama: teamNama.get(p.participantId) ?? `Tim ${p.participantId}`,
            slotNumber: p.slotNumber,
            seed: p.seed,
            sourceType: p.sourceType,
            sourceRank: p.sourceRank,
          })),
          results: results.map((r) => ({
            participantId: r.participantId,
            rank: r.rank,
            timeMs: r.timeMs,
            score: r.score,
            resultStatus: r.resultStatus,
          })),
        });
      }
      stageViews.push({
        id: stage.id,
        stageNumber: stage.stageNumber,
        name: stage.name,
        teamsPerSession: stage.teamsPerSession,
        advancementMode: stage.advancementMode,
        qualifiersPerSession: stage.qualifiersPerSession ?? 0,
        resultMode: stage.resultMode,
        isFinal: stage.isFinal,
        status: stage.status,
        sessions: sessionViews,
      });
    }

    // Podium dari stage final (kalau selesai).
    const finalStage = stageViews[stageViews.length - 1];
    let podium: HeatDetailView['podium'] = { rank1: null, rank2: null, rank3: null };
    if (finalStage?.isFinal && finalStage.status === 'COMPLETED') {
      const ranks: ResolvedRank[] = finalStage.sessions.flatMap((s) =>
        s.results.map((r) => ({ participantId: r.participantId, rank: r.rank ?? 0 }))
      );
      podium = calculateHeatPodium(ranks);
    }

    return {
      bracket: {
        id: b.id,
        status: b.status,
        format: b.format,
        seedingMethod: b.seedingMethod as HeatSeedingMethod,
        participantCount: b.participantCount,
      },
      stages: stageViews,
      podium,
      teams: [...teamNama.entries()].map(([id, nama]) => ({ id, nama })),
    };
  },
};

/** Ukuran sesi untuk stage (dari stage itu sendiri, dihitung ulang saat runtime). */
function sessionSizesForStage(stage: { teamsPerSession: number }, count: number): number[] {
  const max = stage.teamsPerSession;
  const sessionCount = Math.ceil(count / max);
  const base = Math.floor(count / sessionCount);
  const rem = count % sessionCount;
  const sizes = Array(sessionCount).fill(base);
  for (let i = 0; i < rem; i++) sizes[i] += 1;
  sizes.sort((a, b) => b - a);
  return sizes;
}

/** Jumlah hasil sesi pada SEMUA stage setelah `stageId` yang sudah dimainkan. */
async function countPlayedDownstream(database: Database, stageId: number): Promise<number> {
  const [stage] = await database
    .select()
    .from(bracketStages)
    .where(eq(bracketStages.id, stageId))
    .limit(1);
  if (!stage) return 0;
  const later = await database
    .select()
    .from(bracketStages)
    .where(
      and(
        eq(bracketStages.bracketId, stage.bracketId),
        eq(bracketStages.sortOrder, stage.sortOrder + 1)
      )
    )
    .orderBy(bracketStages.sortOrder);
  let played = 0;
  for (const s of later) {
    const sessions = await loadSessions(database, s.id);
    for (const sess of sessions) {
      const results = await loadResults(database, sess.id);
      played += results.length;
    }
  }
  return played;
}

/** Hapus hasil + assignment SEMUA stage setelah `stage`, set ulang jadi PENDING. */
async function invalidateDownstream(
  database: Database,
  stage: { bracketId: number; sortOrder: number }
) {
  const later = await database
    .select()
    .from(bracketStages)
    .where(
      and(
        eq(bracketStages.bracketId, stage.bracketId),
        eq(bracketStages.sortOrder, stage.sortOrder + 1)
      )
    )
    .orderBy(bracketStages.sortOrder);
  for (const next of later) {
    const sessions = await loadSessions(database, next.id);
    const sessionIds = sessions.map((s) => s.id);
    if (sessionIds.length) {
      await database
        .delete(bracketSessionResults)
        .where(inArray(bracketSessionResults.sessionId, sessionIds));
      await database
        .delete(bracketSessionParticipants)
        .where(inArray(bracketSessionParticipants.sessionId, sessionIds));
      await database.delete(bracketSessions).where(inArray(bracketSessions.id, sessionIds));
    }
    await database
      .update(bracketStages)
      .set({ status: 'PENDING', updatedAt: new Date() })
      .where(eq(bracketStages.id, next.id));
  }
}
