/**
 * Server functions — Tournament Bracket (single elimination).
 *
 * Thin orchestration: validasi input ringan → tournamentService (domain logic).
 * Match = source of truth. Struktur dibuat sekali (generate), winner/loser
 * dipropagasi otomatis. Prize tetap per (lomba, kategori, place) — podium derived.
 */
import { createServerFn } from '@tanstack/react-start';
import { and, eq, inArray } from 'drizzle-orm';
import type { SeedingMethod } from '../../lib/tournament/types';
import { assertDb, db } from '../db';
import { isUniqueViolation } from '../db/errors';
import { competitions, lombaPrizes, teams } from '../db/schema';
import { adminOnly } from '../middleware/auth';
import { type TournamentDb, tournamentService } from '../services/tournament';

type Kategori = 'putra' | 'putri';

/** DB untuk tournamentService (Tx-typed). */
function td(): TournamentDb {
  return assertDb() as unknown as TournamentDb;
}

// ─── Daftar lomba bagan + tim per kategori (setup UI) ───

export const getBaganCompetitions = createServerFn({ method: 'GET' }).handler(async () => {
  if (!db) return [];
  const rows = await db
    .select({
      id: competitions.id,
      slug: competitions.slug,
      short: competitions.short,
      title: competitions.title,
    })
    .from(competitions)
    .where(inArray(competitions.slug, ['balon', 'air']))
    .orderBy(competitions.sortOrder);
  return rows.map((r) => ({ id: r.id, slug: r.slug, short: r.short, title: r.title }));
});

export const getBaganTeams = createServerFn({ method: 'GET' })
  .validator((d: { kategori: Kategori }) => d)
  .handler(async ({ data }) => {
    if (!db) return [];
    const rows = await db
      .select({ id: teams.id, nama: teams.nama })
      .from(teams)
      .where(eq(teams.kategori, data.kategori))
      .orderBy(teams.nomor);
    return rows;
  });

// ─── Publik & admin: detail bracket normalized ───

export const getBracket = createServerFn({ method: 'GET' })
  .validator((d: { competitionId: number; kategori: Kategori }) => d)
  .handler(async ({ data }) => {
    if (!db) return null;
    return tournamentService.detail(td(), data.competitionId, data.kategori);
  });

// ─── Admin: lifecycle ───

export const generateBracket = createServerFn({ method: 'POST' })
  .middleware([adminOnly])
  .validator(
    (d: {
      competitionId: number;
      kategori: Kategori;
      seedingMethod: SeedingMethod;
      thirdPlaceEnabled: boolean;
      manualPositions?: Record<string, number>;
    }) => d
  )
  .handler(async ({ data }) => {
    const database = assertDb();
    const teamRows = await database
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.kategori, data.kategori))
      .orderBy(teams.nomor);
    const manual = data.manualPositions
      ? new Map(Object.entries(data.manualPositions).map(([k, v]) => [Number(k), v]))
      : undefined;
    await tournamentService.generate(td(), {
      competitionId: data.competitionId,
      kategori: data.kategori,
      teamIds: teamRows.map((t) => t.id),
      seedingMethod: data.seedingMethod,
      thirdPlaceEnabled: data.thirdPlaceEnabled,
      manualPositions: manual,
    });
    return tournamentService.detail(td(), data.competitionId, data.kategori);
  });

export const publishBracket = createServerFn({ method: 'POST' })
  .middleware([adminOnly])
  .validator((d: { bracketId: number }) => d)
  .handler(async ({ data }) => {
    return tournamentService.publish(td(), data.bracketId);
  });

export const submitMatchResult = createServerFn({ method: 'POST' })
  .middleware([adminOnly])
  .validator(
    (d: {
      matchId: number;
      winnerId: number;
      score1?: number | null;
      score2?: number | null;
      resultType?: 'NORMAL' | 'WALKOVER' | 'DISQUALIFIED';
      notes?: string | null;
      expectedVersion: number;
    }) => d
  )
  .handler(async ({ data }) => {
    if (!Number.isInteger(data.winnerId) || data.winnerId < 1)
      throw new Error('Pemenang tidak valid');
    return tournamentService.submitResult(td(), {
      matchId: data.matchId,
      winnerId: data.winnerId,
      score1: data.score1 ?? null,
      score2: data.score2 ?? null,
      resultType: data.resultType ?? 'NORMAL',
      notes: data.notes ?? null,
      expectedVersion: data.expectedVersion,
    });
  });

