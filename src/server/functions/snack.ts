/**
 * Server functions — Snack: session lifecycle, entitlements, redeem v2, audit.
 *
 * Model baru (PRD Snack Distribution Improvement):
 * - Session lifecycle: draft → published (scheduled/active/paused/closed/archived)
 *   Status efektif DIHITUNG backend dari starts_at/ends_at/paused_at/closed_at.
 * - Entitlement snapshot: snack_session_entitlements (1 karyawan = 1 hak per sesi).
 * - Redemption: source (QR_TEAM/SEARCH/ADMIN_CORRECTION/MIGRATION), request_id idempotency,
 *   void soft-delete (voided_at) — anti-dup partial unique index hanya utk klaim AKTIF.
 * - claimed_by/voided_by = username dari cookie session (server-side, anti-spoof).
 */
import { createServerFn } from '@tanstack/react-start';
import { and, count, desc, eq, gt, inArray, lt, ne, not, or, sql } from 'drizzle-orm';
import { assertDb } from '../db';
import { isUniqueViolation } from '../db/errors';
import {
  employees,
  redemptions,
  snackSessionEntitlements,
  snackSessions,
  teamMembers,
  teams,
} from '../db/schema';

// ─── Types ───

export type SessionEffectiveStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'closed'
  | 'archived';

export interface SnackSessionRow {
  id: number;
  name: string;
  quota: number;
  isActive: boolean;
  createdAt: string;
  status: 'draft' | 'published' | 'archived';
  startsAt: string | null;
  endsAt: string | null;
  publishedAt: string | null;
  pausedAt: string | null;
  pausedBy: string | null;
  closedAt: string | null;
  closedBy: string | null;
  archivedAt: string | null;
  stockQuota: number | null;
  createdBy: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

export interface SnackSessionWithMeta extends SnackSessionRow {
  effectiveStatus: SessionEffectiveStatus;
  redeemed: number; // klaim AKTIF (non-voided)
  entitled: number; // jumlah entitlement
  remaining: number | null; // sisa stok (null = tanpa batas stok)
}

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
  idempotent?: boolean;
  error?: string;
}

// ─── Pure helpers (testable via selfcheck) ───

/** Status efektif sesi dari kolom persisten + jadwal (PRD §8). */
export function effectiveSessionStatus(
  s: {
    status: string;
    startsAt: Date | string | null;
    endsAt: Date | string | null;
    pausedAt: Date | string | null;
    closedAt: Date | string | null;
    archivedAt: Date | string | null;
  },
  now: Date = new Date()
): SessionEffectiveStatus {
  if (s.status === 'draft') return 'draft';
  if (s.status === 'archived' || s.archivedAt) return 'archived';
  if (s.closedAt) return 'closed';
  if (s.pausedAt) return 'paused';
  const start = s.startsAt ? new Date(s.startsAt) : null;
  const end = s.endsAt ? new Date(s.endsAt) : null;
  if (start && now < start) return 'scheduled';
  if (end && now >= end) return 'closed';
  return 'active';
}

/** Stok efektif sesi: stock_quota eksplisit, fallback ke quota legacy. null = tanpa batas. */
export function effectiveStock(s: { stockQuota: number | null; quota: number }): number | null {
  if (s.stockQuota !== null && s.stockQuota !== undefined) return s.stockQuota;
  return s.quota > 0 ? s.quota : null;
}

// ─── Auth helpers ───

async function getAuth() {
  const { getSession } = await import('./auth');
  const session = await getSession();
  return { username: session.username ?? null, role: session.role };
}

function isAdminRole(role: string | null): boolean {
  return role === 'superadmin' || role === 'admin';
}

/**
 * Guard akses operasional (semua role snack: superadmin/admin/petugas).
 * Server fns data (GET/POST) dipanggil langsung via RPC tanpa route guard —
 * AC-R04: backend wajib validasi permission walau URL dipanggil manual.
 */
async function requireOperationalAuth() {
  const { getSession } = await import('./auth');
  const session = await getSession();
  const role = session.role;
  if (!role || !isOperationalRole(role)) {
    throw new Error('Sesi tidak valid. Silakan login dulu.');
  }
  return { username: session.username ?? null, role };
}

function isOperationalRole(role: string | null): boolean {
  return role === 'superadmin' || role === 'admin' || role === 'petugas';
}

/**
 * Overlap jadwal dua sesi (PRD §9, AC-S08).
 * Sesi yang sudah selesai waktunya (ends_at <= now) TIDAK memblok jadwal baru —
 * status kolom tetap 'published' sampai ditutup/arsip, tapi tidak lagi distribusi.
 */
