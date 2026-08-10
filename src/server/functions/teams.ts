/**
 * Server functions — Teams & team members CRUD + data publik.
 *
 * Admin (superadmin/admin): listTeams, createTeam, updateTeam, deleteTeam,
 * addTeamMember, removeTeamMember. Guard duplikat (kategori, nomor) & (team, employee).
 *
 * Publik: getTeams / getTeamSummary — DB-backed dengan fallback data statis
 * (dataKelompok) bila DATABASE_URL tidak dikonfigurasi. Hanya putra & putri
 * (tim panitia tidak tampil di halaman publik /tim).
 */
import { createServerFn } from '@tanstack/react-start'
import { and, eq, inArray, ne, sql } from 'drizzle-orm'
import { assertDb, db } from '../db'
import { isUniqueViolation } from '../db/errors'
import { employees, teamMembers, teams } from '../db/schema'
import { dataKelompok, summaryKelompok } from '../../data/kelompok'

type KategoriTeam = 'putra' | 'putri' | 'panitia'

function labelKategori(k: string): string {
  return k === 'putra' ? 'Putra' : k === 'putri' ? 'Putri' : 'Panitia'
}

// ─── Admin: Teams ───

interface TeamMemberShape {
  id: number
  employeeId: number
  sortOrder: number
  nama: string
  nip: string | null
  divisi: string | null
}

export const listTeams = createServerFn({ method: 'GET' }).handler(async () => {
  const database = assertDb()
  const teamRows = await database.select().from(teams).orderBy(
    sql`case when ${teams.kategori} = 'putra' then 1 when ${teams.kategori} = 'putri' then 2 else 3 end`,
    teams.nomor,
  )
  const memberRows = await database
    .select({
      id: teamMembers.id,
      teamId: teamMembers.teamId,
      employeeId: teamMembers.employeeId,
      sortOrder: teamMembers.sortOrder,
      nama: employees.nama,
      nip: employees.nip,
      divisi: employees.divisi,
    })
    .from(teamMembers)
    .innerJoin(employees, eq(teamMembers.employeeId, employees.id))
    .orderBy(teamMembers.sortOrder)
  const byTeam = new Map<number, TeamMemberShape[]>()
  for (const m of memberRows) {
    const list = byTeam.get(m.teamId) ?? []
    list.push({ id: m.id, employeeId: m.employeeId, sortOrder: m.sortOrder, nama: m.nama, nip: m.nip, divisi: m.divisi })
    byTeam.set(m.teamId, list)
  }
  return teamRows.map((t) => ({ ...t, members: byTeam.get(t.id) ?? [] }))
})

export const createTeam = createServerFn({ method: 'POST' })
  .validator((d: { kategori: KategoriTeam; nomor: number | null; nama: string; kode?: string | null }) => d)
  .handler(async ({ data }) => {
    const database = assertDb()
    const nama = data.nama.trim()
    if (!nama) throw new Error('Nama tim wajib diisi')
    const nomor = data.kategori === 'panitia' ? null : data.nomor
    if (nomor !== null && (nomor < 1 || !Number.isInteger(nomor))) {
      throw new Error('Nomor tim wajib angka positif')
    }
    if (nomor !== null) {
      const dup = await database
        .select({ id: teams.id })
        .from(teams)
        .where(and(eq(teams.kategori, data.kategori), eq(teams.nomor, nomor)))
        .limit(1)
      if (dup.length) throw new Error(`Nomor ${nomor} sudah dipakai kategori ${labelKategori(data.kategori)}`)
    }
    const kode = data.kode?.trim() || (data.kategori === 'panitia' ? 'PANITIA' : `${data.kategori.toUpperCase()}-${nomor}`)
    try {
      const [row] = await database.insert(teams).values({ kategori: data.kategori, nomor, nama, kode }).returning()
      return row
    } catch (err) {
      if (isUniqueViolation(err)) throw new Error(`Kode ${kode} sudah dipakai tim lain`)
      throw err
    }
  })

