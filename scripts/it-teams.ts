/**
 * Integration test — Teams CRUD constraints (DB level).
 * 1) teams.kode unique → 23505 via isUniqueViolation helper.
 * 2) team_members unique (teamId, employeeId) → 23505.
 * 3) Cascade delete: hapus team → members ikut terhapus.
 * 4) Cascade delete: hapus employee → membership terhapus.
 * Data test dihapus setelah selesai. Run: bun scripts/it-teams.ts
 */

import { eq, inArray } from 'drizzle-orm';
import { db } from '../src/server/db';
import { isUniqueViolation } from '../src/server/db/errors';
import { employees, teamMembers, teams } from '../src/server/db/schema';

let failed = 0;
const check = (name: string, cond: boolean, detail?: string) => {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

const TEST_TEAM_CODES = ['IT-TEST-A', 'IT-TEST-B'];
const TEST_NIP = 'IT-NIP-081';
let teamAId: number;
let teamBId: number;
let empId: number;

async function cleanup() {
  if (teamAId)
    await db!
      .delete(teams)
      .where(eq(teams.id, teamAId))
      .catch(() => {});
  if (teamBId)
    await db!
      .delete(teams)
      .where(eq(teams.id, teamBId))
      .catch(() => {});
  if (empId)
    await db!
      .delete(employees)
      .where(eq(employees.id, empId))
      .catch(() => {});
  // sisa aman (kalau delete gagal karena FK)
  await db!
    .delete(teamMembers)
    .where(inArray(teamMembers.teamId, [teamAId, teamBId]))
    .catch(() => {});
}

// ── setup: 2 tim + 1 karyawan ──
const [a] = await db!
  .insert(teams)
  .values({ kategori: 'putra', nomor: 99, nama: 'IT Test A', kode: TEST_TEAM_CODES[0] })
  .returning();
teamAId = a.id;
const [b] = await db!
  .insert(teams)
  .values({ kategori: 'putri', nomor: 99, nama: 'IT Test B', kode: TEST_TEAM_CODES[1] })
  .returning();
teamBId = b.id;
const [emp] = await db!
  .insert(employees)
  .values({ nama: 'IT Test Karyawan', nip: TEST_NIP })
  .returning();
empId = emp.id;
check('setup 2 tim + 1 karyawan', !!teamAId && !!teamBId && !!empId);

// ── 1) kode duplikat → 23505 (helper isUniqueViolation) ──
let dupKode = false;
try {
  await db!
    .insert(teams)
    .values({ kategori: 'putra', nomor: 100, nama: 'IT Test Dupe', kode: TEST_TEAM_CODES[0] });
} catch (e) {
  dupKode = isUniqueViolation(e);
}
check('kode duplikat → isUniqueViolation true', dupKode);

// ── 2) member duplikat (team, employee) → 23505 ──
await db!.insert(teamMembers).values({ teamId: teamAId, employeeId: empId, sortOrder: 1 });
let dupMember = false;
try {
  await db!.insert(teamMembers).values({ teamId: teamAId, employeeId: empId, sortOrder: 2 });
} catch (e) {
  dupMember = isUniqueViolation(e);
}
check('member duplikat (team, employee) → 23505', dupMember);

// ── 3) cascade: hapus team → members ikut hapus ──
await db!.delete(teams).where(eq(teams.id, teamAId));
const afterTeamDelete = await db!
  .select({ id: teamMembers.id })
  .from(teamMembers)
  .where(eq(teamMembers.teamId, teamAId));
check('hapus team → members cascade terhapus', afterTeamDelete.length === 0);
teamAId = 0; // sudah dihapus

// ── 4) cascade: hapus employee → membership terhapus ──
await db!.insert(teamMembers).values({ teamId: teamBId, employeeId: empId, sortOrder: 1 });
await db!.delete(employees).where(eq(employees.id, empId));
const afterEmpDelete = await db!
  .select({ id: teamMembers.id })
  .from(teamMembers)
  .where(eq(teamMembers.employeeId, empId));
check('hapus employee → membership cascade terhapus', afterEmpDelete.length === 0);
empId = 0; // sudah dihapus

await cleanup();
console.log(failed > 0 ? `✗ ${failed} check gagal` : '✓ Semua check lulus');
process.exit(failed > 0 ? 1 : 0);