export function sessionOverlaps(
  a: {
    status: string;
    startsAt: Date | string | null;
    endsAt: Date | string | null;
    closedAt: Date | string | null;
    archivedAt: Date | string | null;
  },
  b: { startsAt: Date | string | null; endsAt: Date | string | null },
  now: Date = new Date()
): boolean {
  if (a.status !== 'published') return false;
  if (a.closedAt || a.archivedAt) return false;
  const aStart = a.startsAt ? new Date(a.startsAt) : null;
  const aEnd = a.endsAt ? new Date(a.endsAt) : null;
  const bStart = b.startsAt ? new Date(b.startsAt) : null;
  const bEnd = b.endsAt ? new Date(b.endsAt) : null;
  if (!aStart || !aEnd || !bStart || !bEnd) return false; // tanpa jadwal = legacy, tidak overlap
  if (aEnd <= now) return false; // sesi sudah berakhir → tidak memblok
  return aStart < bEnd && aEnd > bStart;
}

/** Validasi stok update: stok tidak boleh kurang dari klaim aktif (regresi guard lama). */
export function validateStockAgainstRedemptions(
  stock: number | null,
  redeemed: number
): string | null {
  if (stock === null || redeemed <= stock) return null;
  return `Stok ${stock} kurang dari ${redeemed} yang sudah diambil. Minimal ${redeemed}.`;
}

// ─── Sessions (lifecycle v2) ───

async function toSessionMeta(db: ReturnType<typeof assertDb>, now: Date = new Date()) {
  const rows = await db.select().from(snackSessions).orderBy(desc(snackSessions.id));
  const reds = await db
    .select({ sessionId: redemptions.sessionId, cnt: count() })
    .from(redemptions)
    .where(sql`${redemptions.voidedAt} IS NULL`)
    .groupBy(redemptions.sessionId);
  const ents = await db
    .select({ sessionId: snackSessionEntitlements.sessionId, cnt: count() })
    .from(snackSessionEntitlements)
    .groupBy(snackSessionEntitlements.sessionId);
  const redMap = new Map(reds.map((r) => [r.sessionId, Number(r.cnt)]));
  const entMap = new Map(ents.map((r) => [r.sessionId, Number(r.cnt)]));
  return rows.map((s): SnackSessionWithMeta => {
    const redeemed = redMap.get(s.id) ?? 0;
    const stock = effectiveStock(s);
    const remaining = stock === null ? null : Math.max(0, stock - redeemed);
    return {
      ...s,
      createdAt: s.createdAt.toISOString(),
      startsAt: s.startsAt?.toISOString() ?? null,
      endsAt: s.endsAt?.toISOString() ?? null,
      publishedAt: s.publishedAt?.toISOString() ?? null,
      pausedAt: s.pausedAt?.toISOString() ?? null,
      closedAt: s.closedAt?.toISOString() ?? null,
      archivedAt: s.archivedAt?.toISOString() ?? null,
      updatedAt: s.updatedAt.toISOString(),
      effectiveStatus: effectiveSessionStatus(s, now),
      redeemed,
      entitled: entMap.get(s.id) ?? 0,
      remaining,
    };
  });
}

export const getSessions = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SnackSessionWithMeta[]> => {
    await requireOperationalAuth();
    const db = assertDb();
    return toSessionMeta(db);
  }
);

/** Resolver current session — source of truth semua halaman (PRD §37). */
export const getCurrentSnackSession = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{
    session: SnackSessionWithMeta | null;
    effectiveStatus: SessionEffectiveStatus | 'NO_ACTIVE_SESSION';
    nextSession: { id: number; name: string; startsAt: string | null } | null;
  }> => {
    await requireOperationalAuth();
    const db = assertDb();
    const now = new Date();
    const sessions = await toSessionMeta(db, now);
    const published = sessions.filter((s) => s.status === 'published');
    const active =
      published.find((s) => s.effectiveStatus === 'active' || s.effectiveStatus === 'paused') ??
      null;
    const nextSession =
      published
        .filter((s) => s.startsAt && new Date(s.startsAt) > now)
        .sort((a, b) => new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime())[0] ??
      null;
    return {
      session: active,
      effectiveStatus: active ? active.effectiveStatus : 'NO_ACTIVE_SESSION',
      nextSession: nextSession
        ? { id: nextSession.id, name: nextSession.name, startsAt: nextSession.startsAt }
        : null,
    };
  }
);

