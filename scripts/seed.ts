/**
 * Seed runner — TRUNCATE semua tabel (cascade), lalu insert data.
 * Jalankan: bun run db:seed
 *
 * Model employee-centric:
 * 1. employees (122) — master
 * 2. teams (14) — 8 putra + 5 putri + 1 panitia, kode QR
 * 3. team_members (93) — junction employeeId, di-map dari nama → employee (normalized match)
 * 4. users (3 superadmin) — password default admin123 (wajib ganti via UI)
 * 5. snack_sessions + redemptions (kosong)
 * 6. content statis (events, competitions, dll)
 *
 * Requires DATABASE_URL in .env
 */
import { assertDb } from '../src/server/db/index'
import {
  events,
  keyDates,
  roomAreas,
  landingHighlights,
  rundownPhases,
  rundownItems,
  competitions,
  competitionSections,
  teams,
  teamMembers,
  eventPhases,
  employees,
  users,
  snackSessions,
  redemptions,
} from '../src/server/db/schema'
import { hashPassword } from '../src/lib/auth'
import { eventsSeed, keyDatesSeed, roomAreasSeed, landingHighlightsSeed, rundownPhasesSeed, rundownItemsSeed } from './seed-data/events'
import { competitionsSeed, competitionSectionsSeed } from './seed-data/competitions'
import { phasesSeed } from './seed-data/phases'
import { employeesSeed } from './seed-data/employees'
import { teamsSeed, teamMemberNamesSeed, superadminNames } from './seed-data/teams'

/** Normalize name for fuzzy match (seed spelling vs employees.json) */
function norm(s: string): string {
  return String(s)
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/['.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Alias: nama di seed → nama di employees.json (perbedaan ejaan). */
const NAME_ALIASES: Record<string, string> = {
  'Beryl Galih Ardiansyah': 'Beryl Galih Ardhiansyah', // employees: "ARDHIANSYAH" (h, tanpa y)
}

async function main() {
  const db = assertDb()

  console.log('🗑️  TRUNCATE semua tabel (cascade)...')
  // reverse dependency order
  await db.delete(teamMembers)
  await db.delete(teams)
  await db.delete(redemptions).catch(() => {})
  await db.delete(snackSessions).catch(() => {})
  await db.delete(users)
  await db.delete(employees)
  await db.delete(competitionSections)
  await db.delete(competitions)
  await db.delete(rundownItems)
  await db.delete(rundownPhases)
  await db.delete(eventPhases)
  await db.delete(landingHighlights)
  await db.delete(keyDates)
  await db.delete(roomAreas)
  await db.delete(events)

  // ── 1. Employees ──
  console.log(`📥 Seed employees (${employeesSeed.length})...`)
  const insertedEmployees = await db.insert(employees).values(employeesSeed).returning({ id: employees.id, nama: employees.nama })
  const empByNorm = new Map<string, number>()
  for (const e of insertedEmployees) {
    empByNorm.set(norm(e.nama), e.id)
  }
  const empIdByName = (nama: string): number | null => {
    const aliased = NAME_ALIASES[nama] ?? nama
    return empByNorm.get(norm(aliased)) ?? null
  }

  // ── 2. Teams ──
  console.log(`📥 Seed teams (${teamsSeed.length})...`)
  const teamIdByKode = new Map<string, number>()
  for (const team of teamsSeed) {
    const [inserted] = await db.insert(teams).values(team).returning({ id: teams.id, kode: teams.kode })
    teamIdByKode.set(team.kode, inserted.id)
  }

  // ── 3. Team members (junction) ──
  console.log('📥 Seed team_members (junction employeeId)...')
  let memberCount = 0
  const unmatched: string[] = []
  for (const team of teamsSeed) {
    const teamId = teamIdByKode.get(team.kode)!
    const names = teamMemberNamesSeed[team.nama] ?? []
    for (let i = 0; i < names.length; i++) {
      const empId = empIdByName(names[i])
      if (empId === null) {
        unmatched.push(`${team.nama} → ${names[i]}`)
        continue
      }
      await db.insert(teamMembers).values({ teamId, employeeId: empId, sortOrder: i + 1 })
      memberCount++
    }
  }
  if (unmatched.length) {
    console.warn(`⚠️  ${unmatched.length} member tidak match ke employee (skip):`)
    for (const u of unmatched) console.warn(`   - ${u}`)
  }

  // ── 4. Users (3 superadmin) ──
  console.log('📥 Seed users (3 superadmin)...')
  const DEFAULT_PASS = 'admin123'
  for (const name of superadminNames) {
    const empId = empIdByName(name)
    if (empId === null) {
      console.warn(`⚠️  Superadmin ${name} tidak ada di employees — skip`)
      continue
    }
    const username = name.toLowerCase().replace(/\s+/g, '.')
    const passwordHash = await hashPassword(DEFAULT_PASS)
    await db.insert(users).values({ employeeId: empId, username, passwordHash, role: 'superadmin' })
  }

  // ── 5. Snack sessions (default) ──
  console.log('📥 Seed snack_sessions (default)...')
  await db.insert(snackSessions).values({ name: 'Snack Pagi', quota: 0, isActive: true })

  // ── 6. Content statis ──
  console.log('📥 Seed events + meta...')
  await db.insert(events).values(eventsSeed)

  console.log('📥 Seed room_areas...')
  await db.insert(roomAreas).values(roomAreasSeed)

  console.log('📥 Seed key_dates...')
  await db.insert(keyDates).values(keyDatesSeed)

  console.log('📥 Seed landing_highlights...')
  await db.insert(landingHighlights).values(landingHighlightsSeed)

  console.log('📥 Seed rundown_phases + rundown_items...')
  for (let i = 0; i < rundownPhasesSeed.length; i++) {
    const phase = rundownPhasesSeed[i]
    const phaseNum = i + 1
    const [inserted] = await db.insert(rundownPhases).values(phase).returning({ id: rundownPhases.id })
    const items = rundownItemsSeed
      .filter((item) => item.phaseId === phaseNum)
      .map((item, idx) => ({ phaseId: inserted.id, time: item.time, title: item.title, note: item.note, sortOrder: idx + 1 }))
    if (items.length) await db.insert(rundownItems).values(items)
  }

  console.log('📥 Seed competitions + sections...')
  for (let i = 0; i < competitionsSeed.length; i++) {
    const comp = competitionsSeed[i]
    const compNum = i + 1
    const [inserted] = await db.insert(competitions).values(comp).returning({ id: competitions.id })
    const sections = competitionSectionsSeed
      .filter((s) => s.competitionId === compNum)
      .map((s, idx) => ({ competitionId: inserted.id, section: s.section, content: s.content as any, sortOrder: idx + 1 }))
    if (sections.length) await db.insert(competitionSections).values(sections)
  }

  console.log('📥 Seed event_phases...')
  await db.insert(eventPhases).values(phasesSeed)

  console.log('✅ Seed selesai!')
  console.log(`   - ${employeesSeed.length} employees`)
  console.log(`   - ${teamsSeed.length} teams + ${memberCount} team_members${unmatched.length ? ` (⚠️ ${unmatched.length} unmatched)` : ''}`)
  console.log(`   - ${superadminNames.length} users (superadmin, password: admin123)`)
  console.log(`   - 1 snack_sessions (default)`)

  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Seed gagal:', err)
  process.exit(1)
})
