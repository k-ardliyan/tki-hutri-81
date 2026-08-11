/**
 * Server functions — SnackQR: sessions, teams+members, redeem, summary, search.
 *
 * Flow: scan QR (kode team) → petugas centang manual → redeemSnack batch → anti-dup DB.
 * claimed_by = username dari cookie session.
 */
import { createServerFn } from '@tanstack/react-start';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { assertDb } from '../db';
import { employees, redemptions, snackSessions, teamMembers, teams } from '../db/schema';

// ─── Types ───

export interface SnackTeamMember {
  employeeId: number;
  nama: string;
  nip: string | null;
  divisi: string | null;
}

export interface SnackTeam {
  id: number;
  kategori: string;
  nomor: number | null;
  nama: string;
  kode: string;
  members: SnackTeamMember[];
}

export interface RedemptionInfo {
  id: number;
  employeeId: number;
  claimedBy: string;
  claimedAt: string;
}

export interface RedeemResult {
  ok: boolean;
  inserted: number;
  skipped: RedemptionInfo[];
  error?: string;
}

// ─── Sessions ───

export const getSessions = createServerFn({ method: 'GET' }).handler(async () => {
  const db = assertDb();
  const rows = await db.select().from(snackSessions).orderBy(desc(snackSessions.id));
  // Hitung sisa snack: quota - jumlah redemption per sesi
  const reds = await db
    .select({ sessionId: redemptions.sessionId, count: sql<number>`count(*)::int` })
    .from(redemptions)
    .groupBy(redemptions.sessionId);
  const redCount = new Map(reds.map((r) => [r.sessionId, r.count]));
  return rows.map((s) => ({
    ...s,
    redeemed: redCount.get(s.id) ?? 0,
    remaining: Math.max(0, s.quota - (redCount.get(s.id) ?? 0)),
  }));
});

/** Admin: buat sesi baru. */
export const createSession = createServerFn({ method: 'POST' })
  .validator((d: { name: string; quota: number }) => d)
  .handler(async ({ data }) => {
    const db = assertDb();
    const quota = Math.floor(Number(data.quota));
    if (!Number.isFinite(quota) || quota < 0) {
      throw new Error('Kuota harus angka >= 0');
    }
    const [row] = await db
      .insert(snackSessions)
      .values({ name: data.name, quota, isActive: true })
      .returning();
    return row;
  });

/** Admin: update sesi (name/quota/active). */
export const updateSession = createServerFn({ method: 'POST' })
  .validator((d: { id: number; name?: string; quota?: number; isActive?: boolean }) => d)
  .handler(async ({ data }) => {
    const db = assertDb();
    const patch: Partial<typeof snackSessions.$inferInsert> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.quota !== undefined) {
      const quota = Math.floor(Number(data.quota));
      if (!Number.isFinite(quota) || quota < 0) {
        throw new Error('Kuota harus angka >= 0');
      }
      patch.quota = quota;
    }
    if (data.isActive !== undefined) patch.isActive = data.isActive;
    const [row] = await db
      .update(snackSessions)
      .set(patch)
      .where(eq(snackSessions.id, data.id))
      .returning();
    return row;
  });

export const deleteSession = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    const db = assertDb();
    await db.delete(snackSessions).where(eq(snackSessions.id, data.id));
    return { ok: true };
  });

export const getActiveSession = createServerFn({ method: 'GET' }).handler(async () => {
  const db = assertDb();
  const [session] = await db
    .select()
    .from(snackSessions)
    .where(eq(snackSessions.isActive, true))
    .orderBy(desc(snackSessions.id))
    .limit(1);
  return session ?? null;
});

// ─── Teams + members ───

export const getTeamsWithMembers = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SnackTeam[]> => {
    const db = assertDb();
    const teamsRows = await db.select().from(teams).orderBy(teams.kategori, teams.nomor);
    const members = await db
      .select({
        teamId: teamMembers.teamId,
        employeeId: teamMembers.employeeId,
        sortOrder: teamMembers.sortOrder,
        nama: employees.nama,
        nip: employees.nip,
        divisi: employees.divisi,
      })
      .from(teamMembers)
      .innerJoin(employees, eq(teamMembers.employeeId, employees.id))
      .orderBy(teamMembers.sortOrder);

    const byTeam = new Map<number, SnackTeamMember[]>();
    for (const m of members) {
      const list = byTeam.get(m.teamId) ?? [];
      list.push({ employeeId: m.employeeId, nama: m.nama, nip: m.nip, divisi: m.divisi });
      byTeam.set(m.teamId, list);
    }

    return teamsRows.map((t) => ({
      id: t.id,
      kategori: t.kategori,
      nomor: t.nomor,
      nama: t.nama,
      kode: t.kode ?? '',
      members: byTeam.get(t.id) ?? [],
    }));
  }
);