/** Admin: buat sesi DRAFT. Schedule + stock opsional saat draft. */
export const createSession = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      name: string;
      startsAt?: string | null;
      endsAt?: string | null;
      stockQuota?: number | null;
      quota?: number | null; // legacy alias → stockQuota
    }) => d
  )
  .handler(async ({ data }) => {
    const db = assertDb();
    const auth = await getAuth();
    if (!isAdminRole(auth.role)) throw new Error('Tidak memiliki akses');
    if (!data.name.trim()) throw new Error('Nama sesi wajib diisi');
    const stockQuota =
      data.stockQuota !== undefined && data.stockQuota !== null
        ? Math.floor(Number(data.stockQuota))
        : data.quota !== undefined && data.quota !== null
          ? Math.floor(Number(data.quota))
          : null;
    if (stockQuota !== null && (!Number.isFinite(stockQuota) || stockQuota < 0)) {
      throw new Error('Stok harus angka >= 0');
    }
    const startsAt = data.startsAt ? new Date(data.startsAt) : null;
    const endsAt = data.endsAt ? new Date(data.endsAt) : null;
    if (startsAt && endsAt && startsAt >= endsAt) {
      throw new Error('Waktu mulai harus sebelum waktu selesai');
    }
    const [row] = await db
      .insert(snackSessions)
      .values({
        name: data.name.trim(),
        quota: stockQuota ?? 0,
        stockQuota,
        isActive: false,
        status: 'draft',
        startsAt,
        endsAt,
        createdBy: auth.username,
      })
      .returning();
    return row;
  });

/** Admin: update sesi DRAFT (nama/jadwal/stok). Published → hanya stok/nama. */
export const updateSession = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      id: number;
      name?: string;
      quota?: number;
      startsAt?: string | null;
      endsAt?: string | null;
      stockQuota?: number | null;
    }) => d
  )
  .handler(async ({ data }) => {
    const db = assertDb();
    const auth = await getAuth();
    if (!isAdminRole(auth.role)) throw new Error('Tidak memiliki akses');
    const [existing] = await db
      .select()
      .from(snackSessions)
      .where(eq(snackSessions.id, data.id))
      .limit(1);
    if (!existing) throw new Error('Sesi tidak ditemukan');
    if (existing.status !== 'draft') {
      // Published: hanya nama/stok boleh berubah; jadwal terkunci (perubahan jadwal = state efektif berubah)
      if (data.startsAt !== undefined || data.endsAt !== undefined) {
        throw new Error('Jadwal sesi terkunci setelah publish. Tutup sesi untuk mengubah jadwal.');
      }
    }
    const patch: Partial<typeof snackSessions.$inferInsert> = {};
    if (data.name !== undefined) {
      if (!data.name.trim()) throw new Error('Nama sesi wajib diisi');
      patch.name = data.name.trim();
    }
    let stockQuota = existing.stockQuota;
    if (data.stockQuota !== undefined) stockQuota = data.stockQuota;
    if (data.quota !== undefined) stockQuota = data.quota; // legacy alias menang
    if (stockQuota !== null) {
      const v = Math.floor(Number(stockQuota));
      if (!Number.isFinite(v) || v < 0) throw new Error('Stok harus angka >= 0');
      stockQuota = v;
    }
    // Guard (B2, regresi guard lama): stok tidak boleh < klaim aktif sesi ini.
    if (stockQuota !== null) {
      const [r] = await db
        .select({ cnt: count() })
        .from(redemptions)
        .where(and(eq(redemptions.sessionId, data.id), sql`${redemptions.voidedAt} IS NULL`));
      const redeemed = Number(r?.cnt ?? 0);
      const err = validateStockAgainstRedemptions(stockQuota, redeemed);
      if (err) throw new Error(err);
    }
    patch.stockQuota = stockQuota;
    patch.quota = stockQuota ?? 0;
    if (data.startsAt !== undefined)
      patch.startsAt = data.startsAt ? new Date(data.startsAt) : null;
    if (data.endsAt !== undefined) patch.endsAt = data.endsAt ? new Date(data.endsAt) : null;
    const nextStart = patch.startsAt ?? existing.startsAt;
    const nextEnd = patch.endsAt ?? existing.endsAt;
    if (nextStart && nextEnd && nextStart >= nextEnd) {
      throw new Error('Waktu mulai harus sebelum waktu selesai');
    }
    patch.updatedBy = auth.username;
    patch.updatedAt = new Date();
    const [row] = await db
      .update(snackSessions)
      .set(patch)
      .where(eq(snackSessions.id, data.id))
      .returning();
    return row;
  });

