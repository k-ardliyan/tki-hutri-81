/**
 * Seed runner — TRUNCATE semua tabel (cascade), lalu insert data.
 * Jalankan: bun run db:seed
 *
 * Idempotent — boleh dijalankan ulang kapan saja.
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
} from '../src/server/db/schema'

import { eventsSeed, keyDatesSeed, roomAreasSeed, landingHighlightsSeed, rundownPhasesSeed, rundownItemsSeed } from './seed-data/events'
import { competitionsSeed, competitionSectionsSeed } from './seed-data/competitions'
import { teamsSeed, teamMembersSeed } from './seed-data/teams'
import { phasesSeed } from './seed-data/phases'

async function main() {
  const db = assertDb()

  console.log('🗑️  TRUNCATE semua tabel (cascade)...')
  // TRUNCATE in reverse dependency order
  await db.delete(teamMembers)
  await db.delete(teams)
  await db.delete(competitionSections)
  await db.delete(competitions)
  await db.delete(rundownItems)
  await db.delete(rundownPhases)
  await db.delete(eventPhases)
  await db.delete(landingHighlights)
  await db.delete(keyDates)
  await db.delete(roomAreas)
  await db.delete(events)

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
    const phaseNum = i + 1 // phaseId in seed data is 1-based
    const [inserted] = await db.insert(rundownPhases).values(phase).returning({ id: rundownPhases.id })
    const items = rundownItemsSeed
      .filter((item) => item.phaseId === phaseNum)
      .map((item, idx) => ({
        phaseId: inserted.id,
        time: item.time,
        title: item.title,
        note: item.note,
        sortOrder: idx + 1,
      }))
    if (items.length) {
      await db.insert(rundownItems).values(items)
    }
  }

  console.log('📥 Seed competitions + sections...')
  for (let i = 0; i < competitionsSeed.length; i++) {
    const comp = competitionsSeed[i]
    const compNum = i + 1 // competitionId in seed data is 1-based
    const [inserted] = await db.insert(competitions).values(comp).returning({ id: competitions.id })
    const sections = competitionSectionsSeed
      .filter((s) => s.competitionId === compNum)
      .map((s, idx) => ({
        competitionId: inserted.id,
        section: s.section,
        content: s.content as any,
        sortOrder: idx + 1,
      }))
    if (sections.length) {
      await db.insert(competitionSections).values(sections)
    }
  }

  console.log('📥 Seed teams + team_members...')
  for (let i = 0; i < teamsSeed.length; i++) {
    const team = teamsSeed[i]
    const teamNum = i + 1 // teamId in seed data is 1-based
    const [inserted] = await db.insert(teams).values(team).returning({ id: teams.id })
    const members = teamMembersSeed
      .filter((m) => m.teamId === teamNum)
      .map((m, idx) => ({
        teamId: inserted.id,
        nama: m.nama,
        sortOrder: idx + 1,
      }))
    if (members.length) {
      await db.insert(teamMembers).values(members)
    }
  }

  console.log('📥 Seed event_phases...')
  await db.insert(eventPhases).values(phasesSeed)

  console.log('✅ Seed selesai!')
  console.log('   - 1 event meta')
  console.log(`   - ${roomAreasSeed.length} room_areas`)
  console.log(`   - ${keyDatesSeed.length} key_dates`)
  console.log(`   - ${landingHighlightsSeed.length} landing_highlights`)
  console.log(`   - ${rundownPhasesSeed.length} rundown_phases + ${rundownItemsSeed.length} items`)
  console.log(`   - ${competitionsSeed.length} competitions + ${competitionSectionsSeed.length} sections`)
  console.log(`   - ${teamsSeed.length} teams + ${teamMembersSeed.length} members`)
  console.log(`   - ${phasesSeed.length} event_phases`)

  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Seed gagal:', err)
  process.exit(1)
})
