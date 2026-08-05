/**
 * Drizzle ORM schema — HUT RI ke-81 TKI x FTP
 * PostgreSQL (Aiven) — 11 tabel
 *
 * Konvensi:
 * - snake_case naming
 * - serial (identity integer) PK
 * - text (bukan varchar) untuk konten
 * - jsonb untuk data nested (workflow, reminders, sections)
 * - cascade delete untuk relasi parent→child
 */
import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core'

// ─── Events (1 baris — meta event) ───
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  org: text('org').notNull(),
  year: integer('year').notNull(),
  theme: text('theme').notNull(),
  peakDateLabel: text('peak_date_label').notNull(),
  peakTimeLabel: text('peak_time_label').notNull(),
  peakTarget: timestamp('peak_target', { withTimezone: true }).notNull(),
  eventEndTarget: timestamp('event_end_target', { withTimezone: true }).notNull(),
  awardTarget: timestamp('award_target', { withTimezone: true }).notNull(),
  awardEndTarget: timestamp('award_end_target', { withTimezone: true }).notNull(),
  awardDateLabel: text('award_date_label').notNull(),
  awardNote: text('award_note').notNull(),
  tagline: text('tagline').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Room Areas (5 baris — ruangan peserta lomba dekor) ───
export const roomAreas = pgTable('room_areas', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  sortOrder: integer('sort_order').notNull(),
})

// ─── Key Dates (5 baris — tanggal penting) ───
export const keyDates = pgTable('key_dates', {
  id: serial('id').primaryKey(),
  when: text('when').notNull(),
  title: text('title').notNull(),
  detail: text('detail').notNull(),
  sortOrder: integer('sort_order').notNull(),
})

// ─── Rundown Phases (5 baris — fase acara) ───
export const rundownPhases = pgTable('rundown_phases', {
  id: serial('id').primaryKey(),
  slug: text('slug').unique().notNull(),
  phase: text('phase').notNull(),
  highlight: boolean('highlight').default(false).notNull(),
  sortOrder: integer('sort_order').notNull(),
})

// ─── Rundown Items (7 baris — item per fase) ───
export const rundownItems = pgTable('rundown_items', {
  id: serial('id').primaryKey(),
  phaseId: integer('phase_id')
    .references(() => rundownPhases.id, { onDelete: 'cascade' })
    .notNull(),
  time: text('time').notNull(),
  title: text('title').notNull(),
  note: text('note').notNull(),
  sortOrder: integer('sort_order').notNull(),
})

// ─── Competitions (3 baris — meta lomba) ───
export const competitions = pgTable('competitions', {
  id: serial('id').primaryKey(),
  slug: text('slug').unique().notNull(),
  number: text('number').notNull(),
  short: text('short').notNull(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  tone: text('tone').notNull(),
  imageKey: text('image_key').notNull(),
  summary: text('summary').notNull(),
  sortOrder: integer('sort_order').notNull(),
})

// ─── Competition Sections (JSONB per section) ───
export const competitionSections = pgTable('competition_sections', {
  id: serial('id').primaryKey(),
  competitionId: integer('competition_id')
    .references(() => competitions.id, { onDelete: 'cascade' })
    .notNull(),
  section: text('section').notNull(), // 'workflow' | 'forPeserta' | 'forPanitia'
  content: jsonb('content').$type<WorkflowSection | PesertaSection | PanitiaSection>().notNull(),
  sortOrder: integer('sort_order').notNull(),
})

// ─── Teams (13 baris — 8 putra, 5 putri) ───
export const teams = pgTable(
  'teams',
  {
    id: serial('id').primaryKey(),
    kategori: text('kategori').$type<'putra' | 'putri'>().notNull(),
    nomor: integer('nomor').notNull(),
    nama: text('nama').notNull(),
  },
  (t) => [unique('teams_kategori_nomor').on(t.kategori, t.nomor)],
)

// ─── Team Members (73 baris) ───
export const teamMembers = pgTable(
  'team_members',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .references(() => teams.id, { onDelete: 'cascade' })
      .notNull(),
    nama: text('nama').notNull(),
    sortOrder: integer('sort_order').notNull(),
  },
  (t) => [unique('team_members_team_sort').on(t.teamId, t.sortOrder)],
)

// ─── Landing Highlights (4 baris) ───
export const landingHighlights = pgTable('landing_highlights', {
  id: serial('id').primaryKey(),
  label: text('label').notNull(),
  value: text('value').notNull(),
  hint: text('hint').notNull(),
  sortOrder: integer('sort_order').notNull(),
})

// ─── Event Phases (9 baris — data fase eventPhase.js) ───
export const eventPhases = pgTable('event_phases', {
  id: serial('id').primaryKey(),
  phaseKey: text('phase_key').unique().notNull(),
  badgeLabel: text('badge_label').notNull(),
  badgeColor: text('badge_color').notNull(),
  statusType: text('status_type').notNull(), // 'upcoming' | 'active' | 'live' | 'completed'
  title: text('title').notNull(),
  subtitle: text('subtitle').notNull(),
  targetDate: timestamp('target_date', { withTimezone: true }),
  targetLabel: text('target_label').notNull(),
  themeColor: text('theme_color').notNull(),
  reminders: jsonb('reminders').$type<Reminder[]>().notNull(),
  actionLabel: text('action_label').notNull(),
  actionLink: text('action_link').notNull(),
  sortOrder: integer('sort_order').notNull(),
})

// ─── TS Types for JSONB columns ───

export interface WorkflowStep {
  step: number
  title: string
  time: string
  desc: string
  icon: string
}

export interface WorkflowSection {
  headline?: never
  points?: never
  tips?: never
  checklists?: never
  tools?: never
  [key: string]: unknown
}

export interface PesertaSection {
  headline: string
  points: Array<{ title: string; text: string }>
  tips: string[]
}

export interface PanitiaSection {
  headline: string
  points: Array<{ title: string; text: string }>
  tools?: string[]
  putra?: string[]
  putri?: string[]
  checklist?: string[]
}

export interface Reminder {
  icon: string
  title: string
  text: string
}