/** Admin: publish sesi — generate entitlement snapshot dari default eligibility + validasi overlap. */
export const publishSession = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    const db = assertDb();
    const auth = await getAuth();
    if (!isAdminRole(auth.role)) throw new Error('Tidak memiliki akses');
    const [s] = await db.select().from(snackSessions).where(eq(snackSessions.id, data.id)).limit(1);
    if (!s) throw new Error('Sesi tidak ditemukan');
    if (s.status !== 'draft') throw new Error('Sesi sudah dipublish');
    if (!s.startsAt || !s.endsAt) {
      throw new Error('Atur jadwal (waktu mulai & selesai) sebelum publish');
    }
    if (s.startsAt >= s.endsAt) throw new Error('Waktu mulai harus sebelum waktu selesai');
    if (s.endsAt <= new Date()) {
      throw new Error('Jadwal sesi sudah berakhir. Sesuaikan waktu selesai sebelum publish.');
    }

    // Validasi overlap (PRD §9, AC-S08): tidak boleh ada published yang overlap.
    // sessionOverlaps mengecualikan sesi yang sudah selesai waktunya (C1) —
    // status kolom tetap 'published' sampai ditutup, tapi tidak lagi distribusi.
    const candidateOverlaps = await db
      .select({
        id: snackSessions.id,
        name: snackSessions.name,
        startsAt: snackSessions.startsAt,
        endsAt: snackSessions.endsAt,
        closedAt: snackSessions.closedAt,
        archivedAt: snackSessions.archivedAt,
      })
      .from(snackSessions)
      .where(
        and(
          ne(snackSessions.id, s.id),
          eq(snackSessions.status, 'published'),
          sql`${snackSessions.closedAt} IS NULL`,
          sql`${snackSessions.archivedAt} IS NULL`,
          lt(snackSessions.startsAt, s.endsAt),
          gt(snackSessions.endsAt, s.startsAt)
        )
      )
      .limit(5);
    const overlaps = candidateOverlaps.filter((o) =>
      sessionOverlaps({ ...o, status: 'published' }, s)
    );
    if (overlaps.length > 0) {
      throw new Error(
        `Jadwal bertabrakan dengan: ${overlaps.map((o) => o.name).join(', ')}. Silakan sesuaikan waktu distribusi.`
      );
    }

    // Generate entitlement snapshot (PRD §22): default eligibility + karyawan yg sudah punya redemption.
    const eligible = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.isSnackEligible, true));
    const withRedemption = await db
      .select({ employeeId: redemptions.employeeId })
      .from(redemptions)
      .where(eq(redemptions.sessionId, s.id));
    const ids = new Set<number>(eligible.map((e) => e.id));
    for (const r of withRedemption) ids.add(r.employeeId);
    if (ids.size === 0) {
      throw new Error('Tidak ada karyawan eligible untuk sesi ini');
    }
    const ins = await db
      .insert(snackSessionEntitlements)
      .values(
        [...ids].map((employeeId) => ({
          sessionId: s.id,
          employeeId,
          entitledQty: 1,
          source: 'default_eligibility' as const,
        }))
      )
      .onConflictDoNothing()
      .returning({ id: snackSessionEntitlements.id });

    const [row] = await db
      .update(snackSessions)
      .set({
        status: 'published',
        publishedAt: new Date(),
        isActive: true,
        updatedBy: auth.username,
        updatedAt: new Date(),
      })
      .where(eq(snackSessions.id, s.id))
      .returning();
    return { session: row, entitled: ins.length || ids.size };
  });

/** Admin: pause sesi aktif (PRD §6). */
export const pauseSession = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    const db = assertDb();
    const auth = await getAuth();
    if (!isAdminRole(auth.role)) throw new Error('Tidak memiliki akses');
    const [s] = await db.select().from(snackSessions).where(eq(snackSessions.id, data.id)).limit(1);
    if (!s) throw new Error('Sesi tidak ditemukan');
    if (s.status !== 'published' || s.pausedAt || s.closedAt) {
      throw new Error('Sesi tidak bisa di-pause');
    }
    const [row] = await db
      .update(snackSessions)
      .set({
        pausedAt: new Date(),
        pausedBy: auth.username,
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(snackSessions.id, data.id))
      .returning();
    return row;
  });

/** Admin: resume sesi yang di-pause. */
export const resumeSession = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    const db = assertDb();
    const auth = await getAuth();
    if (!isAdminRole(auth.role)) throw new Error('Tidak memiliki akses');
    const [s] = await db.select().from(snackSessions).where(eq(snackSessions.id, data.id)).limit(1);
    if (!s) throw new Error('Sesi tidak ditemukan');
    if (!s.pausedAt || s.closedAt) throw new Error('Sesi tidak sedang di-pause');
    const [row] = await db
      .update(snackSessions)
      .set({ pausedAt: null, pausedBy: null, isActive: true, updatedAt: new Date() })
      .where(eq(snackSessions.id, data.id))
      .returning();
    return row;
  });

/** Admin: tutup sesi lebih cepat (PRD §6). */
export const closeSession = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    const db = assertDb();
    const auth = await getAuth();
    if (!isAdminRole(auth.role)) throw new Error('Tidak memiliki akses');
    const [s] = await db.select().from(snackSessions).where(eq(snackSessions.id, data.id)).limit(1);
    if (!s) throw new Error('Sesi tidak ditemukan');
    if (s.status !== 'published') throw new Error('Hanya sesi published yang bisa ditutup');
    const [row] = await db
      .update(snackSessions)
      .set({
        closedAt: new Date(),
        closedBy: auth.username,
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(snackSessions.id, data.id))
      .returning();
    return row;
  });

