/**
 * Server functions — Tournament Heat (Session Elimination).
 *
 * Engine terpisah dari single elimination. Router berdasarkan format:
 * bracket.format === 'HEAT_ELIMINATION' → heatService.
 * RPC setup/publik (getBaganCompetitions/getBaganTeams/getPrizes/upsertPrize/
 * deletePrize/deleteBracket) di-share dari bracket.ts.
 */
import { createServerFn } from '@tanstack/react-start';
import { eq } from 'drizzle-orm';
import type {
  HeatConfigInput,
  HeatResultStatus,
  HeatSeedingMethod,
} from '../../lib/tournament/heat-elimination';
import { assertDb, db } from '../db';
import { teams } from '../db/schema';
import { adminOnly } from '../middleware/auth';
import { type TournamentDb, tournamentService } from '../services/tournament';
import { heatService } from '../services/tournament/heat';

type Kategori = 'putra' | 'putri';

/** DB untuk heatService (Tx-typed). */
function th(): TournamentDb {
  return assertDb() as unknown as TournamentDb;
}

interface SessionResultPayload {
  participantId: number;
  rank?: number | null;
  timeMs?: number | null;
  score?: number | null;
  resultStatus?: HeatResultStatus;
  notes?: string | null;
}

// ─── Detail (normalized heat view) ───

export const getHeatBracket = createServerFn({ method: 'GET' })
  .validator((d: { competitionId: number; kategori: Kategori }) => d)
  .handler(async ({ data }) => {
    if (!db) return null;
    return heatService.detail(th(), data.competitionId, data.kategori);
  });

// ─── Admin: lifecycle ───

export const generateHeatBracket = createServerFn({ method: 'POST' })
  .middleware([adminOnly])
  .validator(
    (d: {
      competitionId: number;
      kategori: Kategori;
      config: HeatConfigInput;
      seedingMethod: HeatSeedingMethod;
      manualSessions?: Record<string, number>;
    }) => d
  )
  .handler(async ({ data }) => {
    const database = assertDb();
    const teamRows = await database
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.kategori, data.kategori))
      .orderBy(teams.nomor);
    const manual = data.manualSessions
      ? new Map(Object.entries(data.manualSessions).map(([k, v]) => [Number(k), v]))
      : undefined;
    await heatService.generate(th(), {
      competitionId: data.competitionId,
      kategori: data.kategori,
      teamIds: teamRows.map((t) => t.id),
      config: data.config,
      seedingMethod: data.seedingMethod,
      manualSessions: manual,
    });
    return heatService.detail(th(), data.competitionId, data.kategori);
  });

export const publishHeatBracket = createServerFn({ method: 'POST' })
  .middleware([adminOnly])
  .validator((d: { bracketId: number }) => d)
  .handler(async ({ data }) => {
    return heatService.publish(th(), data.bracketId);
  });

export const submitSessionResult = createServerFn({ method: 'POST' })
  .middleware([adminOnly])
  .validator(
    (d: { sessionId: number; expectedVersion: number; results: SessionResultPayload[] }) => d
  )
  .handler(async ({ data }) => {
    return heatService.submitSessionResult(th(), {
      sessionId: data.sessionId,
      expectedVersion: data.expectedVersion,
      results: data.results,
    });
  });

export const finalizeStage = createServerFn({ method: 'POST' })
  .middleware([adminOnly])
  .validator((d: { stageId: number }) => d)
  .handler(async ({ data }) => {
    return heatService.finalizeStage(th(), data.stageId);
  });

export const correctSessionResult = createServerFn({ method: 'POST' })
  .middleware([adminOnly])
  .validator(
    (d: {
      sessionId: number;
      reason?: string | null;
      invalidateDownstream: boolean;
      results: SessionResultPayload[];
    }) => d
  )
  .handler(async ({ data }) => {
    return heatService.correctSessionResult(th(), {
      sessionId: data.sessionId,
      reason: data.reason ?? null,
      invalidateDownstream: data.invalidateDownstream,
      results: data.results,
    });
  });

export const resetStageResults = createServerFn({ method: 'POST' })
  .middleware([adminOnly])
  .validator((d: { stageId: number }) => d)
  .handler(async ({ data }) => {
    return heatService.resetStageResults(th(), data.stageId);
  });

export const regenerateHeatBracket = createServerFn({ method: 'POST' })
  .middleware([adminOnly])
  .validator((d: { competitionId: number; kategori: Kategori }) => d)
  .handler(async ({ data }) => {
    return heatService.regenerate(th(), data.competitionId, data.kategori);
  });
