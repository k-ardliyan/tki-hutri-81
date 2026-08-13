/**
 * Server functions — admin/superadmin: users & employees CRUD.
 * Superadmin: users (create/update/reset/toggle). Admin+superadmin: employees.
 */
import { createServerFn } from '@tanstack/react-start';
import { desc, eq, ilike } from 'drizzle-orm';
import type { UserRole } from '../../lib/auth';
import { hashPassword } from '../../lib/auth';
import { assertDb } from '../db';
import { employees, users } from '../db/schema';
import { adminOnly } from '../middleware/auth';

// ─── Users (superadmin only — guard di route) ───

export const listUsers = createServerFn({ method: 'GET' })
  .middleware([adminOnly])
  .handler(async () => {
    const db = assertDb();
    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        isActive: users.isActive,
        employeeId: users.employeeId,
        employeeNama: employees.nama,
        employeeNip: employees.nip,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(employees, eq(users.employeeId, employees.id))
      .orderBy(desc(users.id));
    return rows;
  });

/** Create user: dari employee existing ATAU user baru (tanpa employee). */
export const createUser = createServerFn({ method: 'POST' })
  .middleware([adminOnly])
  .validator(
    (d: { username: string; password: string; role: UserRole; employeeId?: number | null }) => d
  )
  .handler(async ({ data }) => {
    const db = assertDb();
    const passwordHash = await hashPassword(data.password);
    const [row] = await db
      .insert(users)
      .values({
        username: data.username,
        passwordHash,
        role: data.role,
        employeeId: data.employeeId ?? null,
      })
      .returning();
    return row;
  });

export const updateUser = createServerFn({ method: 'POST' })
  .middleware([adminOnly])
  .validator((d: { id: number; username?: string; role?: UserRole; isActive?: boolean }) => d)
  .handler(async ({ data }) => {
    const db = assertDb();
    const patch: Partial<typeof users.$inferInsert> = {};
    if (data.username !== undefined) patch.username = data.username;
    if (data.role) patch.role = data.role;
    if (data.isActive !== undefined) patch.isActive = data.isActive;
    const [row] = await db.update(users).set(patch).where(eq(users.id, data.id)).returning();
    return row;
  });

export const resetPassword = createServerFn({ method: 'POST' })
  .middleware([adminOnly])
  .validator((d: { id: number; password: string }) => d)
  .handler(async ({ data }) => {
    const db = assertDb();
    const passwordHash = await hashPassword(data.password);
    const [row] = await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, data.id))
      .returning();
    return row;
  });

export const deleteUser = createServerFn({ method: 'POST' })
  .middleware([adminOnly])
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    const db = assertDb();
    await db.delete(users).where(eq(users.id, data.id));
    return { ok: true };
  });

// ─── Employees (admin + superadmin) ───

export const listEmployees = createServerFn({ method: 'GET' })
  .middleware([adminOnly])
  .validator((d: { q?: string; limit?: number }) => d)
  .handler(async ({ data }) => {
    const db = assertDb();
    const q = data.q?.trim();
    const base = db.select().from(employees);
    const rows = q
      ? await base
          .where(ilike(employees.nama, `%${q}%`))
          .orderBy(employees.nama)
          .limit(data.limit ?? 50)
      : await base.orderBy(employees.nama).limit(data.limit ?? 50);
    return rows;
  });

export const createEmployee = createServerFn({ method: 'POST' })
  .middleware([adminOnly])
  .validator(
    (d: { nama: string; nip?: string | null; divisi?: string | null; isSnackEligible?: boolean }) =>
      d
  )
  .handler(async ({ data }) => {
    const db = assertDb();
    const [row] = await db
      .insert(employees)
      .values({
        nama: data.nama,
        nip: data.nip || null,
        divisi: data.divisi || null,
        isSnackEligible: data.isSnackEligible ?? true,
      })
      .returning();
    return row;
  });

export const updateEmployee = createServerFn({ method: 'POST' })
  .middleware([adminOnly])
  .validator(
    (d: {
      id: number;
      nama?: string;
      nip?: string | null;
      divisi?: string | null;
      isSnackEligible?: boolean;
    }) => d
  )
  .handler(async ({ data }) => {
    const db = assertDb();
    const patch: Partial<typeof employees.$inferInsert> = {};
    if (data.nama !== undefined) patch.nama = data.nama;
    if (data.nip !== undefined) patch.nip = data.nip || null;
    if (data.divisi !== undefined) patch.divisi = data.divisi || null;
    if (data.isSnackEligible !== undefined) patch.isSnackEligible = data.isSnackEligible;
    const [row] = await db
      .update(employees)
      .set(patch)
      .where(eq(employees.id, data.id))
      .returning();
    return row;
  });

export const deleteEmployee = createServerFn({ method: 'POST' })
  .middleware([adminOnly])
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    const db = assertDb();
    await db.delete(employees).where(eq(employees.id, data.id));
    return { ok: true };
  });