/** Admin: hapus sesi — hanya DRAFT tanpa redemption (PRD §32). */
export const deleteSession = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    const db = assertDb();
    const auth = await getAuth();
    if (!isAdminRole(auth.role)) throw new Error('Tidak memiliki akses');
    const [s] = await db.select().from(snackSessions).where(eq(snackSessions.id, data.id)).limit(1);
    if (!s) throw new Error('Sesi tidak ditemukan');
    if (s.status !== 'draft') {
      throw new Error('Sesi dengan data tidak bisa dihapus. Gunakan Tutup/Arsip.');
    }
    const reds = await db
      .select({ id: redemptions.id })
      .from(redemptions)
      .where(eq(redemptions.sessionId, data.id))
      .limit(1);
    if (reds.length > 0) {
      throw new Error('Sesi sudah memiliki pencatatan dan tidak bisa dihapus.');
    }
    await db.delete(snackSessions).where(eq(snackSessions.id, data.id));
    return { ok: true };
  });

// ─── Teams + members (tidak berubah) ───

export const getTeamsWithMembers = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SnackTeam[]> => {
    await requireOperationalAuth();
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
    await requireOperationalAuth();
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

// ─── Search karyawan (session-aware, PRD §17-18) ───

export type SearchEmployeeStatus = 'ENTITLED_UNCLAIMED' | 'ENTITLED_CLAIMED' | 'NOT_ENTITLED';

export interface SearchEmployeeResult {
  id: number;
  nama: string;
  nip: string | null;
  divisi: string | null;
  status: SearchEmployeeStatus;
  claimedAt?: string | null;
  claimedBy?: string | null;
  source?: string | null;
  voided?: boolean;
}

/**
 * Cari karyawan nama/NIP. Session-aware: status dihitung terhadap entitlement + klaim sesi tsb.
 * Tanpa sessionId → fallback global is_snack_eligible (legacy).
 */
export const searchEmployees = createServerFn({ method: 'GET' })
  .validator((d: { q: string; sessionId?: number; limit?: number }) => d)
  .handler(async ({ data }): Promise<SearchEmployeeResult[]> => {
    await requireOperationalAuth();
    const q = data.q.trim();
    if (!q) return [];
    const db = assertDb();
    const like = `%${q}%`;
    const limit = data.limit ?? 10;
    const rows = await db
      .select({
        id: employees.id,
        nama: employees.nama,
        nip: employees.nip,
        divisi: employees.divisi,
        isSnackEligible: employees.isSnackEligible,
      })
      .from(employees)
      .where(sql`(${employees.nama} ILIKE ${like} OR ${employees.nip} ILIKE ${like})`)
      .orderBy(employees.nama)
      .limit(Math.min(limit, 20));

    // Status session-aware
    let entitledIds = new Set<number>();
    const claimed = new Map<
      number,
      { claimedAt: Date; claimedBy: string; source: string; voided: boolean }
    >();
    let hasEntitlements = false;
    if (data.sessionId) {
      const ents = await db
        .select({ employeeId: snackSessionEntitlements.employeeId })
        .from(snackSessionEntitlements)
        .where(eq(snackSessionEntitlements.sessionId, data.sessionId));
      hasEntitlements = ents.length > 0;
      entitledIds = new Set(ents.map((e) => e.employeeId));
      const reds = await db
        .select({
          employeeId: redemptions.employeeId,
          claimedAt: redemptions.claimedAt,
          claimedBy: redemptions.claimedBy,
          source: redemptions.source,
          voidedAt: redemptions.voidedAt,
        })
        .from(redemptions)
        .where(
          and(
            eq(redemptions.sessionId, data.sessionId),
            inArray(
              redemptions.employeeId,
              rows.map((r) => r.id)
            )
          )
        );
      for (const r of reds) {
        claimed.set(r.employeeId, {
          claimedAt: r.claimedAt,
          claimedBy: r.claimedBy,
          source: r.source,
          voided: !!r.voidedAt,
        });
      }
    }

    return rows.map((r): SearchEmployeeResult => {
      const c = claimed.get(r.id);
      if (data.sessionId && hasEntitlements) {
        const entitled = entitledIds.has(r.id);
        if (!entitled)
          return { id: r.id, nama: r.nama, nip: r.nip, divisi: r.divisi, status: 'NOT_ENTITLED' };
        const active = c && !c.voided;
        return {
          id: r.id,
          nama: r.nama,
          nip: r.nip,
          divisi: r.divisi,
          status: active ? 'ENTITLED_CLAIMED' : 'ENTITLED_UNCLAIMED',
          claimedAt: c?.claimedAt?.toISOString() ?? null,
          claimedBy: c?.claimedBy ?? null,
          source: c?.source ?? null,
          voided: c?.voided ?? false,
        };
      }
      // Legacy / tanpa session: pakai global eligibility
      if (!r.isSnackEligible) {
        return { id: r.id, nama: r.nama, nip: r.nip, divisi: r.divisi, status: 'NOT_ENTITLED' };
      }
      const active = c && !c.voided;
      return {
        id: r.id,
        nama: r.nama,
        nip: r.nip,
        divisi: r.divisi,
        status: active ? 'ENTITLED_CLAIMED' : 'ENTITLED_UNCLAIMED',
        claimedAt: c?.claimedAt?.toISOString() ?? null,
        claimedBy: c?.claimedBy ?? null,
        source: c?.source ?? null,
        voided: c?.voided ?? false,
      };
    });
  });

// ─── Redeem v2 (source + idempotency + entitlement + stok atomic) ───

/**
 * Insert batch redemption utk daftar employee pada session.
 * - Session harus efektif ACTIVE (bukan draft/scheduled/paused/closed).
 * - Employee harus punya entitlement (fallback global is_snack_eligible bila sesi tanpa entitlement).
 * - Anti-dup: partial unique index (employee, session) WHERE voided_at IS NULL → conflict = skipped.
 * - Idempotency: request_id sama → return idempotent tanpa insert ganda.
 * - Stok: cek di dalam transaksi dgn lock session row (atomic, PRD §34).
 */
export const redeemSnack = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      sessionId: number;
      employeeIds: number[];
      source?: 'QR_TEAM' | 'SEARCH';
      requestId?: string;
    }) => d
  )
  .handler(async ({ data }): Promise<RedeemResult> => {
    const db = assertDb();
    const { sessionId, employeeIds } = data;
    const source = data.source ?? 'QR_TEAM';
    const requestId = data.requestId?.trim() || undefined;

    const auth = await getAuth();
    const claimedBy = auth.username ?? null;
    if (!claimedBy) {
      return {
        ok: false,
        inserted: 0,
        skipped: [],
        error: 'Sesi tidak valid. Silakan login dulu.',
      };
    }
    if (employeeIds.length === 0) {
      return { ok: false, inserted: 0, skipped: [], error: 'Tidak ada karyawan dipilih' };
    }

    const result = await db.transaction(async (tx) => {
      // Lock session row → serialisasi batch per sesi (stok atomic, PRD §34)
      const [sessionRow] = await tx
        .select()
        .from(snackSessions)
        .where(eq(snackSessions.id, sessionId))
        .for('update')
        .limit(1);
      if (!sessionRow) {
        return {
          ok: false,
          inserted: 0,
          skipped: [],
          error: 'Sesi tidak ditemukan',
        } as RedeemResult;
      }
      const eff = effectiveSessionStatus(sessionRow, new Date());
      if (eff !== 'active') {
        const msg =
          eff === 'paused'
            ? 'Distribusi sementara dihentikan oleh Admin'
            : eff === 'closed'
              ? 'Sesi sudah ditutup. Pengambilan baru tidak dapat dicatat.'
              : eff === 'scheduled'
                ? 'Sesi belum dimulai'
                : 'Sesi tidak aktif';
        return { ok: false, inserted: 0, skipped: [], error: msg } as RedeemResult;
      }

      // Idempotency (PRD §35): request sama → sudah diproses
      if (requestId) {
        const existingReq = await tx
          .select({ id: redemptions.id })
          .from(redemptions)
          .where(eq(redemptions.requestId, requestId))
          .limit(1);
        if (existingReq.length > 0) {
          return { ok: true, inserted: 0, skipped: [], idempotent: true } as RedeemResult;
        }
      }

      // Entitlement + eligibility
      const ents = await tx
        .select({ employeeId: snackSessionEntitlements.employeeId })
        .from(snackSessionEntitlements)
        .where(eq(snackSessionEntitlements.sessionId, sessionId));
      const hasEntitlements = ents.length > 0;
      const entitledIds = new Set(ents.map((e) => e.employeeId));

      const empRows = await tx
        .select({
          id: employees.id,
          nama: employees.nama,
          isSnackEligible: employees.isSnackEligible,
        })
        .from(employees)
        .where(inArray(employees.id, employeeIds));
      if (empRows.length !== employeeIds.length) {
        return {
          ok: false,
          inserted: 0,
          skipped: [],
          error: 'Ada karyawan tidak ditemukan',
        } as RedeemResult;
      }
      const rejected: string[] = [];
      for (const e of empRows) {
        const ok = hasEntitlements ? entitledIds.has(e.id) : e.isSnackEligible;
        if (!ok) rejected.push(e.nama);
      }
      if (rejected.length) {
        return {
          ok: false,
          inserted: 0,
          skipped: [],
          error: `${rejected.join(', ')} tidak termasuk penerima sesi ini`,
        } as RedeemResult;
      }

      // Stok (PRD §24-25): stock_quota nullable = tanpa batas
      const stock = effectiveStock(sessionRow);
      if (stock !== null) {
        const [r] = await tx
          .select({ cnt: count() })
          .from(redemptions)
          .where(and(eq(redemptions.sessionId, sessionId), sql`${redemptions.voidedAt} IS NULL`));
        const taken = Number(r?.cnt ?? 0);
        if (taken >= stock) {
          return {
            ok: false,
            inserted: 0,
            skipped: [],
            error: 'Stok snack sudah habis',
          } as RedeemResult;
        }
        const quotaLeft = stock - taken;
        if (employeeIds.length > quotaLeft) {
          return {
            ok: false,
            inserted: 0,
            skipped: [],
            error: `Melebihi sisa stok (sisa ${quotaLeft} porsi)`,
          } as RedeemResult;
        }
      }

      // Metadata skipped: klaim AKTIF yang SUDAH ADA sebelum batch ini.
      // Dihitung SEBELUM insert — row yang baru di-insert TIDAK boleh masuk skipped,
      // kalau tidak setiap klaim fresh tampil sebagai "Sudah Pernah Ambil".
      const existing = await tx
        .select({
          id: redemptions.id,
          employeeId: redemptions.employeeId,
          claimedBy: redemptions.claimedBy,
          claimedAt: redemptions.claimedAt,
        })
        .from(redemptions)
        .where(
          and(
            eq(redemptions.sessionId, sessionId),
            inArray(redemptions.employeeId, employeeIds),
            sql`${redemptions.voidedAt} IS NULL`
          )
        );
      const skipped: RedemptionInfo[] = existing.map((r) => ({
        id: r.id,
        employeeId: r.employeeId,
        claimedBy: r.claimedBy,
        claimedAt: r.claimedAt.toISOString(),
      }));

      // Insert batch — onConflictDoNothing menangani anti-dup (employee, session) + request_id
      const values = employeeIds.map((employeeId) => ({
        employeeId,
        sessionId,
        claimedBy,
        source,
        requestId: requestId ?? null,
      }));
      const inserted = await tx
        .insert(redemptions)
        .values(values)
        .onConflictDoNothing()
        .returning({ id: redemptions.id, employeeId: redemptions.employeeId });

      return { ok: true, inserted: inserted.length, skipped };
    });

    return result;
  });