/** Cari team by QR kode. */
export const getTeamByKode = createServerFn({ method: 'GET' })
  .validator((d: { kode: string }) => d)
  .handler(async ({ data }): Promise<SnackTeam | null> => {
    const kode = data.kode.trim().toUpperCase();
    const db = assertDb();
    const [teamRow] = await db.select().from(teams).where(eq(teams.kode, kode)).limit(1);
    if (!teamRow) return null;
    const members = await db
      .select({
        employeeId: teamMembers.employeeId,
        nama: employees.nama,
        nip: employees.nip,
        divisi: employees.divisi,
      })
      .from(teamMembers)
      .innerJoin(employees, eq(teamMembers.employeeId, employees.id))
      .where(eq(teamMembers.teamId, teamRow.id))
      .orderBy(teamMembers.sortOrder);
    return {
      id: teamRow.id,
      kategori: teamRow.kategori,
      nomor: teamRow.nomor,
      nama: teamRow.nama,
      kode: teamRow.kode ?? kode,
      members: members.map((m) => ({
        employeeId: m.employeeId,
        nama: m.nama,
        nip: m.nip,
        divisi: m.divisi,
      })),
    };
  });

// ─── Search employees (tanpa QR) ───

export const searchEmployees = createServerFn({ method: 'GET' })
  .validator((d: { q: string; limit?: number }) => d)
  .handler(
    async ({
      data,
    }): Promise<Array<{ id: number; nama: string; nip: string | null; divisi: string | null }>> => {
      const q = data.q.trim();
      if (!q) return [];
      const db = assertDb();
      const like = `%${q}%`;
      const rows = await db
        .select({
          id: employees.id,
          nama: employees.nama,
          nip: employees.nip,
          divisi: employees.divisi,
        })
        .from(employees)
        .where(
          and(
            eq(employees.isSnackEligible, true),
            sql`(${employees.nama} ILIKE ${like} OR ${employees.nip} ILIKE ${like})`
          )
        )
        .limit(data.limit ?? 10);
      return rows;
    }
  );

// ─── Redeem (anti-dup core) ───

/**
 * Insert batch redemptions untuk daftar employee pada session.
 * Anti-dup: employee yang sudah punya redemption di session → skipped (metadata).
 * Semua insert dalam 1 transaksi.
 */
export const redeemSnack = createServerFn({ method: 'POST' })
  .validator((d: { sessionId: number; employeeIds: number[] }) => d)
  .handler(async ({ data }): Promise<RedeemResult> => {
    const db = assertDb();
    const { sessionId, employeeIds } = data;

    // claimedBy dari cookie session — jangan percaya client
    const { getSession } = await import('./auth');
    const session = await getSession();
    const claimedBy = session.username ?? null;
    if (!claimedBy) {
      return {
        ok: false,
        inserted: 0,
        skipped: [],
        error: 'Sesi tidak valid. Silakan login dulu.',
      };
    }

    // 1. session harus active
    const [sessionRow] = await db
      .select()
      .from(snackSessions)
      .where(eq(snackSessions.id, sessionId))
      .limit(1);
    if (!sessionRow?.isActive) {
      return { ok: false, inserted: 0, skipped: [], error: 'Sesi tidak aktif' };
    }

    // 2. kuota tidak boleh lewat
    const redeemedCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(redemptions)
      .where(eq(redemptions.sessionId, sessionId));
    const taken = redeemedCount[0]?.count ?? 0;
    if (taken >= sessionRow.quota) {
      return { ok: false, inserted: 0, skipped: [], error: 'Kuota sesi sudah habis' };
    }

    // 3. cek eligibility + sudah ada redemption
    const empRows = await db
      .select({
        id: employees.id,
        nama: employees.nama,
        isSnackEligible: employees.isSnackEligible,
      })
      .from(employees)
      .where(inArray(employees.id, employeeIds));
    if (empRows.length !== employeeIds.length) {
      return { ok: false, inserted: 0, skipped: [], error: 'Ada karyawan tidak ditemukan' };
    }
    const ineligible = empRows.filter((e) => !e.isSnackEligible);
    if (ineligible.length) {
      return {
        ok: false,
        inserted: 0,
        skipped: [],
        error: `${ineligible.map((e) => e.nama).join(', ')} tidak eligible snack`,
      };
    }

    const existing = await db
      .select()
      .from(redemptions)
      .where(
        and(inArray(redemptions.employeeId, employeeIds), eq(redemptions.sessionId, sessionId))
      );

    const existingIds = new Set(existing.map((r) => r.employeeId));
    const toInsert = employeeIds.filter((id) => !existingIds.has(id));

    // 4. batasi ke sisa kuota — tolak seluruh batch kalau melebihi
    const quotaLeft = Math.max(0, sessionRow.quota - taken);
    if (toInsert.length > quotaLeft) {
      return {
        ok: false,
        inserted: 0,
        skipped: [],
        error: `Melebihi kuota sesi (sisa ${quotaLeft} porsi)`,
      };
    }

    if (toInsert.length > 0) {
      await db
        .insert(redemptions)
        .values(toInsert.map((employeeId) => ({ employeeId, sessionId, claimedBy })));
    }

    const skipped: RedemptionInfo[] = existing.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      claimedBy: r.claimedBy,
      claimedAt: r.claimedAt.toISOString(),
    }));

    return { ok: true, inserted: toInsert.length, skipped };
  });