export const updateTeam = createServerFn({ method: 'POST' })
  .validator((d: { id: number; kategori?: KategoriTeam; nomor?: number | null; nama?: string; kode?: string | null }) => d)
  .handler(async ({ data }) => {
    const database = assertDb()
    const [current] = await database.select().from(teams).where(eq(teams.id, data.id)).limit(1)
    if (!current) throw new Error('Tim tidak ditemukan')

    const patch: Partial<typeof teams.$inferInsert> = {}
    if (data.nama !== undefined) {
      const nama = data.nama.trim()
      if (!nama) throw new Error('Nama tim wajib diisi')
      patch.nama = nama
    }
    const kategori = data.kategori ?? current.kategori
    const nomor = data.nomor !== undefined ? (data.nomor ?? null) : current.nomor
    if (kategori !== 'panitia' && nomor !== null && (nomor < 1 || !Number.isInteger(nomor))) {
      throw new Error('Nomor tim wajib angka positif')
    }
    if (kategori !== 'panitia' && nomor === null) throw new Error('Nomor tim wajib diisi untuk kategori ini')
    patch.kategori = kategori
    patch.nomor = kategori === 'panitia' ? null : nomor

    if (kategori !== 'panitia' && nomor !== null) {
      const dup = await database
        .select({ id: teams.id })
        .from(teams)
        .where(and(eq(teams.kategori, kategori), eq(teams.nomor, nomor), ne(teams.id, data.id)))
        .limit(1)
      if (dup.length) throw new Error(`Nomor ${nomor} sudah dipakai kategori ${labelKategori(kategori)}`)
    }

    if (data.kode !== undefined) patch.kode = data.kode?.trim() || null
    try {
      const [row] = await database.update(teams).set(patch).where(eq(teams.id, data.id)).returning()
      return row
    } catch (err) {
      if (isUniqueViolation(err)) throw new Error(`Kode ${patch.kode} sudah dipakai tim lain`)
      throw err
    }
  })

export const deleteTeam = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    const database = assertDb()
    await database.delete(teams).where(eq(teams.id, data.id)) // members ikut cascade
    return { ok: true }
  })

// ─── Admin: Team Members ───

export const addTeamMember = createServerFn({ method: 'POST' })
  .validator((d: { teamId: number; employeeId: number }) => d)
  .handler(async ({ data }) => {
    const database = assertDb()
    const dup = await database
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, data.teamId), eq(teamMembers.employeeId, data.employeeId)))
      .limit(1)
    if (dup.length) throw new Error('Karyawan sudah terdaftar di tim ini')
    const [{ max }] = await database
      .select({ max: sql<number>`coalesce(max(${teamMembers.sortOrder}), 0)` })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, data.teamId))
    const [row] = await database
      .insert(teamMembers)
      .values({ teamId: data.teamId, employeeId: data.employeeId, sortOrder: max + 1 })
      .returning()
    return row
  })

export const removeTeamMember = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    const database = assertDb()
    await database.delete(teamMembers).where(eq(teamMembers.id, data.id))
    return { ok: true }
  })

// ─── Publik (/tim) — DB-backed, fallback statis ───

export const getTeams = createServerFn({ method: 'GET' }).handler(async () => {
  if (!db) return dataKelompok
  const teamRows = await db
    .select()
    .from(teams)
    .where(inArray(teams.kategori, ['putra', 'putri']))
    .orderBy(sql`case when ${teams.kategori} = 'putra' then 1 else 2 end`, teams.nomor)
  const memberRows = await db
    .select({ teamId: teamMembers.teamId, nama: employees.nama })
    .from(teamMembers)
    .innerJoin(employees, eq(teamMembers.employeeId, employees.id))
    .orderBy(teamMembers.sortOrder)
  const byTeam = new Map<number, string[]>()
  for (const m of memberRows) {
    const list = byTeam.get(m.teamId) ?? []
    list.push(m.nama)
    byTeam.set(m.teamId, list)
  }
  return teamRows.map((t) => ({
    id: String(t.id),
    kategori: t.kategori,
    nomor: t.nomor,
    nama: t.nama,
    anggota: byTeam.get(t.id) ?? [],
  }))
})

export const getTeamSummary = createServerFn({ method: 'GET' }).handler(async () => {
  if (!db) return summaryKelompok
  const rows = await db
    .select({ kategori: teams.kategori, count: sql<number>`count(*)::int` })
    .from(teams)
    .where(inArray(teams.kategori, ['putra', 'putri']))
    .groupBy(teams.kategori)
  const putra = rows.find((r) => r.kategori === 'putra')?.count ?? 0
  const putri = rows.find((r) => r.kategori === 'putri')?.count ?? 0
  return { total: putra + putri, putra, putri }
})