/** Admin: batalkan pencatatan (void soft-delete, PRD §31-33). */
export const voidRedemption = createServerFn({ method: 'POST' })
  .validator((d: { redemptionId: number; reason: string }) => d)
  .handler(async ({ data }) => {
    const db = assertDb();
    const auth = await getAuth();
    if (!isAdminRole(auth.role)) return { ok: false, error: 'Tidak memiliki akses' };
    if (!data.reason.trim()) return { ok: false, error: 'Alasan koreksi wajib diisi' };
    const [r] = await db
      .select()
      .from(redemptions)
      .where(eq(redemptions.id, data.redemptionId))
      .limit(1);
    if (!r) return { ok: false, error: 'Pencatatan tidak ditemukan' };
    if (r.voidedAt) return { ok: false, error: 'Pencatatan sudah dibatalkan' };
    await db
      .update(redemptions)
      .set({
        voidedAt: new Date(),
        voidedBy: auth.username,
        voidReason: data.reason.trim(),
      })
      .where(eq(redemptions.id, data.redemptionId));
    return { ok: true };
  });

// ─── Summary dashboard (employee-centric, PRD §26-28) ───

export interface TeamProgressRow {
  id: number;
  nama: string;
  kode: string;
  kategori: string;
  total: number; // jumlah anggota ter-entitle
  claimed: number; // klaim aktif
  status: 'NOT_STARTED' | 'PARTIAL' | 'COMPLETE';
}