// ─── Summary dashboard ───

export const getRedemptionSummary = createServerFn({ method: 'GET' })
  .validator((d: { sessionId?: number }) => d)
  .handler(async ({ data }) => {
    const db = assertDb();
    const sessionId = data.sessionId;

    const sessions = await db.select().from(snackSessions).orderBy(desc(snackSessions.id));
    const active = sessionId
      ? (sessions.find((s) => s.id === sessionId) ?? null)
      : (sessions.find((s) => s.isActive) ?? sessions[0] ?? null);

    // Hitung redeemed per sesi (untuk sisa snack di picker)
    const redCounts = await db
      .select({ sessionId: redemptions.sessionId, count: sql<number>`count(*)::int` })
      .from(redemptions)
      .groupBy(redemptions.sessionId);
    const redCountMap = new Map(redCounts.map((r) => [r.sessionId, r.count]));
    const sessionsWithMeta = sessions.map((s) => ({
      ...s,
      redeemed: redCountMap.get(s.id) ?? 0,
      remaining: Math.max(0, s.quota - (redCountMap.get(s.id) ?? 0)),
    }));

    if (!active)
      return {
        active: null,
        teams: [],
        totalRedeemed: 0,
        totalQuota: 0,
        sessions: sessionsWithMeta,
      };

    const teamsRows = await db.select().from(teams).orderBy(teams.kategori, teams.nomor);
    const reds = await db
      .select({
        employeeId: redemptions.employeeId,
        claimedAt: redemptions.claimedAt,
        claimedBy: redemptions.claimedBy,
      })
      .from(redemptions)
      .where(eq(redemptions.sessionId, active.id));

    const members = await db
      .select({ teamId: teamMembers.teamId, employeeId: teamMembers.employeeId })
      .from(teamMembers);

    const redeemedIds = new Set(reds.map((r) => r.employeeId));
    const memberByTeam = new Map<number, number[]>();
    for (const m of members) {
      const list = memberByTeam.get(m.teamId) ?? [];
      list.push(m.employeeId);
      memberByTeam.set(m.teamId, list);
    }

    const teamStatus = teamsRows.map((t) => {
      const ids = memberByTeam.get(t.id) ?? [];
      const redeemed = ids.filter((id) => redeemedIds.has(id));
      return {
        id: t.id,
        nama: t.nama,
        kode: t.kode ?? '',
        kategori: t.kategori,
        total: ids.length,
        redeemed: redeemed.length,
        done: redeemed.length > 0,
        full: redeemed.length === ids.length,
      };
    });

    return {
      active,
      teams: teamStatus,
      totalRedeemed: reds.length,
      totalQuota: active.quota,
      sessions,
    };
  });

// ─── Detail per tim (siapa sudah ambil) ───

export const getRedemptionsBySession = createServerFn({ method: 'POST' })
  .validator((d: { sessionId: number; teamId: number }) => d)
  .handler(async ({ data }) => {
    const db = assertDb();
    // All members of the team
    const members = await db
      .select({
        employeeId: teamMembers.employeeId,
        nama: employees.nama,
        nip: employees.nip,
        divisi: employees.divisi,
      })
      .from(teamMembers)
      .innerJoin(employees, eq(teamMembers.employeeId, employees.id))
      .where(eq(teamMembers.teamId, data.teamId))
      .orderBy(teamMembers.sortOrder);

    // Redemptions for this session + team members
    const empIds = members.map((m) => m.employeeId);
    const reds =
      empIds.length > 0
        ? await db
            .select({
              employeeId: redemptions.employeeId,
              claimedBy: redemptions.claimedBy,
              claimedAt: redemptions.claimedAt,
            })
            .from(redemptions)
            .where(
              and(
                eq(redemptions.sessionId, data.sessionId),
                inArray(redemptions.employeeId, empIds)
              )
            )
        : [];

    const redMap = new Map(reds.map((r) => [r.employeeId, r]));

    return members.map((m) => {
      const r = redMap.get(m.employeeId);
      return {
        employeeId: m.employeeId,
        nama: m.nama,
        nip: m.nip,
        divisi: m.divisi,
        claimedBy: r?.claimedBy ?? null,
        claimedAt: r?.claimedAt?.toISOString() ?? null,
      };
    });
  });