export const correctMatchResult = createServerFn({ method: 'POST' })
  .middleware([adminOnly])
  .validator(
    (d: {
      matchId: number;
      winnerId: number;
      reason?: string | null;
      invalidateDownstream: boolean;
    }) => d
  )
  .handler(async ({ data }) => {
    return tournamentService.correctResult(td(), {
      matchId: data.matchId,
      winnerId: data.winnerId,
      reason: data.reason ?? null,
      invalidateDownstream: data.invalidateDownstream,
    });
  });

export const resetBracketResults = createServerFn({ method: 'POST' })
  .middleware([adminOnly])
  .validator((d: { bracketId: number }) => d)
  .handler(async ({ data }) => {
    return tournamentService.resetResults(td(), data.bracketId);
  });

export const regenerateBracket = createServerFn({ method: 'POST' })
  .middleware([adminOnly])
  .validator((d: { competitionId: number; kategori: Kategori }) => d)
  .handler(async ({ data }) => {
    return tournamentService.regenerate(td(), data.competitionId, data.kategori);
  });

export const deleteBracket = createServerFn({ method: 'POST' })
  .middleware([adminOnly])
  .validator((d: { bracketId: number }) => d)
  .handler(async ({ data }) => {
    return tournamentService.remove(td(), data.bracketId);
  });

// ─── Admin: juara & hadiah (podium derived → prize by rank) ───

export const upsertPrize = createServerFn({ method: 'POST' })
  .middleware([adminOnly])
  .validator((d: { competitionId: number; kategori: Kategori; place: number; hadiah: string }) => d)
  .handler(async ({ data }) => {
    const database = assertDb();
    if (!Number.isInteger(data.place) || data.place < 1)
      throw new Error('Juara ke- harus angka positif');
    const where = and(
      eq(lombaPrizes.competitionId, data.competitionId),
      eq(lombaPrizes.kategori, data.kategori),
      eq(lombaPrizes.place, data.place)
    );
    const [existing] = await database
      .select({ id: lombaPrizes.id })
      .from(lombaPrizes)
      .where(where)
      .limit(1);
    if (existing) {
      await database
        .update(lombaPrizes)
        .set({ hadiah: data.hadiah })
        .where(eq(lombaPrizes.id, existing.id));
    } else {
      try {
        await database.insert(lombaPrizes).values({
          competitionId: data.competitionId,
          kategori: data.kategori,
          place: data.place,
          hadiah: data.hadiah,
        });
      } catch (err) {
        if (isUniqueViolation(err)) {
          await database.update(lombaPrizes).set({ hadiah: data.hadiah }).where(where);
        } else {
          throw err;
        }
      }
    }
    return { ok: true };
  });

export const deletePrize = createServerFn({ method: 'POST' })
  .middleware([adminOnly])
  .validator((d: { competitionId: number; kategori: Kategori; place: number }) => d)
  .handler(async ({ data }) => {
    const database = assertDb();
    await database
      .delete(lombaPrizes)
      .where(
        and(
          eq(lombaPrizes.competitionId, data.competitionId),
          eq(lombaPrizes.kategori, data.kategori),
          eq(lombaPrizes.place, data.place)
        )
      );
    return { ok: true };
  });

export const getPrizes = createServerFn({ method: 'GET' })
  .validator((d: { competitionId: number; kategori: Kategori }) => d)
  .handler(async ({ data }) => {
    if (!db) return [];
    const rows = await db
      .select()
      .from(lombaPrizes)
      .where(
        and(
          eq(lombaPrizes.competitionId, data.competitionId),
          eq(lombaPrizes.kategori, data.kategori)
        )
      )
      .orderBy(lombaPrizes.place);
    return rows.map((r) => ({ place: r.place, hadiah: r.hadiah }));
  });