export const getRedemptionSummary = createServerFn({ method: 'GET' })
  .validator((d: { sessionId?: number }) => d)
  .handler(async ({ data }) => {
    await requireOperationalAuth();
    const db = assertDb();
    const now = new Date();
    const sessions = await toSessionMeta(db, now);
    const current = await getCurrentSnackSession();
    let session = null;
    if (data.sessionId) {
      session = sessions.find((s) => s.id === data.sessionId) ?? null;
    }
    if (!session) session = current.session;

    if (!session) {
      return {
        session: null,
        effectiveStatus: current.effectiveStatus,
        nextSession: current.nextSession,
        entitled: 0,
        claimed: 0,
        remaining: 0,
        progressPct: 0,
        stock: null,
        stockUsed: 0,
        stockRemaining: null,
        teams: [] as TeamProgressRow[],
        sessions,
      };
    }

    // Entitlement
    const ents = await db
      .select({ employeeId: snackSessionEntitlements.employeeId })
      .from(snackSessionEntitlements)
      .where(eq(snackSessionEntitlements.sessionId, session.id));
    const entitledIds = new Set(ents.map((e) => e.employeeId));
    const entitled = ents.length;

    // Klaim aktif
    const reds = await db
      .select({ employeeId: redemptions.employeeId })
      .from(redemptions)
      .where(and(eq(redemptions.sessionId, session.id), sql`${redemptions.voidedAt} IS NULL`));
    const claimedIds = new Set(reds.map((r) => r.employeeId));
    const claimed = reds.length;

    // Stok
    const stock = effectiveStock(session);
    const stockUsed = claimed;
    const stockRemaining = stock === null ? null : Math.max(0, stock - claimed);

    // Progress tim (PRD §28): NOT_STARTED / PARTIAL / COMPLETE
    const teamsRows = await db.select().from(teams).orderBy(teams.kategori, teams.nomor);
    const members = await db
      .select({ teamId: teamMembers.teamId, employeeId: teamMembers.employeeId })
      .from(teamMembers);
    const memberByTeam = new Map<number, number[]>();
    for (const m of members) {
      const list = memberByTeam.get(m.teamId) ?? [];
      list.push(m.employeeId);
      memberByTeam.set(m.teamId, list);
    }
    const teamProgress: TeamProgressRow[] = teamsRows.map((t) => {
      const ids = (memberByTeam.get(t.id) ?? []).filter((id) => entitledIds.has(id));
      const c = ids.filter((id) => claimedIds.has(id)).length;
      let status: TeamProgressRow['status'] = 'NOT_STARTED';
      if (ids.length > 0 && c === ids.length) status = 'COMPLETE';
      else if (c > 0) status = 'PARTIAL';
      return {
        id: t.id,
        nama: t.nama,
        kode: t.kode ?? '',
        kategori: t.kategori,
        total: ids.length,
        claimed: c,
        status,
      };
    });

    return {
      session,
      effectiveStatus: session.effectiveStatus,
      nextSession: current.nextSession,
      entitled,
      claimed,
      remaining: Math.max(0, entitled - claimed),
      progressPct: entitled > 0 ? Math.round((claimed / entitled) * 100) : 0,
      stock,
      stockUsed,
      stockRemaining,
      teams: teamProgress,
      sessions,
    };
  });

// ─── Detail per tim (siapa sudah ambil, dengan source) ───

export interface MemberRedemptionDetail {
  employeeId: number;
  nama: string;
  nip: string | null;
  divisi: string | null;
  claimedBy: string | null;
  claimedAt: string | null;
  source: string | null;
  voidedAt: string | null;
  voidedBy: string | null;
  voidReason: string | null;
}

export const getRedemptionsBySession = createServerFn({ method: 'POST' })
  .validator((d: { sessionId: number; teamId: number }) => d)
  .handler(async ({ data }): Promise<MemberRedemptionDetail[]> => {
    await requireOperationalAuth();
    const db = assertDb();
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

    const empIds = members.map((m) => m.employeeId);
    const reds =
      empIds.length > 0
        ? await db
            .select({
              employeeId: redemptions.employeeId,
              claimedBy: redemptions.claimedBy,
              claimedAt: redemptions.claimedAt,
              source: redemptions.source,
              voidedAt: redemptions.voidedAt,
              voidedBy: redemptions.voidedBy,
              voidReason: redemptions.voidReason,
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
        source: r?.source ?? null,
        voidedAt: r?.voidedAt?.toISOString() ?? null,
        voidedBy: r?.voidedBy ?? null,
        voidReason: r?.voidReason ?? null,
      };
    });
  });

// ─── Riwayat aktivitas (PRD §29) ───

export interface RedemptionHistoryRow {
  id: number;
  employeeId: number;
  employeeName: string;
  sessionId: number;
  sessionName: string;
  claimedBy: string;
  claimedAt: string;
  source: string;
  quantity: number;
  voidedAt: string | null;
  voidedBy: string | null;
  voidReason: string | null;
}

export const getRedemptionHistory = createServerFn({ method: 'GET' })
  .validator((d: { sessionId?: number; limit?: number }) => d)
  .handler(async ({ data }): Promise<RedemptionHistoryRow[]> => {
    await requireOperationalAuth();
    const db = assertDb();
    const limit = Math.min(data.limit ?? 100, 300);
    const rows = await db
      .select({
        id: redemptions.id,
        employeeId: redemptions.employeeId,
        employeeName: employees.nama,
        sessionId: redemptions.sessionId,
        sessionName: snackSessions.name,
        claimedBy: redemptions.claimedBy,
        claimedAt: redemptions.claimedAt,
        source: redemptions.source,
        quantity: redemptions.quantity,
        voidedAt: redemptions.voidedAt,
        voidedBy: redemptions.voidedBy,
        voidReason: redemptions.voidReason,
      })
      .from(redemptions)
      .innerJoin(employees, eq(redemptions.employeeId, employees.id))
      .innerJoin(snackSessions, eq(redemptions.sessionId, snackSessions.id))
      .where(data.sessionId ? eq(redemptions.sessionId, data.sessionId) : undefined)
      .orderBy(desc(redemptions.claimedAt))
      .limit(limit);
    return rows.map((r) => ({
      ...r,
      claimedAt: r.claimedAt.toISOString(),
      voidedAt: r.voidedAt?.toISOString() ?? null,
    }));
  });
